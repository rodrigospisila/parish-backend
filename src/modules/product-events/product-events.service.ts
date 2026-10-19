import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { isProductEventName, PRODUCT_EVENT_PLATFORMS } from './product-event-names';
import { PRODUCT_EVENTS_BATCH_MAX } from './dto/track-events.dto';

export const USAGE_DAYS_DEFAULT = 30;
export const USAGE_DAYS_MAX = 180;
/** Teto do controle em memória de "pessoas distintas" (por instância e por dia). */
export const UNIQUES_MEMORY_MAX = 100_000;

/** cuid/cuid2 ou uuid — o formato dos ids do banco. */
const ID_FORMAT = /^(?:[a-z0-9]{20,40}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
/** Versão curta: 1.2 ou 1.2.3 */
const APP_VERSION = /^\d{1,3}\.\d{1,3}(?:\.\d{1,4})?$/;
const ROLE_FORMAT = /^[A-Z_]{1,40}$/;

export interface ProductEventInput {
  name: string;
  platform: string;
  appVersion?: string | null;
  communityId?: string | null;
}

/**
 * Quem gerou o evento — usado SÓ para contar pessoas distintas no dia, em
 * memória e com hash. Nunca é gravado.
 */
export interface ProductEventActor {
  userId?: string | null;
  role?: string | null;
  ip?: string | null;
}

/** Dia corrente no fuso de São Paulo, como data UTC à meia-noite (coluna @db.Date). */
export function saoPauloDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
}

export const normalizeAppVersion = (value: unknown): string =>
  typeof value === 'string' && APP_VERSION.test(value.trim()) ? value.trim() : '';

export const isIdFormat = (value: unknown): value is string => typeof value === 'string' && ID_FORMAT.test(value);

/**
 * Eventos de uso do produto, agregados por dia (America/Sao_Paulo), nome,
 * plataforma, papel, comunidade e versão do app — SEM id de pessoa
 * (eng-qualidade-17, saas-implantacao-30). `count` soma todo evento;
 * `uniques` soma 1 na primeira vez que a mesma pessoa (usuário logado ou, sem
 * login, o IP) aparece naquela chave no dia — aproximado: o controle é em
 * memória, por instância, como no EnforcementHitsService.
 */
@Injectable()
export class ProductEventsService {
  private readonly logger = new Logger(ProductEventsService.name);
  private seenDay = '';
  private seen = new Set<string>();

  constructor(private readonly prisma: PrismaService) {}

  /** Hoje (São Paulo) — isolado para os testes. */
  protected today(): string {
    return saoPauloDay();
  }

  static clampDays(days?: number): number {
    const d = Number.isFinite(days as number) ? Math.trunc(days as number) : USAGE_DAYS_DEFAULT;
    return Math.min(Math.max(d, 1), USAGE_DAYS_MAX);
  }

  /**
   * POST /product-events. Ignora (sem erro) nomes fora da lista branca e
   * plataformas desconhecidas; versão fora do formato e comunidade
   * inexistente viram "" (o evento conta, sem o recorte).
   */
  async track(events: ProductEventInput[], actor: ProductEventActor = {}): Promise<{ accepted: number; ignored: number }> {
    const list = Array.isArray(events) ? events.slice(0, PRODUCT_EVENTS_BATCH_MAX) : [];
    const valid = list.filter(
      (e) => e && isProductEventName(e.name) && (PRODUCT_EVENT_PLATFORMS as readonly string[]).includes(e.platform),
    );
    const ignored = (Array.isArray(events) ? events.length : 0) - valid.length;
    if (!valid.length) return { accepted: 0, ignored };

    // Comunidade: só id no formato do banco E existente (evita inchar a tabela com ids inventados)
    const candidateIds = [...new Set(valid.map((e) => e.communityId).filter(isIdFormat))];
    let known = new Set<string>();
    if (candidateIds.length) {
      try {
        const rows = await this.prisma.community.findMany({ where: { id: { in: candidateIds } }, select: { id: true } });
        known = new Set(rows.map((r) => r.id));
      } catch (error) {
        this.logger.warn(`Falha ao validar comunidades dos eventos: ${error}`);
      }
    }

    const role = typeof actor.role === 'string' && ROLE_FORMAT.test(actor.role) ? actor.role : '';
    const who = actor.userId ? `u:${actor.userId}` : actor.ip ? `ip:${actor.ip}` : '';
    const actorKey = who ? createHash('sha256').update(who).digest('hex').slice(0, 16) : '';

    // Agrega o lote por chave antes de gravar (um upsert por chave)
    const groups = new Map<string, { name: string; platform: string; communityId: string; appVersion: string; count: number }>();
    for (const e of valid) {
      const communityId = isIdFormat(e.communityId) && known.has(e.communityId) ? e.communityId : '';
      const appVersion = normalizeAppVersion(e.appVersion);
      const key = `${e.name}|${e.platform}|${communityId}|${appVersion}`;
      const group = groups.get(key);
      if (group) group.count += 1;
      else groups.set(key, { name: e.name, platform: e.platform, communityId, appVersion, count: 1 });
    }

    const day = this.today();
    const dayDate = new Date(`${day}T00:00:00.000Z`);
    await Promise.all(
      [...groups.entries()].map(async ([key, g]) => {
        const uniques = this.firstSighting(day, `${key}|${role}`, actorKey) ? 1 : 0;
        try {
          await this.prisma.productEvent.upsert({
            where: {
              day_name_platform_role_communityId_appVersion: {
                day: dayDate,
                name: g.name,
                platform: g.platform,
                role,
                communityId: g.communityId,
                appVersion: g.appVersion,
              },
            },
            create: {
              day: dayDate,
              name: g.name,
              platform: g.platform,
              role,
              communityId: g.communityId,
              appVersion: g.appVersion,
              count: g.count,
              uniques,
            },
            update: { count: { increment: g.count }, ...(uniques ? { uniques: { increment: uniques } } : {}) },
          });
        } catch (error) {
          this.logger.warn(`Falha ao gravar evento de uso ${g.name}: ${error}`);
        }
      }),
    );
    return { accepted: valid.length, ignored };
  }

  /**
   * Registro feito pelo PRÓPRIO backend (ex.: convite aceito, importação
   * concluída). Nunca lança nem atrasa o fluxo que chamou.
   */
  record(name: string, platform: 'web' | 'app', actor: ProductEventActor = {}, communityId?: string | null): void {
    void this.track([{ name, platform, communityId: communityId ?? null }], actor).catch((error) =>
      this.logger.warn(`Falha ao registrar evento ${name}: ${error}`),
    );
  }

  /** true na primeira vez que a pessoa aparece nesta chave hoje (memória por instância). */
  private firstSighting(day: string, key: string, actorKey: string): boolean {
    if (!actorKey) return false;
    if (day !== this.seenDay) {
      this.seenDay = day;
      this.seen = new Set();
    }
    const id = `${key}|${actorKey}`;
    if (this.seen.has(id)) return false;
    if (this.seen.size >= UNIQUES_MEMORY_MAX) return false;
    this.seen.add(id);
    return true;
  }

  /** Início da janela de `days` dias contando hoje (São Paulo). */
  protected since(days: number): Date {
    const since = new Date(`${this.today()}T00:00:00.000Z`);
    since.setUTCDate(since.getUTCDate() - (days - 1));
    return since;
  }

  /** Total por nome nos últimos `days` dias (overview). */
  async totalsByName(days: number) {
    const rows = await this.prisma.productEvent.groupBy({
      by: ['name'],
      where: { day: { gte: this.since(ProductEventsService.clampDays(days)) } },
      _sum: { count: true, uniques: true },
    });
    return rows
      .map((r) => ({ name: r.name, count: r._sum.count ?? 0, uniques: r._sum.uniques ?? 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  /** GET /platform/usage?days=30 */
  async usage(daysParam?: number) {
    const days = ProductEventsService.clampDays(daysParam);
    const since = this.since(days);
    const where = { day: { gte: since } };

    const [totals, daily, byPlatform, byRole, byAppVersion, byCommunity] = await Promise.all([
      this.totalsByName(days),
      this.prisma.productEvent.groupBy({ by: ['day', 'name'], where, _sum: { count: true, uniques: true } }),
      this.prisma.productEvent.groupBy({ by: ['platform'], where, _sum: { count: true } }),
      this.prisma.productEvent.groupBy({ by: ['role'], where, _sum: { count: true } }),
      this.prisma.productEvent.groupBy({
        by: ['appVersion'],
        where: { ...where, platform: 'app', name: 'app_open' },
        _sum: { count: true, uniques: true },
      }),
      this.prisma.productEvent.groupBy({
        by: ['communityId'],
        where: { ...where, communityId: { not: '' } },
        _sum: { count: true },
        orderBy: { _sum: { count: 'desc' } },
        take: 20,
      }),
    ]);

    const communityIds = byCommunity.map((c) => c.communityId);
    const communities = communityIds.length
      ? await this.prisma.community.findMany({
          where: { id: { in: communityIds } },
          select: { id: true, name: true, parish: { select: { name: true } } },
        })
      : [];
    const names = new Map(communities.map((c) => [c.id, c]));

    const sortByCount = <T extends { count: number }>(rows: T[]) => rows.sort((a, b) => b.count - a.count);
    return {
      days,
      since: since.toISOString().slice(0, 10),
      totals,
      daily: daily
        .map((d) => ({
          day: d.day.toISOString().slice(0, 10),
          name: d.name,
          count: d._sum.count ?? 0,
          uniques: d._sum.uniques ?? 0,
        }))
        .sort((a, b) => a.day.localeCompare(b.day) || a.name.localeCompare(b.name)),
      byPlatform: sortByCount(byPlatform.map((p) => ({ platform: p.platform, count: p._sum.count ?? 0 }))),
      // Papel vazio = sem login
      byRole: sortByCount(byRole.map((r) => ({ role: r.role || null, count: r._sum.count ?? 0 }))),
      // Versões do app em uso (aberturas); vazio = versão não informada
      appVersions: sortByCount(
        byAppVersion.map((v) => ({ appVersion: v.appVersion || null, count: v._sum.count ?? 0, uniques: v._sum.uniques ?? 0 })),
      ),
      topCommunities: byCommunity.map((c) => ({
        communityId: c.communityId,
        name: names.get(c.communityId)?.name ?? null,
        parishName: names.get(c.communityId)?.parish?.name ?? null,
        count: c._sum?.count ?? 0,
      })),
    };
  }
}
