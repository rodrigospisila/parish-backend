import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LeadStatus, NotificationType, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../messaging/email.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

/** Mesmo contato (e-mail ou telefone) com lead NEW nesta janela: atualiza em vez de duplicar. */
export const LEAD_DEDUPE_HOURS = 24;
export const LEADS_PAGE_MAX = 200;

/** Id do banco (cuid/cuid2 ou uuid). */
const ID_FORMAT = /^(?:[a-z0-9]{20,40}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export const PUBLIC_LEAD_OK = {
  ok: true,
  message: 'Recebemos o seu contato. Em breve falaremos com você.',
} as const;

const LEAD_SELECT = {
  id: true,
  source: true,
  status: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  parishName: true,
  city: true,
  state: true,
  parishId: true,
  communityId: true,
  message: true,
  notes: true,
  consentAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LeadSelect;

const clean = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim().slice(0, max);
  return text || null;
};

/**
 * Leads comerciais (saas-implantacao-18): pedidos do site/demonstração (aqui),
 * reivindicações (BE-A grava com source CLAIM) e cadastro manual futuro.
 */
@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * POST /public/leads — sem login. Honeypot preenchido devolve o MESMO corpo
   * de sucesso sem gravar (o robô não aprende que foi barrado). O mesmo contato
   * repetido em 24 h atualiza o lead aberto (sem novo aviso ao SYSTEM_ADMIN).
   */
  async createPublic(dto: CreateLeadDto): Promise<typeof PUBLIC_LEAD_OK> {
    if (typeof dto.website === 'string' && dto.website.trim() !== '') {
      this.logger.warn('Lead descartado pelo honeypot');
      return PUBLIC_LEAD_OK;
    }

    const email = clean(dto.email, 160)?.toLowerCase() ?? null;
    const phoneDigits = typeof dto.phone === 'string' ? dto.phone.replace(/\D/g, '') : '';
    if (phoneDigits && (phoneDigits.length < 10 || phoneDigits.length > 13)) {
      throw new BadRequestException('Telefone inválido — informe com DDD');
    }
    const phone = phoneDigits || null;
    if (!email && !phone) {
      throw new BadRequestException('Informe um e-mail ou um telefone para contato');
    }

    const name = clean(dto.name, 120);
    if (!name || name.length < 2) throw new BadRequestException('Informe o seu nome');

    const parishId = await this.existingParishId(dto.parishId);
    const data = {
      name,
      email,
      phone,
      role: clean(dto.role, 80),
      parishName: clean(dto.parishName, 160),
      city: clean(dto.city, 100),
      state: clean(dto.state, 2)?.toUpperCase() ?? null,
      parishId,
      message: typeof dto.message === 'string' ? dto.message.trim().slice(0, 2000) || null : null,
    };

    const since = new Date(Date.now() - LEAD_DEDUPE_HOURS * 3_600_000);
    const contactMatch: Prisma.LeadWhereInput[] = [];
    if (email) contactMatch.push({ email });
    if (phone) contactMatch.push({ phone });
    const existing = await this.prisma.lead.findFirst({
      where: { status: LeadStatus.NEW, createdAt: { gte: since }, OR: contactMatch },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      await this.prisma.lead.update({ where: { id: existing.id }, data: { ...data, consentAt: new Date() } });
      return PUBLIC_LEAD_OK;
    }

    const lead = await this.prisma.lead.create({
      data: { ...data, source: dto.source ?? 'SITE', status: LeadStatus.NEW, consentAt: new Date() },
      select: { id: true, name: true, parishName: true, city: true, state: true },
    });

    // Aviso ao SYSTEM_ADMIN depois da resposta (best-effort, nunca falha o pedido)
    void this.notifyNewLead(lead).catch((error) => this.logger.warn(`Falha ao avisar lead novo: ${error}`));
    return PUBLIC_LEAD_OK;
  }

  /**
   * Notificação in-app (+ push pela cadeia normal) a todos os SYSTEM_ADMIN
   * ativos e e-mail best-effort para a caixa de SUPPORT_EMAIL (se definida e
   * com SMTP configurado). Também usado por outros fluxos que criem Lead.
   */
  async notifyNewLead(lead: { id: string; name: string; parishName?: string | null; city?: string | null; state?: string | null }) {
    const where = [lead.parishName, [lead.city, lead.state].filter(Boolean).join('/')].filter(Boolean).join(' — ');
    const title = 'Novo contato comercial';
    const body = `${lead.name}${where ? ` · ${where}` : ''}`.slice(0, 200);

    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.SYSTEM_ADMIN, isActive: true },
      select: { id: true },
      take: 20,
    });
    if (admins.length) {
      await this.notifications.notifyUsers(
        admins.map((a) => a.id),
        NotificationType.URGENT_NOTICE,
        title,
        body,
        { kind: 'LEAD', leadId: lead.id, url: '/admin/platform/leads' },
      );
    }

    const inbox = String(this.config.get<string>('SUPPORT_EMAIL') ?? '').trim();
    if (inbox && this.email.configured) {
      await this.email.trySend(inbox, `[Parish] ${title}`, `${body}\n\nVeja no painel da Plataforma → Leads.`);
    }
  }

  /** GET /platform/leads?status=&search=&limit=&offset= */
  async list(params: { status?: string; search?: string; limit?: number; offset?: number }) {
    const where: Prisma.LeadWhereInput = {};
    if (params.status) {
      if (!(Object.values(LeadStatus) as string[]).includes(params.status)) {
        throw new BadRequestException('Status inválido');
      }
      where.status = params.status as LeadStatus;
    }
    const search = clean(params.search, 80);
    if (search) {
      const digits = search.replace(/\D/g, '');
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { parishName: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
      ];
    }
    const take = Math.min(Math.max(Math.trunc(Number(params.limit) || 50), 1), LEADS_PAGE_MAX);
    const skip = Math.max(Math.trunc(Number(params.offset) || 0), 0);

    const [items, total, grouped] = await Promise.all([
      this.prisma.lead.findMany({ where, select: LEAD_SELECT, orderBy: { createdAt: 'desc' }, take, skip }),
      this.prisma.lead.count({ where }),
      this.prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    const parishIds = [...new Set(items.map((l) => l.parishId).filter((id): id is string => !!id))];
    const parishes = parishIds.length
      ? await this.prisma.parish.findMany({
          where: { id: { in: parishIds } },
          select: { id: true, name: true, city: true, state: true, managedAt: true },
        })
      : [];
    const byId = new Map(parishes.map((p) => [p.id, p]));

    const counts = Object.fromEntries(Object.values(LeadStatus).map((s) => [s, 0])) as Record<LeadStatus, number>;
    for (const row of grouped) counts[row.status] = row._count._all;

    return {
      items: items.map((l) => {
        const parish = l.parishId ? byId.get(l.parishId) : undefined;
        return {
          ...l,
          parish: parish
            ? { id: parish.id, name: parish.name, city: parish.city, state: parish.state, managed: !!parish.managedAt }
            : null,
        };
      }),
      total,
      counts,
      limit: take,
      offset: skip,
    };
  }

  /** PATCH /platform/leads/:id */
  async update(id: string, dto: UpdateLeadDto) {
    const lead = await this.prisma.lead.findUnique({ where: { id }, select: { id: true } });
    if (!lead) throw new NotFoundException('Contato não encontrado');
    const data: Prisma.LeadUpdateInput = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.notes !== undefined) data.notes = typeof dto.notes === 'string' ? dto.notes.trim().slice(0, 4000) || null : null;
    if (!Object.keys(data).length) throw new BadRequestException('Nada para alterar');
    return this.prisma.lead.update({ where: { id }, data, select: LEAD_SELECT });
  }

  private async existingParishId(value: unknown): Promise<string | null> {
    if (typeof value !== 'string' || !ID_FORMAT.test(value)) return null;
    const parish = await this.prisma.parish.findUnique({ where: { id: value }, select: { id: true } });
    return parish?.id ?? null;
  }
}
