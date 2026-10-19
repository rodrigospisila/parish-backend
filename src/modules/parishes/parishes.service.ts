import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../common/audit.service';
import { CurrentUser } from '../../common/hierarchy.service';
import { CreateParishDto } from './dto/create-parish.dto';
import { UpdateParishDto } from './dto/update-parish.dto';
import { ListPage, ListPaging, foldedColumn, inIdOrder, likePattern } from '../communities/list-paging';
import { isValidCnpj, onlyDigits } from '../members/br-documents';

/** Segredos do provedor de pagamento nunca saem pela API de paróquias (só o módulo do dízimo os usa). */
const PARISH_SECRETS = { providerApiKeyEnc: true, providerWebhookToken: true } as const;

/** Campos editáveis pelo cadastro de paróquia — o resto nunca chega ao Prisma. */
const EDITABLE_FIELDS = [
  'name', 'address', 'city', 'state', 'zipCode', 'phone', 'email', 'website', 'logoUrl', 'priestName',
  'latitude', 'longitude', 'dioceseId', 'status', 'cnpj',
] as const;

function pickEditable(dto: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) {
    if (dto[key] !== undefined) data[key] = dto[key];
  }
  if (data.cnpj !== undefined) data.cnpj = normalizeCnpj(data.cnpj);
  return data;
}

/**
 * CNPJ da paróquia (cat-gestao-31): grava só os 14 dígitos; vazio/null limpa;
 * dígito verificador errado → 400.
 */
export function normalizeCnpj(value: unknown): string | null {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  if (!isValidCnpj(value)) throw new BadRequestException('CNPJ inválido — confira os 14 dígitos');
  return onlyDigits(value);
}

@Injectable()
export class ParishesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private actor(user: CurrentUser) {
    return { id: user.id, email: user.email, role: user.role };
  }

  /**
   * Criar paróquia: SYSTEM_ADMIN em qualquer diocese; DIOCESAN_ADMIN só na
   * PRÓPRIA diocese. Negar por padrão: qualquer outro papel, ou administrador
   * diocesano sem diocese no cadastro, recebe 403.
   */
  async create(createParishDto: CreateParishDto, user: CurrentUser) {
    const allowed =
      !!user?.id &&
      (user.role === UserRole.SYSTEM_ADMIN ||
        (user.role === UserRole.DIOCESAN_ADMIN && !!user.dioceseId && createParishDto.dioceseId === user.dioceseId));
    if (!allowed) {
      throw new ForbiddenException('Você só pode criar paróquias na sua diocese');
    }

    const diocese = await this.prisma.diocese.findUnique({ where: { id: createParishDto.dioceseId }, select: { id: true } });
    if (!diocese) throw new NotFoundException('Diocese não encontrada');

    const created = await this.prisma.parish.create({
      data: pickEditable(createParishDto as any) as any,
      omit: PARISH_SECRETS,
      include: {
        diocese: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await this.auditService.log({
      actor: this.actor(user),
      action: 'CREATE',
      entity: 'Parish',
      entityId: created.id,
      metadata: { dioceseId: created.dioceseId, name: created.name },
    });

    return created;
  }

  /**
   * Lista de GESTÃO (painel: Paróquias, Usuários, Comunidades, Finanças...).
   * Negar por padrão: só a plataforma vê o país inteiro; a diocese vê as suas;
   * os demais papéis só a própria paróquia — sem escopo no cadastro, lista vazia.
   * Antes, qualquer fiel logado recebia as 12.843 paróquias COM as comunidades
   * (16 MB). A lista de comunidades por paróquia saiu (o painel usa o _count);
   * quem precisa escolher paróquia usa a cascata `?dioceseId=` (listByDiocese).
   */
  async findAll(user?: CurrentUser) {
    const where = this.listScope(user);
    if (!where) return [];

    return this.prisma.parish.findMany({
      where,
      omit: PARISH_SECRETS,
      include: {
        diocese: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            communities: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Lista de gestão PAGINADA (`?page=`; contrato 4): mesmo escopo do findAll,
   * busca sem acento por nome/cidade e `?dioceseId=` opcional como filtro
   * adicional (nunca amplia o escopo). `_count` só para os itens da página.
   */
  async findPage(
    user: CurrentUser | undefined,
    paging: ListPaging,
    filters: { dioceseId?: string } = {},
  ): Promise<ListPage<any>> {
    const empty = { items: [], total: 0, page: paging.page, pageSize: paging.pageSize };
    const scope = this.listScope(user);
    if (!scope) return empty;

    const conditions: Prisma.Sql[] = [Prisma.sql`TRUE`];
    if (scope.id) conditions.push(Prisma.sql`p.id = ${scope.id}`);
    if (scope.dioceseId) conditions.push(Prisma.sql`p."dioceseId" = ${scope.dioceseId}`);
    if (filters.dioceseId) conditions.push(Prisma.sql`p."dioceseId" = ${filters.dioceseId}`);
    if (paging.search) {
      const like = likePattern(paging.search);
      conditions.push(
        Prisma.sql`(${foldedColumn(Prisma.sql`p.name`)} LIKE ${like} OR ${foldedColumn(Prisma.sql`p.city`)} LIKE ${like})`,
      );
    }
    const where = Prisma.join(conditions, ' AND ');

    const [countRows, idRows] = await Promise.all([
      this.prisma.$queryRaw<{ total: number }[]>(Prisma.sql`SELECT COUNT(*)::int AS total FROM parishes p WHERE ${where}`),
      this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT p.id FROM parishes p
        WHERE ${where}
        ORDER BY p.name ASC, p.id ASC
        LIMIT ${paging.pageSize} OFFSET ${paging.skip}
      `),
    ]);
    const ids = idRows.map((row) => row.id);
    const rows = ids.length
      ? await this.prisma.parish.findMany({
          where: { id: { in: ids } },
          omit: PARISH_SECRETS,
          include: {
            diocese: { select: { id: true, name: true } },
            _count: { select: { communities: true } },
          },
        })
      : [];
    return {
      items: inIdOrder(ids, rows),
      total: Number(countRows[0]?.total ?? 0),
      page: paging.page,
      pageSize: paging.pageSize,
    };
  }

  /** Filtro da lista de gestão por papel; `null` = sem escopo (nada a listar). */
  private listScope(user?: CurrentUser): Record<string, string> | null {
    if (!user?.id) return null;
    if (user.role === UserRole.SYSTEM_ADMIN) return {};
    if (user.role === UserRole.DIOCESAN_ADMIN) return user.dioceseId ? { dioceseId: user.dioceseId } : null;
    return user.parishId ? { id: user.parishId } : null;
  }

  /**
   * Cascata pública (app/painel, qualquer usuário logado): paróquias ATIVAS de
   * UMA diocese, só o necessário para escolher — id, nome, cidade/UF.
   */
  async listByDiocese(dioceseId: string) {
    return this.prisma.parish.findMany({
      where: { dioceseId, status: 'ACTIVE' },
      select: { id: true, name: true, city: true, state: true, dioceseId: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Ficha da paróquia para QUALQUER usuário logado (o app mostra o contato no
   * perfil do fiel): só dados públicos — sem configuração do dízimo/provedor e
   * só as comunidades não arquivadas.
   */
  async findOne(id: string) {
    const parish = await this.prisma.parish.findUnique({
      where: { id },
      select: {
        id: true, name: true, address: true, city: true, state: true, zipCode: true, phone: true, email: true,
        website: true, logoUrl: true, priestName: true, latitude: true, longitude: true, foundedAt: true, status: true,
        dioceseId: true, titheEnabled: true, cnpj: true, createdAt: true, updatedAt: true,
        diocese: { select: { id: true, name: true, city: true, state: true, website: true, logoUrl: true, bishopName: true } },
        communities: {
          where: { deletedAt: null },
          select: {
            id: true, name: true, address: true, city: true, state: true, zipCode: true, phone: true, email: true,
            website: true, logoUrl: true, coordinatorName: true, latitude: true, longitude: true, status: true, parishId: true,
          },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            communities: true,
          },
        },
      },
    });

    if (!parish) {
      throw new NotFoundException(`Paróquia com ID ${id} não encontrada`);
    }

    return parish;
  }

  /**
   * Editar paróquia (negar por padrão):
   * - SYSTEM_ADMIN: qualquer paróquia, inclusive trocar a diocese;
   * - DIOCESAN_ADMIN: só paróquias da própria diocese, sem tirá-las de lá;
   * - PARISH_ADMIN: só os dados da própria paróquia — nunca a diocese nem o status;
   * - demais papéis (ou admin sem diocese/paróquia no cadastro): 403.
   */
  async update(id: string, updateParishDto: UpdateParishDto, user: CurrentUser) {
    if (!user?.id) throw new ForbiddenException('Você não tem permissão para editar esta paróquia');

    const parish = await this.prisma.parish.findUnique({
      where: { id },
      select: { id: true, dioceseId: true, status: true, cnpj: true },
    });
    if (!parish) {
      throw new NotFoundException(`Paróquia com ID ${id} não encontrada`);
    }

    const isSystem = user.role === UserRole.SYSTEM_ADMIN;
    const inScope =
      isSystem ||
      (user.role === UserRole.DIOCESAN_ADMIN && !!user.dioceseId && parish.dioceseId === user.dioceseId) ||
      (user.role === UserRole.PARISH_ADMIN && !!user.parishId && parish.id === user.parishId);
    if (!inScope) {
      throw new ForbiddenException('Você não tem permissão para editar esta paróquia');
    }

    const data = pickEditable(updateParishDto as any);

    // Diocese igual à atual é só o formulário reenviando o valor: não é mudança
    if (data.dioceseId !== undefined && data.dioceseId === parish.dioceseId) delete data.dioceseId;
    if (data.dioceseId !== undefined) {
      if (!isSystem) {
        throw new ForbiddenException('Mudar a paróquia de diocese é só da administração da plataforma');
      }
      const destino = await this.prisma.diocese.findUnique({ where: { id: String(data.dioceseId) }, select: { id: true } });
      if (!destino) throw new NotFoundException('Diocese de destino não encontrada');
    }

    // Ativar/inativar a paróquia (some do mapa e das listas) é da diocese para cima
    if (data.status !== undefined && data.status === parish.status) delete data.status;
    if (data.status !== undefined && user.role === UserRole.PARISH_ADMIN) {
      throw new ForbiddenException('Ativar ou inativar a paróquia é da administração diocesana');
    }

    const updated = await this.prisma.parish.update({
      where: { id },
      data: data as any,
      omit: PARISH_SECRETS,
      include: {
        diocese: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const cnpjChanged = data.cnpj !== undefined && data.cnpj !== parish.cnpj;
    if (data.dioceseId !== undefined || data.status !== undefined || cnpjChanged) {
      await this.auditService.log({
        actor: this.actor(user),
        action: 'UPDATE',
        entity: 'Parish',
        entityId: id,
        before: { dioceseId: parish.dioceseId, status: parish.status, ...(cnpjChanged ? { cnpj: parish.cnpj } : {}) },
        after: { dioceseId: updated.dioceseId, status: updated.status, ...(cnpjChanged ? { cnpj: updated.cnpj } : {}) },
      });
    }

    return updated;
  }

  /**
   * Excluir paróquia: só SYSTEM_ADMIN. A exclusão é FÍSICA e em cascata
   * (comunidades, membros, catequese, dízimo...) e Parish não tem deletedAt —
   * por isso nenhum administrador diocesano ou paroquial a dispara.
   */
  async remove(id: string, user: CurrentUser) {
    if (user?.role !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException(
        'Excluir paróquia é só da administração da plataforma (a exclusão apaga comunidades, membros e histórico)',
      );
    }

    const parish = await this.prisma.parish.findUnique({ where: { id }, select: { id: true, name: true, dioceseId: true } });
    if (!parish) {
      throw new NotFoundException(`Paróquia com ID ${id} não encontrada`);
    }

    const removed = await this.prisma.parish.delete({
      where: { id },
      omit: PARISH_SECRETS,
    });

    await this.auditService.log({
      actor: this.actor(user),
      action: 'DELETE',
      entity: 'Parish',
      entityId: id,
      before: { name: parish.name, dioceseId: parish.dioceseId },
    });

    return removed;
  }
}
