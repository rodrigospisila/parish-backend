import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataProposal, DataProposalKind, DataProposalStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../common/audit.service';
import { parseBbox } from '../masses/map-search.utils';
import {
  ADDRESS_MAX,
  NAME_MAX,
  ScheduleFields,
  asPayloadObject,
  assertAllowedFields,
  currentMatches,
  needsEdit,
  parseSchedulePatch,
  parseState,
  parseWebsite,
  requiredText,
  resolveSchedule,
  sameValue,
} from './data-proposal-payload';
import { BULK_MAX, BulkAction } from './dto/bulk-data-proposals.dto';

type Tx = Prisma.TransactionClient;

export interface ProposalActor {
  id?: string | null;
  email?: string | null;
  role?: string | null;
}

export interface ListQuery {
  status?: string;
  kind?: string;
  batch?: string;
  state?: string;
  city?: string;
  communityId?: string;
  page?: string | number;
  pageSize?: string | number;
}

export interface MapQuery {
  bbox?: string;
  status?: string;
  kind?: string;
  batch?: string;
}

export interface MapPoint {
  communityId: string;
  name: string;
  latitude: number;
  longitude: number;
  count: number;
  kinds: string[];
}

/** Resultado da aplicação de uma proposta (dentro da transação). */
interface ApplyOutcome {
  applied: boolean;
  message: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  /** Vínculo que passa a valer na proposta (horário/comunidade criado ou o igual já existente). */
  link?: { communityId?: string; massScheduleId?: string };
  /** Retrato do que foi apagado, guardado em `current` quando a carga não trouxe. */
  snapshot?: Record<string, unknown>;
}

const KINDS = Object.values(DataProposalKind);
const STATUSES = Object.values(DataProposalStatus);

const PAGE_SIZE_DEFAULT = 50;
const PAGE_SIZE_MAX = 200;
const MAP_LIMIT = 2000;

export const MSG_CHANGED = 'O dado mudou desde a proposta — confira de novo';
export const MSG_NEEDS_SCHEDULE = 'Informe o horário certo';
export const MSG_NEEDS_RECURRENCE = 'Informe a regra de recorrência certa';
export const MSG_BULK_NEEDS_EDIT = 'Precisa de edição — aprove esta individualmente informando o dado certo';

const SCHEDULE_SELECT = {
  id: true,
  type: true,
  dayOfWeek: true,
  time: true,
  recurrence: true,
  weeksOfMonth: true,
  dayOfMonth: true,
  notes: true,
} satisfies Prisma.MassScheduleSelect;

/** O que a fila mostra junto de cada proposta (o painel desenha o antes/depois com isto). */
const PROPOSAL_INCLUDE = {
  community: {
    select: {
      id: true,
      name: true,
      address: true,
      latitude: true,
      longitude: true,
      parish: { select: { id: true, name: true } },
    },
  },
  parish: { select: { id: true, name: true, website: true } },
  schedule: { select: SCHEDULE_SELECT },
} satisfies Prisma.DataProposalInclude;

const TYPE_LABEL: Record<string, string> = {
  MASS: 'Missa',
  CONFESSION: 'Confissão',
  ADORATION: 'Adoração',
  ROSARY: 'Terço',
};

const SCHEDULE_KEYS: (keyof ScheduleFields)[] = [
  'type',
  'dayOfWeek',
  'time',
  'recurrence',
  'weeksOfMonth',
  'dayOfMonth',
  'notes',
];

const sameSchedule = (a: ScheduleFields, b: ScheduleFields) => SCHEDULE_KEYS.every((k) => sameValue(a[k], b[k]));
const toInt = (v: unknown) => Math.trunc(Number(v));

/**
 * Fila de propostas de dados levantadas em fonte oficial (horários, endereço,
 * paróquia, site, comunidade que falta). Regra de ouro: NADA aqui é aplicado
 * sozinho — o SYSTEM_ADMIN vê a evidência no mapa do painel e aprova (podendo
 * corrigir o payload) ou rejeita.
 *
 * Aprovar é transacional: marca a proposta (CAS em PENDING — duas abas não
 * aprovam duas vezes), confere se o dado de hoje ainda é o `current` gravado
 * na carga, aplica e registra quem revisou. Qualquer erro desfaz tudo.
 */
@Injectable()
export class DataProposalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // Leitura
  // ---------------------------------------------------------------------------

  /** Status do filtro: ausente = PENDING (a fila); "ALL" = todos. */
  private parseStatus(raw?: string): DataProposalStatus | undefined {
    const s = raw?.trim().toUpperCase();
    if (!s) return DataProposalStatus.PENDING;
    if (s === 'ALL') return undefined;
    if (!STATUSES.includes(s as DataProposalStatus)) throw new BadRequestException('Status inválido');
    return s as DataProposalStatus;
  }

  private parseKind(raw?: string): DataProposalKind | undefined {
    const k = raw?.trim().toUpperCase();
    if (!k) return undefined;
    if (!KINDS.includes(k as DataProposalKind)) throw new BadRequestException('Tipo de proposta inválido');
    return k as DataProposalKind;
  }

  async list(query: ListQuery) {
    const where: Prisma.DataProposalWhereInput = {};
    const status = this.parseStatus(query.status);
    const kind = this.parseKind(query.kind);
    if (status) where.status = status;
    if (kind) where.kind = kind;
    if (query.batch?.trim()) where.batch = query.batch.trim();
    if (query.state?.trim()) where.state = query.state.trim().toUpperCase();
    if (query.city?.trim()) where.city = { equals: query.city.trim(), mode: 'insensitive' };
    if (query.communityId?.trim()) where.communityId = query.communityId.trim();

    const page = Math.max(toInt(query.page) || 1, 1);
    const pageSize = Math.min(Math.max(toInt(query.pageSize) || PAGE_SIZE_DEFAULT, 1), PAGE_SIZE_MAX);

    const [total, items] = await Promise.all([
      this.prisma.dataProposal.count({ where }),
      this.prisma.dataProposal.findMany({
        where,
        include: PROPOSAL_INCLUDE,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { total, page, pageSize, items };
  }

  /** Contagens para o cabeçalho da fila: por status, pendentes por tipo, e por lote. */
  async summary() {
    const [byStatusRows, byKindRows, byBatchRows] = await Promise.all([
      this.prisma.dataProposal.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.dataProposal.groupBy({
        by: ['kind'],
        where: { status: DataProposalStatus.PENDING },
        _count: { _all: true },
      }),
      this.prisma.dataProposal.groupBy({ by: ['batch', 'status'], _count: { _all: true } }),
    ]);

    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<DataProposalStatus, number>;
    for (const r of byStatusRows) byStatus[r.status] = r._count._all;

    const byKind: Partial<Record<DataProposalKind, number>> = {};
    for (const r of byKindRows) byKind[r.kind] = r._count._all;

    const batches = new Map<string, { batch: string; pending: number; approved: number; rejected: number }>();
    for (const r of byBatchRows) {
      const b = batches.get(r.batch) ?? { batch: r.batch, pending: 0, approved: 0, rejected: 0 };
      if (r.status === DataProposalStatus.PENDING) b.pending += r._count._all;
      if (r.status === DataProposalStatus.APPROVED) b.approved += r._count._all;
      if (r.status === DataProposalStatus.REJECTED) b.rejected += r._count._all;
      batches.set(r.batch, b);
    }
    const byBatch = [...batches.values()].sort((a, b) => a.batch.localeCompare(b.batch));

    return { byStatus, byKind, byBatch };
  }

  /**
   * Pinos do mapa: uma entrada por comunidade com coordenada dentro do bbox,
   * com quantas propostas tem e de que tipos. Propostas só de paróquia
   * (PARISH_WEBSITE, COMMUNITY_CREATE) não têm onde ser desenhadas — ficam na lista.
   */
  async map(query: MapQuery): Promise<{ points: MapPoint[]; truncated: boolean }> {
    const status = this.parseStatus(query.status);
    const kind = this.parseKind(query.kind);
    const conds: Prisma.Sql[] = [
      Prisma.sql`c."deletedAt" IS NULL`,
      Prisma.sql`c.latitude IS NOT NULL`,
      Prisma.sql`c.longitude IS NOT NULL`,
    ];
    if (status) conds.push(Prisma.sql`dp.status = ${status}::"DataProposalStatus"`);
    if (kind) conds.push(Prisma.sql`dp.kind = ${kind}::"DataProposalKind"`);
    if (query.batch?.trim()) conds.push(Prisma.sql`dp.batch = ${query.batch.trim()}`);
    if (query.bbox?.trim()) {
      const [minLng, minLat, maxLng, maxLat] = parseBbox(query.bbox);
      conds.push(
        Prisma.sql`c.longitude BETWEEN ${minLng}::float8 AND ${maxLng}::float8 AND c.latitude BETWEEN ${minLat}::float8 AND ${maxLat}::float8`,
      );
    }

    const rows = await this.prisma.$queryRaw<MapPoint[]>`
      SELECT c.id AS "communityId", c.name, c.latitude, c.longitude,
             count(dp.id)::int AS count,
             array_agg(DISTINCT dp.kind::text ORDER BY dp.kind::text) AS kinds
      FROM data_proposals dp
      JOIN communities c ON c.id = dp."communityId"
      WHERE ${Prisma.join(conds, ' AND ')}
      GROUP BY c.id, c.name, c.latitude, c.longitude
      ORDER BY count(dp.id) DESC, c.id
      LIMIT ${MAP_LIMIT + 1}`;

    return { points: rows.slice(0, MAP_LIMIT), truncated: rows.length > MAP_LIMIT };
  }

  // ---------------------------------------------------------------------------
  // Revisão
  // ---------------------------------------------------------------------------

  private statusConflict(status: DataProposalStatus) {
    return new ConflictException(
      status === DataProposalStatus.APPROVED ? 'Esta proposta já foi aprovada' : 'Esta proposta já foi rejeitada',
    );
  }

  /**
   * Aprova (e aplica) uma proposta. `payload` do corpo substitui o proposto.
   * Em lote (`bulk`), edição não existe e o que precisa de edição é recusado.
   */
  async approve(
    id: string,
    body: { note?: string; payload?: Record<string, unknown> },
    actor: ProposalActor | null,
    opts: { bulk?: boolean } = {},
  ) {
    const edited = body.payload != null;
    const note = body.note?.trim() || null;

    const { outcome, proposal, original } = await this.prisma.$transaction(async (tx) => {
      const p = await tx.dataProposal.findUnique({ where: { id } });
      if (!p) throw new NotFoundException('Proposta não encontrada');
      if (p.status !== DataProposalStatus.PENDING) throw this.statusConflict(p.status);
      if (opts.bulk && needsEdit(p.kind, p.payload)) throw new BadRequestException(MSG_BULK_NEEDS_EDIT);

      // Trava a proposta antes de aplicar: uma segunda aprovação simultânea espera
      // esta transação e depois não acha mais PENDING.
      const claimed = await tx.dataProposal.updateMany({
        where: { id, status: DataProposalStatus.PENDING },
        data: {
          status: DataProposalStatus.APPROVED,
          reviewedAt: new Date(),
          reviewedById: actor?.id ?? null,
          reviewNote: note,
        },
      });
      if (claimed.count === 0) throw new ConflictException('Esta proposta acabou de ser revisada por outra pessoa');

      const payload = edited ? body.payload : p.payload;
      const out = await this.apply(tx, p, payload);

      const extra: Prisma.DataProposalUpdateInput = {};
      if (edited) extra.payload = body.payload as Prisma.InputJsonValue;
      if (out.link?.massScheduleId && out.link.massScheduleId !== p.massScheduleId) {
        extra.schedule = { connect: { id: out.link.massScheduleId } };
      }
      if (out.link?.communityId && out.link.communityId !== p.communityId) {
        extra.community = { connect: { id: out.link.communityId } };
      }
      if (out.snapshot && p.current == null) extra.current = out.snapshot as Prisma.InputJsonValue;
      if (Object.keys(extra).length) await tx.dataProposal.update({ where: { id }, data: extra });

      const saved = await tx.dataProposal.findUnique({ where: { id }, include: PROPOSAL_INCLUDE });
      return { outcome: out, proposal: saved, original: p };
    });

    await this.audit.log({
      actor: this.auditActor(actor),
      action: 'DATA_PROPOSAL_APPROVED',
      entity: 'DataProposal',
      entityId: id,
      before: outcome.before ?? null,
      after: outcome.after ?? null,
      metadata: {
        kind: original.kind,
        batch: original.batch,
        applied: outcome.applied,
        message: outcome.message,
        edited,
        ...(edited ? { proposedPayload: original.payload, approvedPayload: body.payload } : {}),
        communityId: proposal?.communityId ?? original.communityId,
        parishId: original.parishId,
        massScheduleId: proposal?.massScheduleId ?? original.massScheduleId,
        note,
      },
    });

    return { proposal, applied: outcome.applied, message: outcome.message };
  }

  async reject(id: string, body: { note?: string }, actor: ProposalActor | null) {
    const note = body.note?.trim() || null;
    const res = await this.prisma.dataProposal.updateMany({
      where: { id, status: DataProposalStatus.PENDING },
      data: {
        status: DataProposalStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedById: actor?.id ?? null,
        reviewNote: note,
      },
    });
    if (res.count === 0) {
      const p = await this.prisma.dataProposal.findUnique({ where: { id }, select: { status: true } });
      if (!p) throw new NotFoundException('Proposta não encontrada');
      throw this.statusConflict(p.status);
    }
    const proposal = await this.prisma.dataProposal.findUnique({ where: { id }, include: PROPOSAL_INCLUDE });

    await this.audit.log({
      actor: this.auditActor(actor),
      action: 'DATA_PROPOSAL_REJECTED',
      entity: 'DataProposal',
      entityId: id,
      metadata: {
        kind: proposal?.kind,
        batch: proposal?.batch,
        communityId: proposal?.communityId,
        parishId: proposal?.parishId,
        massScheduleId: proposal?.massScheduleId,
        note,
      },
    });

    return { proposal, message: 'Proposta rejeitada' };
  }

  /** Uma a uma, cada uma na sua transação: a falha de uma não desfaz as outras. */
  async bulk(ids: string[], action: BulkAction, note: string | undefined, actor: ProposalActor | null) {
    const unique = [...new Set(ids)].slice(0, BULK_MAX);
    const results: { id: string; ok: boolean; message: string }[] = [];
    for (const id of unique) {
      try {
        const r =
          action === 'approve'
            ? await this.approve(id, { note }, actor, { bulk: true })
            : await this.reject(id, { note }, actor);
        results.push({ id, ok: true, message: r.message });
      } catch (err) {
        results.push({ id, ok: false, message: this.errorMessage(err) });
      }
    }
    return { results };
  }

  private errorMessage(err: unknown): string {
    if (err instanceof HttpException) {
      const res = err.getResponse() as any;
      const msg = typeof res === 'string' ? res : res?.message;
      return Array.isArray(msg) ? msg.join('; ') : String(msg ?? err.message);
    }
    return 'Erro inesperado ao aplicar a proposta';
  }

  private auditActor(actor: ProposalActor | null) {
    return actor ? { id: actor.id ?? undefined, email: actor.email ?? undefined, role: actor.role ?? undefined } : null;
  }

  // ---------------------------------------------------------------------------
  // Aplicação por tipo (dentro da transação)
  // ---------------------------------------------------------------------------

  private async apply(tx: Tx, p: DataProposal, payload: unknown): Promise<ApplyOutcome> {
    switch (p.kind) {
      case DataProposalKind.SCHEDULE_CREATE:
        return this.applyScheduleCreate(tx, p, payload);
      case DataProposalKind.SCHEDULE_UPDATE:
      case DataProposalKind.SCHEDULE_RECURRENCE:
      case DataProposalKind.SCHEDULE_DELETE:
        return this.applyScheduleChange(tx, p, payload);
      case DataProposalKind.COMMUNITY_ADDRESS:
      case DataProposalKind.COMMUNITY_PARISH:
      case DataProposalKind.COMMUNITY_WEBSITE:
        return this.applyCommunityChange(tx, p, payload);
      case DataProposalKind.COMMUNITY_CREATE:
        return this.applyCommunityCreate(tx, p, payload);
      case DataProposalKind.PARISH_WEBSITE:
        return this.applyParishWebsite(tx, p, payload);
      default:
        throw new BadRequestException('Tipo de proposta sem aplicação');
    }
  }

  private async activeCommunity(tx: Tx, communityId: string | null) {
    const community = communityId
      ? await tx.community.findUnique({
          where: { id: communityId },
          select: { id: true, name: true, address: true, parishId: true, website: true, deletedAt: true },
        })
      : null;
    if (!community || community.deletedAt) {
      throw new ConflictException('A comunidade da proposta não existe mais (apagada ou arquivada)');
    }
    return community;
  }

  private async applyScheduleCreate(tx: Tx, p: DataProposal, payload: unknown): Promise<ApplyOutcome> {
    const community = await this.activeCommunity(tx, p.communityId);
    const obj = asPayloadObject(payload);
    assertAllowedFields(p.kind, obj);
    const fields = resolveSchedule(parseSchedulePatch(obj));

    // Não duplica: o mesmo horário (tipo, hora e regra) já cadastrado conta como aprovado
    const candidates = await tx.massSchedule.findMany({
      where: {
        communityId: community.id,
        type: fields.type,
        time: fields.time,
        recurrence: fields.recurrence,
        isSpecial: false,
      },
      select: SCHEDULE_SELECT,
    });
    const same = candidates.find(
      (s) =>
        s.dayOfWeek === fields.dayOfWeek &&
        s.dayOfMonth === fields.dayOfMonth &&
        sameValue(s.weeksOfMonth, fields.weeksOfMonth),
    );
    const label = TYPE_LABEL[fields.type] ?? fields.type;
    if (same) {
      return {
        applied: false,
        message: `Já existe ${label} igual nesta comunidade (${fields.time}) — nada foi criado`,
        after: { ...same },
        link: { massScheduleId: same.id },
      };
    }

    const created = await tx.massSchedule.create({
      data: { ...fields, communityId: community.id },
      select: SCHEDULE_SELECT,
    });
    return {
      applied: true,
      message: `${label} das ${created.time} criada`,
      after: { ...created, communityId: community.id },
      link: { massScheduleId: created.id },
    };
  }

  private async applyScheduleChange(tx: Tx, p: DataProposal, payload: unknown): Promise<ApplyOutcome> {
    const schedule = p.massScheduleId
      ? await tx.massSchedule.findUnique({ where: { id: p.massScheduleId }, select: { ...SCHEDULE_SELECT, communityId: true } })
      : null;
    if (!schedule) throw new ConflictException('O horário da proposta não existe mais');
    if (!currentMatches(p.current, schedule)) throw new ConflictException(MSG_CHANGED);

    const label = TYPE_LABEL[schedule.type] ?? schedule.type;
    const before = { ...schedule } as Record<string, unknown>;

    if (p.kind === DataProposalKind.SCHEDULE_DELETE) {
      assertAllowedFields(p.kind, asPayloadObject(payload));
      await tx.massSchedule.delete({ where: { id: schedule.id } });
      return { applied: true, message: `${label} das ${schedule.time} apagada`, before, after: null, snapshot: before };
    }

    if (needsEdit(p.kind, payload)) {
      throw new BadRequestException(p.kind === DataProposalKind.SCHEDULE_UPDATE ? MSG_NEEDS_SCHEDULE : MSG_NEEDS_RECURRENCE);
    }
    const obj = asPayloadObject(payload);
    assertAllowedFields(p.kind, obj);
    const base: ScheduleFields = {
      type: schedule.type,
      dayOfWeek: schedule.dayOfWeek,
      time: schedule.time,
      recurrence: schedule.recurrence,
      weeksOfMonth: schedule.weeksOfMonth,
      dayOfMonth: schedule.dayOfMonth,
      notes: schedule.notes,
    };
    const next = resolveSchedule(parseSchedulePatch(obj), base);
    if (sameSchedule(base, next)) {
      return { applied: false, message: 'O horário já estava assim — nada mudou', before, after: before };
    }

    const updated = await tx.massSchedule.update({ where: { id: schedule.id }, data: next, select: SCHEDULE_SELECT });
    return { applied: true, message: `${label} atualizada`, before, after: { ...updated } };
  }

  private async applyCommunityChange(tx: Tx, p: DataProposal, payload: unknown): Promise<ApplyOutcome> {
    const community = await this.activeCommunity(tx, p.communityId);
    if (!currentMatches(p.current, community)) throw new ConflictException(MSG_CHANGED);
    const obj = asPayloadObject(payload);
    assertAllowedFields(p.kind, obj);

    let data: Prisma.CommunityUncheckedUpdateInput;
    let field: 'address' | 'parishId' | 'website';
    if (p.kind === DataProposalKind.COMMUNITY_ADDRESS) {
      field = 'address';
      data = { address: requiredText(obj.address, 'o endereço', ADDRESS_MAX, 3) };
    } else if (p.kind === DataProposalKind.COMMUNITY_PARISH) {
      field = 'parishId';
      const parishId = requiredText(obj.parishId, 'a paróquia de destino', 64, 1);
      const parish = await tx.parish.findUnique({ where: { id: parishId }, select: { id: true } });
      if (!parish) throw new BadRequestException('Paróquia de destino não encontrada');
      data = { parishId };
    } else {
      field = 'website';
      data = { website: parseWebsite(obj) };
    }

    const before = { [field]: community[field] };
    if (sameValue(community[field], data[field])) {
      return { applied: false, message: 'A comunidade já estava assim — nada mudou', before, after: before };
    }
    await tx.community.update({ where: { id: community.id }, data });
    const messages = {
      address: 'Endereço da comunidade atualizado',
      parishId: 'Comunidade movida para a outra paróquia',
      website: data.website ? 'Site da comunidade atualizado' : 'Site da comunidade apagado',
    };
    return { applied: true, message: messages[field], before, after: { [field]: data[field] } };
  }

  private async applyCommunityCreate(tx: Tx, p: DataProposal, payload: unknown): Promise<ApplyOutcome> {
    const parish = p.parishId
      ? await tx.parish.findUnique({ where: { id: p.parishId }, select: { id: true } })
      : null;
    if (!parish) throw new ConflictException('A paróquia da proposta não existe mais');
    const obj = asPayloadObject(payload);
    assertAllowedFields(p.kind, obj);

    const name = requiredText(obj.name, 'o nome da comunidade', NAME_MAX);
    const address = requiredText(obj.address, 'o endereço', ADDRESS_MAX, 3);
    const city = requiredText(obj.city, 'a cidade', 120);
    const state = parseState(obj.state);
    // CEP é obrigatório no cadastro; sem ele, fica vazio (como na carga do território)
    const zipCode = obj.zipCode == null ? '' : requiredText(obj.zipCode, 'o CEP', 20, 0);

    // Não duplica: mesma paróquia com comunidade de mesmo nome (ativa)
    const same = await tx.community.findFirst({
      where: { parishId: parish.id, deletedAt: null, name: { equals: name, mode: 'insensitive' } },
      select: { id: true, name: true },
    });
    if (same) {
      return {
        applied: false,
        message: `Já existe a comunidade "${same.name}" nesta paróquia — nada foi criado`,
        after: { id: same.id, name: same.name },
        link: { communityId: same.id },
      };
    }

    // Sem coordenada: o pino entra depois pela revisão do mapa do território
    const created = await tx.community.create({
      data: { name, address, city, state, zipCode, parishId: parish.id },
      select: { id: true, name: true, address: true, city: true, state: true, parishId: true },
    });
    return { applied: true, message: `Comunidade "${created.name}" criada`, after: { ...created }, link: { communityId: created.id } };
  }

  private async applyParishWebsite(tx: Tx, p: DataProposal, payload: unknown): Promise<ApplyOutcome> {
    const parish = p.parishId
      ? await tx.parish.findUnique({ where: { id: p.parishId }, select: { id: true, name: true, website: true } })
      : null;
    if (!parish) throw new ConflictException('A paróquia da proposta não existe mais');
    if (!currentMatches(p.current, parish)) throw new ConflictException(MSG_CHANGED);
    const obj = asPayloadObject(payload);
    assertAllowedFields(p.kind, obj);
    const website = parseWebsite(obj);

    const before = { website: parish.website };
    if (sameValue(parish.website, website)) {
      return { applied: false, message: 'A paróquia já estava assim — nada mudou', before, after: before };
    }
    await tx.parish.update({ where: { id: parish.id }, data: { website } });
    return {
      applied: true,
      message: website ? 'Site da paróquia atualizado' : 'Site da paróquia apagado',
      before,
      after: { website },
    };
  }
}
