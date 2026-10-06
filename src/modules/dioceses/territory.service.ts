import { Injectable } from '@nestjs/common';
import { EntityStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

/**
 * Cascata Diocese → Paróquia → Comunidade para o fiel escolher a sua comunidade.
 *
 * CONTRATO FIXO (o app é ajustado contra ele): cada nível devolve só o mínimo,
 * ordenado por nome, apenas registros ATIVOS. Substitui a árvore nacional
 * (GET /dioceses + um GET /dioceses/:id por diocese = 282 chamadas).
 * Id inexistente devolve lista vazia.
 */
@Injectable()
export class TerritoryService {
  constructor(private readonly prisma: PrismaService) {}

  /** [{ id, name, state }] */
  dioceses() {
    return this.prisma.diocese.findMany({
      where: { status: EntityStatus.ACTIVE },
      select: { id: true, name: true, state: true },
      orderBy: { name: 'asc' },
    });
  }

  /** [{ id, name, city }] */
  parishes(dioceseId: string) {
    return this.prisma.parish.findMany({
      where: { dioceseId, status: EntityStatus.ACTIVE },
      select: { id: true, name: true, city: true },
      orderBy: { name: 'asc' },
    });
  }

  /** [{ id, name, address }] — sem as arquivadas (deletedAt) */
  communities(parishId: string) {
    return this.prisma.community.findMany({
      where: { parishId, status: EntityStatus.ACTIVE, deletedAt: null },
      select: { id: true, name: true, address: true },
      orderBy: { name: 'asc' },
    });
  }
}
