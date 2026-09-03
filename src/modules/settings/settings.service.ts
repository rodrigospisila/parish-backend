import { BadRequestException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../common/audit.service';

/** Chaves de módulo do painel que o SYSTEM_ADMIN pode desativar por papel. */
export const CONFIGURABLE_MODULE_KEYS = [
  'dioceses',
  'parishes',
  'communities',
  'members',
  'events',
  'fixed-schedule',
  'schedules',
  'swaps',
  'clergy-messages',
  'saints',
  'pastorals',
  'my-pastorals',
  'catechesis',
  'planning',
  'documents',
  'formation',
  'rooms',
  'visitation',
  'finance',
  'sacrament-processes',
  'users',
  'audit',
] as const;

const CONFIGURABLE_ROLES: UserRole[] = [
  UserRole.DIOCESAN_ADMIN,
  UserRole.PARISH_ADMIN,
  UserRole.COMMUNITY_COORDINATOR,
  UserRole.PASTORAL_COORDINATOR,
  UserRole.VOLUNTEER,
  UserRole.FAITHFUL,
];

interface CurrentUser {
  id: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /** Módulos desativados por papel — qualquer autenticado (o menu depende disso). */
  async getModuleAccess() {
    const rows = await this.prisma.moduleAccessOverride.findMany({
      select: { moduleKey: true, role: true },
      orderBy: [{ moduleKey: 'asc' }, { role: 'asc' }],
    });
    return { modules: [...CONFIGURABLE_MODULE_KEYS], roles: CONFIGURABLE_ROLES, disabled: rows };
  }

  /** Substitui a matriz inteira (só SYSTEM_ADMIN chega aqui — guard na rota). */
  async setModuleAccess(disabled: Array<{ moduleKey: string; role: string }>, user: CurrentUser) {
    const entries = Array.isArray(disabled) ? disabled : [];
    if (entries.length > 500) throw new BadRequestException('Lista de desativações grande demais');
    const validKeys = new Set<string>(CONFIGURABLE_MODULE_KEYS);
    const validRoles = new Set<string>(CONFIGURABLE_ROLES);
    const cleaned: Array<{ moduleKey: string; role: UserRole }> = [];
    const seen = new Set<string>();
    for (const entry of entries) {
      const moduleKey = String(entry?.moduleKey ?? '');
      const role = String(entry?.role ?? '');
      if (!validKeys.has(moduleKey)) throw new BadRequestException(`Módulo desconhecido: ${moduleKey}`);
      // SYSTEM_ADMIN nunca é bloqueável (auto-bloqueio tiraria a própria matriz)
      if (!validRoles.has(role)) throw new BadRequestException(`Papel não configurável: ${role}`);
      const key = `${moduleKey}:${role}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cleaned.push({ moduleKey, role: role as UserRole });
    }

    const before = await this.prisma.moduleAccessOverride.findMany({
      select: { moduleKey: true, role: true },
    });
    await this.prisma.$transaction([
      this.prisma.moduleAccessOverride.deleteMany({}),
      ...(cleaned.length ? [this.prisma.moduleAccessOverride.createMany({ data: cleaned })] : []),
    ]);
    await this.auditService.log({
      actor: { id: user.id, email: user.email, role: user.role },
      action: 'UPDATE',
      entity: 'ModuleAccessOverride',
      entityId: 'matrix',
      before: { disabled: before },
      after: { disabled: cleaned },
    });
    return { disabled: cleaned };
  }
}
