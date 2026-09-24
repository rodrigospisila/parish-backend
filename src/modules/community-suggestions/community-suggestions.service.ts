import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MassScheduleType, Prisma, SuggestionKind, SuggestionStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  ACCURACY_MAX_M,
  BR_LAT_MAX,
  BR_LAT_MIN,
  BR_LNG_MAX,
  BR_LNG_MIN,
  CreateCommunitySuggestionDto,
  MESSAGE_MAX,
  MESSAGE_MIN,
} from './dto/create-community-suggestion.dto';
import { REVIEW_STATUSES, ReviewCommunitySuggestionDto } from './dto/review-community-suggestion.dto';

/** Fonte/motivo com que a sugestão de pino entra na fila de revisão do mapa do território. */
export const GEO_CANDIDATE_SOURCE = 'usuario';
export const GEO_CANDIDATE_REASON = 'sugestao-usuario';
const LABEL_MAX = 200;
const LIST_LIMIT_DEFAULT = 50;
const LIST_LIMIT_MAX = 200;

const KINDS = Object.values(SuggestionKind);
const STATUSES = Object.values(SuggestionStatus);
const SCHEDULE_TYPES = Object.values(MassScheduleType);

/** O que a listagem da administração mostra de cada sugestão (sem e-mail/telefone de quem enviou). */
const ADMIN_SELECT = {
  id: true,
  kind: true,
  scheduleType: true,
  latitude: true,
  longitude: true,
  accuracyM: true,
  atChurch: true,
  message: true,
  status: true,
  reviewNote: true,
  reviewedAt: true,
  reviewedByUserId: true,
  createdAt: true,
  community: { select: { id: true, name: true, city: true, state: true } },
  user: { select: { id: true, name: true } },
} satisfies Prisma.CommunitySuggestionSelect;

interface NormalizedSuggestion {
  kind: SuggestionKind;
  scheduleType: MassScheduleType | null;
  latitude: number | null;
  longitude: number | null;
  accuracyM: number | null;
  atChurch: boolean;
  message: string;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Correções sugeridas pelos fiéis no app. Regra de ouro: NADA é aplicado sozinho.
 * A sugestão fica guardada para o SYSTEM_ADMIN; a de LOCALIZAÇÃO também entra na
 * fila de revisão do mapa do território (CommunityGeoCandidate), onde uma pessoa
 * confere no satélite antes de mexer no pino.
 */
@Injectable()
export class CommunitySuggestionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Regras do corpo, independentes do ValidationPipe (o serviço não confia só no DTO).
   * Coordenada só é guardada em LOCATION (minimização de dado pessoal: a posição do
   * aparelho não interessa a uma correção de horário); tipo de celebração só em SCHEDULE.
   */
  normalize(dto: CreateCommunitySuggestionDto): NormalizedSuggestion {
    if (!dto || !KINDS.includes(dto.kind)) throw new BadRequestException('Tipo de sugestão inválido');

    const message = typeof dto.message === 'string' ? dto.message.trim() : '';
    if (message.length < MESSAGE_MIN || message.length > MESSAGE_MAX) {
      throw new BadRequestException(`A mensagem deve ter de ${MESSAGE_MIN} a ${MESSAGE_MAX} caracteres`);
    }

    const atChurch = dto.atChurch === true;
    let latitude: number | null = null;
    let longitude: number | null = null;
    let accuracyM: number | null = null;
    if (dto.kind === SuggestionKind.LOCATION) {
      if (!isNum(dto.latitude) || !isNum(dto.longitude)) {
        throw new BadRequestException('Sugestão de localização exige latitude e longitude');
      }
      if (dto.latitude < BR_LAT_MIN || dto.latitude > BR_LAT_MAX || dto.longitude < BR_LNG_MIN || dto.longitude > BR_LNG_MAX) {
        throw new BadRequestException('Coordenada fora do Brasil');
      }
      if (dto.accuracyM != null && (!isNum(dto.accuracyM) || dto.accuracyM < 0 || dto.accuracyM > ACCURACY_MAX_M)) {
        throw new BadRequestException('Precisão do GPS inválida');
      }
      latitude = dto.latitude;
      longitude = dto.longitude;
      accuracyM = isNum(dto.accuracyM) ? dto.accuracyM : null;
    }

    let scheduleType: MassScheduleType | null = null;
    if (dto.kind === SuggestionKind.SCHEDULE && dto.scheduleType != null) {
      if (!SCHEDULE_TYPES.includes(dto.scheduleType)) throw new BadRequestException('Tipo de celebração inválido');
      scheduleType = dto.scheduleType;
    }

    return { kind: dto.kind, scheduleType, latitude, longitude, accuracyM, atChurch, message };
  }

  /** "sugestão de usuário X — no local, GPS ±12 m" (vai no detail do candidato de pino). */
  static candidateDetail(suggestionId: string, s: Pick<NormalizedSuggestion, 'atChurch' | 'accuracyM'>): string {
    let detail = `sugestão de usuário ${suggestionId}`;
    if (s.atChurch) {
      detail += s.accuracyM != null ? ` — no local, GPS ±${Math.round(s.accuracyM)} m` : ' — no local';
    } else {
      // Sem GPS no local: a pessoa arrastou o mapa até a igreja (app, modo "marcar no mapa")
      detail += ' — marcado no mapa';
    }
    return detail;
  }

  async create(communityId: string, userId: string | null | undefined, dto: CreateCommunitySuggestionDto) {
    const s = this.normalize(dto);

    const community = await this.prisma.community.findFirst({
      where: { id: communityId, deletedAt: null, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!community) throw new NotFoundException('Comunidade não encontrada');

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.communitySuggestion.create({
        data: {
          communityId,
          userId: userId ?? null,
          kind: s.kind,
          scheduleType: s.scheduleType,
          latitude: s.latitude,
          longitude: s.longitude,
          accuracyM: s.accuracyM,
          atChurch: s.atChurch,
          message: s.message,
          status: SuggestionStatus.PENDING,
        },
        select: { id: true, status: true },
      });

      // Pino sugerido → fila de revisão do mapa. Só uma sugestão: o pino atual não muda.
      // skipDuplicates: a mesma coordenada já sugerida (ou já descartada) não volta.
      if (s.kind === SuggestionKind.LOCATION && s.latitude != null && s.longitude != null) {
        await tx.communityGeoCandidate.createMany({
          data: [
            {
              communityId,
              latitude: s.latitude,
              longitude: s.longitude,
              source: GEO_CANDIDATE_SOURCE,
              reason: GEO_CANDIDATE_REASON,
              label: s.message.slice(0, LABEL_MAX),
              detail: CommunitySuggestionsService.candidateDetail(created.id, s),
            },
          ],
          skipDuplicates: true,
        });
      }

      return { id: created.id, status: created.status };
    });
  }

  /** Listagem da administração, das mais recentes para as mais antigas. */
  async list(query: { status?: string; kind?: string; limit?: number; offset?: number }) {
    const where: Prisma.CommunitySuggestionWhereInput = {};
    if (query.status) {
      const status = query.status.toUpperCase() as SuggestionStatus;
      if (!STATUSES.includes(status)) throw new BadRequestException('Status inválido');
      where.status = status;
    }
    if (query.kind) {
      const kind = query.kind.toUpperCase() as SuggestionKind;
      if (!KINDS.includes(kind)) throw new BadRequestException('Tipo de sugestão inválido');
      where.kind = kind;
    }
    const limit = Math.min(Math.max(Math.trunc(Number(query.limit)) || LIST_LIMIT_DEFAULT, 1), LIST_LIMIT_MAX);
    const offset = Math.max(Math.trunc(Number(query.offset)) || 0, 0);

    const [total, items] = await Promise.all([
      this.prisma.communitySuggestion.count({ where }),
      this.prisma.communitySuggestion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: ADMIN_SELECT,
      }),
    ]);
    return { total, limit, offset, items };
  }

  /**
   * Marca a revisão. ACCEPTED é só marcação: nada da comunidade muda aqui — a
   * correção continua manual (e o pino, pela fila de revisão do mapa).
   */
  async review(id: string, dto: ReviewCommunitySuggestionDto, reviewerId?: string | null) {
    if (!dto || !(REVIEW_STATUSES as readonly string[]).includes(dto.status)) {
      throw new BadRequestException('Status de revisão inválido (REVIEWED, ACCEPTED ou REJECTED)');
    }
    const note = typeof dto.reviewNote === 'string' ? dto.reviewNote.trim() : undefined;
    if (note != null && note.length > 1000) throw new BadRequestException('Observação longa demais');

    const exists = await this.prisma.communitySuggestion.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Sugestão não encontrada');

    return this.prisma.communitySuggestion.update({
      where: { id },
      data: {
        status: dto.status,
        // Sem reviewNote no corpo, mantém a observação anterior; string vazia apaga
        ...(note !== undefined ? { reviewNote: note || null } : {}),
        reviewedAt: new Date(),
        reviewedByUserId: reviewerId ?? null,
      },
      select: ADMIN_SELECT,
    });
  }
}
