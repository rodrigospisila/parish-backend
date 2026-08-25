import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, TransactionType, UserRole } from '@prisma/client';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser, HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PdfService } from '../pdf/pdf.service';
import { buildPixBrCode, normalizeAscii, normalizePixKey, validatePixKey } from './pix-brcode';
import { PaymentsService } from '../payments/payments.service';
import { AsaasProvider } from '../payments/asaas.provider';
import { PAID_STATUSES, PaymentProvider, ProviderCharge, WebhookRequest, ProviderSetupResult } from '../payments/payment-provider.interface';
import { maskSecret } from '../payments/payment-crypto';

const FINANCE_ROLES: UserRole[] = [
  UserRole.SYSTEM_ADMIN,
  UserRole.DIOCESAN_ADMIN,
  UserRole.PARISH_ADMIN,
  UserRole.COMMUNITY_COORDINATOR,
];

const MAX_AMOUNT = 50000;
const MAX_OPEN_INTENTS = 5;
// Freios por membro em 24h (cancelar não libera vaga; declarar não vira spam)
const MAX_INTENTS_PER_DAY = 10;
const MAX_DECLARES_PER_DAY = 5;
const RENOTIFY_MINUTES = 10;
/** Reprocessamento de webhook que falhou (job a cada 10 min) */
const WEBHOOK_MAX_ATTEMPTS = 10;

/** Nome vindo do cadastro (texto livre) nunca entra cru em push/SMS/PDF/lançamento. */
const safeName = (value: string | null | undefined): string =>
  String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'Fiel';

/** Chave mascarada para avisos (nunca a chave inteira num push/SMS). */
const maskKey = (key: string | null | undefined): string => {
  const value = String(key ?? '');
  if (value.length <= 6) return value ? `${value[0]}…` : '—';
  return `${value.slice(0, 3)}…${value.slice(-2)}`;
};

const OPEN_STATUSES = ['CREATED', 'DECLARED'] as const;
const KEY_CHANGED_NOTE = 'Chave Pix da paróquia foi alterada — gere um novo Pix';
const SELF_CANCEL_NOTE = 'Cancelado pelo fiel';
// Mês de referência aceito: até 12 meses atrás (quitar atrasado) e 1 à frente
const MONTHS_BACK = 12;
const MONTHS_AHEAD = 1;

const monthIndex = (month: string) => Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1;

/** Cancelamento que o FIEL pode contestar: só os feitos pela tesouraria. */
const cancelledByTreasury = (intent: { status: string; note: string | null }) =>
  intent.status === 'CANCELLED' &&
  !!intent.note &&
  intent.note !== SELF_CANCEL_NOTE &&
  !intent.note.startsWith('Pix expirado') &&
  !intent.note.startsWith(KEY_CHANGED_NOTE) &&
  !intent.note.startsWith('Dízimo pelo app desativado');

/**
 * Dízimo online — Fase 1 (Pix da própria paróquia, sem gateway):
 * o fiel gera um Pix copia-e-cola com valor + txid, paga no banco dele, marca
 * "já fiz o Pix"; a tesouraria confere no extrato e confirma → vira
 * contribuição de dizimista + lançamento no Financeiro. Fase 2 (gateway com
 * webhook) entra pelo campo method=GATEWAY/providerRef sem mudar o fluxo.
 */
@Injectable()
export class TitheService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly pdfService: PdfService,
    private readonly paymentsService: PaymentsService,
  ) {}

  private auditActor(user: CurrentUser) {
    return { id: user.id, email: user.email, role: user.role };
  }

  private canManage(role: UserRole) {
    return FINANCE_ROLES.includes(role);
  }

  private currentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private async resolveMember(user: CurrentUser) {
    const member = await this.prisma.member.findFirst({
      where: { userId: user.id, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        communityId: true,
        titheReminderDay: true,
        cpf: true,
        email: true,
        phone: true,
        community: { select: { id: true, name: true, parishId: true } },
      },
    });
    if (!member) {
      throw new BadRequestException('Seu usuário ainda não tem cadastro de membro — procure a secretaria');
    }
    return member;
  }

  private validateReferenceMonth(raw: string | undefined): string {
    const referenceMonth = (raw ?? this.currentMonth()).trim();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(referenceMonth)) {
      throw new BadRequestException('Mês de referência inválido (use AAAA-MM)');
    }
    const delta = monthIndex(referenceMonth) - monthIndex(this.currentMonth());
    if (delta < -MONTHS_BACK || delta > MONTHS_AHEAD) {
      throw new BadRequestException(`Mês de referência fora da janela (até ${MONTHS_BACK} meses atrás e ${MONTHS_AHEAD} à frente)`);
    }
    return referenceMonth;
  }

  /** Tesouraria que recebe avisos do fiel: coordenação da comunidade + administração da paróquia. */
  private async treasuryUserIds(communityId: string | null, parishId: string): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          ...(communityId ? [{ communityId, role: UserRole.COMMUNITY_COORDINATOR }] : []),
          { parishId, role: UserRole.PARISH_ADMIN },
        ],
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  private async parishFor(parishId: string) {
    return this.prisma.parish.findUnique({ where: { id: parishId }, select: this.parishConfigSelect });
  }

  private parishUsable(parish: { titheEnabled: boolean; pixKey: string | null; pixMerchantName: string | null; pixMerchantCity: string | null } | null) {
    return !!parish?.titheEnabled && !!parish.pixKey && !!parish.pixMerchantName && !!parish.pixMerchantCity;
  }

  private parishConfigSelect = {
    id: true,
    name: true,
    city: true,
    logoUrl: true,
    titheEnabled: true,
    pixKey: true,
    pixKeyType: true,
    pixMerchantName: true,
    pixMerchantCity: true,
    titheMessage: true,
    pixKeyChangedAt: true,
    pixKeyChangedByUserId: true,
    paymentProvider: true,
    providerEnv: true,
    providerApiKeyEnc: true,
    providerWebhookToken: true,
    providerConfiguredAt: true,
    feePolicy: true,
    feeFixed: true,
    feePercent: true,
  } as const;

  /** Taxa estimada e valor cobrado conforme a política da paróquia. */
  private computeFee(parish: { feePolicy: string; feeFixed: number; feePercent: number }, amount: number) {
    const fee = Math.round((parish.feeFixed + (amount * parish.feePercent) / 100) * 100) / 100;
    const charged = parish.feePolicy === 'PASS_THROUGH' ? Math.round((amount + fee) * 100) / 100 : amount;
    return { fee, charged };
  }

  private webhookUrl(provider: string | null, parishId: string): string | null {
    if (!provider) return null;
    const base = (process.env.PUBLIC_API_URL ?? 'https://parish-backend-production.up.railway.app/api/v1').replace(/\/$/, '');
    return `${base}/tithe/webhooks/${provider.toLowerCase()}/${parishId}`;
  }

  // ===== CONFIGURAÇÃO (administração paroquial) =====

  private async assertParishAdmin(user: CurrentUser, parishId: string) {
    if (user.role === UserRole.SYSTEM_ADMIN) return;
    if (user.role === UserRole.DIOCESAN_ADMIN) {
      const parish = await this.prisma.parish.findUnique({ where: { id: parishId }, select: { dioceseId: true } });
      if (parish?.dioceseId === user.dioceseId) return;
    }
    if (user.role === UserRole.PARISH_ADMIN && user.parishId === parishId) return;
    throw new ForbiddenException('Somente a administração da paróquia configura o dízimo online');
  }

  private resolveParishId(user: CurrentUser, parishId?: string): string {
    const target = parishId || user.parishId;
    if (!target) throw new BadRequestException('Informe a paróquia');
    return target;
  }

  async getConfig(user: CurrentUser, parishId?: string) {
    const target = this.resolveParishId(user, parishId);
    await this.assertParishAdmin(user, target);
    const parish = await this.prisma.parish.findUnique({ where: { id: target }, select: this.parishConfigSelect });
    if (!parish) throw new NotFoundException('Paróquia não encontrada');
    const preview =
      parish.pixKey && parish.pixMerchantName && parish.pixMerchantCity
        ? buildPixBrCode({
            key: parish.pixKey,
            merchantName: parish.pixMerchantName,
            merchantCity: parish.pixMerchantCity,
            txid: 'PREVIEW',
            description: 'Dizimo',
          })
        : null;
    let lastChange: { at: Date; byName: string | null } | null = null;
    if (parish.pixKeyChangedAt) {
      const by = parish.pixKeyChangedByUserId
        ? await this.prisma.user.findUnique({ where: { id: parish.pixKeyChangedByUserId }, select: { name: true } })
        : null;
      lastChange = { at: parish.pixKeyChangedAt, byName: by?.name ?? null };
    }
    const { providerApiKeyEnc, providerWebhookToken, ...safe } = parish;
    const secretByAdmin = this.paymentsService.webhookSecretManagedByAdmin(parish.paymentProvider);
    return {
      ...safe,
      // Asaas: token gerado aqui (o admin cola no painel do Asaas). Mercado
      // Pago: a assinatura vem do painel do MP e não é exibida de volta.
      providerWebhookToken: secretByAdmin ? null : providerWebhookToken,
      providerWebhookSecretSet: !!providerWebhookToken,
      providerWebhookSecretByAdmin: secretByAdmin,
      brCodePreview: preview,
      lastChange,
      providerConfigured: !!providerApiKeyEnc,
      providerApiKeyMasked: null,
      webhookUrl: providerApiKeyEnc ? this.webhookUrl(parish.paymentProvider, parish.id) : null,
      paymentsCryptoReady: this.paymentsService.isConfigured(),
      paymentsCryptoProblem: this.paymentsService.cryptoProblem(),
    };
  }

  async updateConfig(
    user: CurrentUser,
    dto: {
      parishId?: string;
      titheEnabled?: boolean;
      pixKey?: string | null;
      pixKeyType?: string | null;
      pixMerchantName?: string | null;
      pixMerchantCity?: string | null;
      titheMessage?: string | null;
      currentPassword?: string;
      paymentProvider?: string | null;
      providerEnv?: string | null;
      providerApiKey?: string | null;
      providerWebhookSecret?: string | null;
      feePolicy?: string | null;
      feeFixed?: number | null;
      feePercent?: number | null;
    },
  ) {
    const target = this.resolveParishId(user, dto.parishId);
    await this.assertParishAdmin(user, target);
    const current = await this.prisma.parish.findUnique({
      where: { id: target },
      select: { ...this.parishConfigSelect, dioceseId: true },
    });
    if (!current) throw new NotFoundException('Paróquia não encontrada');

    const pixKeyType = dto.pixKeyType !== undefined ? (dto.pixKeyType ?? '').trim().toUpperCase() || null : current.pixKeyType;
    const rawKey = dto.pixKey !== undefined ? (dto.pixKey ?? '').trim() || null : current.pixKey;
    // Grava no formato do DICT (minúsculas para e-mail/aleatória, CNPJ maiúsculo)
    const pixKey = rawKey ? normalizePixKey(pixKeyType, rawKey) : null;
    const pixMerchantName =
      dto.pixMerchantName !== undefined
        ? normalizeAscii(dto.pixMerchantName ?? '', 25) || null
        : current.pixMerchantName;
    const pixMerchantCity =
      dto.pixMerchantCity !== undefined
        ? normalizeAscii(dto.pixMerchantCity ?? '', 15).toUpperCase() || null
        : current.pixMerchantCity;
    const titheMessage =
      dto.titheMessage !== undefined ? (dto.titheMessage ?? '').trim().slice(0, 500) || null : current.titheMessage;
    const titheEnabled = dto.titheEnabled !== undefined ? !!dto.titheEnabled : current.titheEnabled;

    if (pixKey) {
      const error = validatePixKey(pixKeyType, pixKey);
      if (error) throw new BadRequestException(error);
    }
    if (titheEnabled && (!pixKey || !pixMerchantName || !pixMerchantCity)) {
      throw new BadRequestException('Para ativar, informe chave Pix, nome do recebedor e cidade');
    }

    // Provedor de pagamento (D3): mudar provedor/chave de API também é sensível
    const providerRequested = dto.paymentProvider !== undefined;
    const paymentProvider = providerRequested
      ? ['ASAAS', 'MERCADOPAGO'].includes(String(dto.paymentProvider ?? '').toUpperCase())
        ? String(dto.paymentProvider).toUpperCase()
        : null
      : current.paymentProvider;
    const providerEnv = dto.providerEnv !== undefined ? (dto.providerEnv === 'production' ? 'production' : 'sandbox') : current.providerEnv;
    const apiKeyGiven = typeof dto.providerApiKey === 'string' && dto.providerApiKey.trim().length > 0;
    let providerApiKeyEnc = paymentProvider ? current.providerApiKeyEnc : null;
    if (apiKeyGiven && paymentProvider) providerApiKeyEnc = this.paymentsService.encryptApiKey(dto.providerApiKey!);
    const envChanged =
      !!paymentProvider && !!current.paymentProvider && (providerEnv ?? 'sandbox') !== (current.providerEnv ?? 'sandbox');
    // Trocar de provedor/ambiente invalida o que vive no provedor antigo
    // (clientes, cobranças abertas, dízimos automáticos)
    const providerSwitch = (paymentProvider ?? null) !== (current.paymentProvider ?? null) || envChanged;
    const webhookSecretGiven =
      typeof dto.providerWebhookSecret === 'string' &&
      dto.providerWebhookSecret.trim().length > 0 &&
      this.paymentsService.webhookSecretManagedByAdmin(paymentProvider);
    const providerChanged = apiKeyGiven || providerSwitch || webhookSecretGiven;
    let providerWebhookToken: string | null = null;
    if (paymentProvider) {
      if (this.paymentsService.webhookSecretManagedByAdmin(paymentProvider)) {
        // Mercado Pago: assinatura secreta gerada no painel do MP e colada aqui;
        // o token aleatório de outro provedor nunca serve como segredo do MP
        providerWebhookToken = webhookSecretGiven
          ? dto.providerWebhookSecret!.trim()
          : current.paymentProvider === paymentProvider
            ? current.providerWebhookToken
            : null;
      } else {
        providerWebhookToken =
          current.paymentProvider === paymentProvider
            ? current.providerWebhookToken ?? this.paymentsService.newWebhookToken()
            : this.paymentsService.newWebhookToken();
      }
    }
    const feePolicy = dto.feePolicy !== undefined ? (dto.feePolicy === 'PASS_THROUGH' ? 'PASS_THROUGH' : 'ABSORB') : current.feePolicy;
    const feeFixed = dto.feeFixed !== undefined && dto.feeFixed !== null ? Math.max(0, Math.min(50, Number(dto.feeFixed) || 0)) : current.feeFixed;
    const feePercent = dto.feePercent !== undefined && dto.feePercent !== null ? Math.max(0, Math.min(10, Number(dto.feePercent) || 0)) : current.feePercent;

    // Trocar a CHAVE é a operação sensível (desvio de dízimo): exige a senha
    // atual de quem está logado, mesmo com token válido
    const keyChanged = (pixKey ?? null) !== (current.pixKey ?? null) || (pixKeyType ?? null) !== (current.pixKeyType ?? null);
    if (keyChanged || providerChanged) {
      const password = (dto.currentPassword ?? '').trim();
      if (!password) throw new BadRequestException('Informe sua senha atual para alterar a chave Pix ou o provedor de pagamento');
      const account = await this.prisma.user.findUnique({ where: { id: user.id }, select: { password: true } });
      const valid = account ? await bcrypt.compare(password, account.password) : false;
      if (!valid) throw new BadRequestException('Senha atual incorreta');
    }
    // Qualquer mudança no recebedor (ou desativar) invalida os Pix ainda não
    // informados: o código antigo apontaria para a chave antiga
    const receiverChanged =
      keyChanged ||
      (pixMerchantName ?? null) !== (current.pixMerchantName ?? null) ||
      (pixMerchantCity ?? null) !== (current.pixMerchantCity ?? null);
    const disabling = current.titheEnabled && !titheEnabled;

    // Trocar/remover o provedor: os dízimos automáticos vivem no provedor antigo.
    // Cancela lá (com a credencial antiga) ANTES de sobrescrever; se o provedor
    // não confirmar, a troca não acontece — o banco do fiel continuaria debitando
    let closedSchedules = 0;
    if (providerSwitch && current.paymentProvider) {
      closedSchedules = await this.closeSchedulesForProviderSwitch(current);
    }
    // Pix do provedor ainda abertos: cancela a cobrança lá (best-effort) para o
    // QR antigo parar de aceitar pagamento
    const gatewayToCancel =
      disabling || providerSwitch
        ? await this.prisma.titheIntent.findMany({
            where: { parishId: target, status: 'CREATED', method: 'GATEWAY', providerRef: { not: null } },
            select: { providerRef: true },
          })
        : [];

    const { cancelledOpenIntents } = await this.prisma.$transaction(async (tx) => {
      await tx.parish.update({
        where: { id: target },
        data: {
          pixKey,
          pixKeyType,
          pixMerchantName,
          pixMerchantCity,
          titheMessage,
          titheEnabled,
          ...(keyChanged ? { pixKeyChangedAt: new Date(), pixKeyChangedByUserId: user.id } : {}),
          paymentProvider,
          providerEnv: paymentProvider ? providerEnv ?? 'sandbox' : null,
          providerApiKeyEnc,
          providerWebhookToken,
          ...(providerChanged ? { providerConfiguredAt: paymentProvider ? new Date() : null } : {}),
          feePolicy,
          feeFixed,
          feePercent,
        },
      });
      let cancelled = 0;
      // Só a chave muda o destino do dinheiro; nome/cidade no BR Code são
      // cosméticos. Pix do provedor não usa a chave: só cai ao desativar o
      // dízimo ou trocar de provedor.
      const staleMethods: Array<'PIX_STATIC' | 'GATEWAY'> = disabling
        ? ['PIX_STATIC', 'GATEWAY']
        : [...(keyChanged ? ['PIX_STATIC' as const] : []), ...(providerSwitch ? ['GATEWAY' as const] : [])];
      if (staleMethods.length) {
        const note = disabling
          ? keyChanged
            ? KEY_CHANGED_NOTE
            : 'Dízimo pelo app desativado pela paróquia'
          : keyChanged
            ? KEY_CHANGED_NOTE
            : 'Provedor de pagamento alterado — gere outro Pix';
        const result = await tx.titheIntent.updateMany({
          where: { parishId: target, status: 'CREATED', method: { in: staleMethods } },
          data: { status: 'CANCELLED', note },
        });
        cancelled = result.count;
      }
      // Cliente no provedor é por conta/ambiente: chave nova pode ser outra conta
      if (providerSwitch || apiKeyGiven) {
        await tx.memberProviderCustomer.deleteMany({ where: { parishId: target } });
      }
      return { cancelledOpenIntents: cancelled };
    });
    if (gatewayToCancel.length && this.paymentsService.hasProvider(current)) {
      try {
        const old = this.paymentsService.forParish(current);
        for (const stale of gatewayToCancel) {
          try {
            await old.cancelCharge(stale.providerRef!);
          } catch {
            // best-effort: o Pix já foi encerrado localmente
          }
        }
      } catch {
        // credencial antiga indisponível
      }
    }

    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'UPDATE',
      entity: 'ParishTitheConfig',
      entityId: target,
      before: {
        titheEnabled: current.titheEnabled,
        pixKey: current.pixKey,
        pixKeyType: current.pixKeyType,
        pixMerchantName: current.pixMerchantName,
        pixMerchantCity: current.pixMerchantCity,
      },
      after: { titheEnabled, pixKey, pixKeyType, pixMerchantName, pixMerchantCity, paymentProvider, providerEnv, feePolicy },
      metadata: { keyChanged, providerChanged, providerSwitch, apiKeyRotated: apiKeyGiven, webhookSecretSet: webhookSecretGiven, cancelledOpenIntents, closedSchedules },
    });

    // Troca de chave avisa os DEMAIS administradores (paróquia e diocese):
    // se ninguém reconhece a mudança, desativa-se o dízimo na hora
    if (keyChanged) {
      try {
        const admins = await this.prisma.user.findMany({
          where: {
            isActive: true,
            id: { not: user.id },
            OR: [
              { parishId: target, role: UserRole.PARISH_ADMIN },
              { dioceseId: current.dioceseId, role: UserRole.DIOCESAN_ADMIN },
            ],
          },
          select: { id: true },
        });
        if (admins.length) {
          await this.notificationsService.notifyUsers(
            admins.map((a) => a.id),
            NotificationType.TITHE,
            'Chave Pix do dízimo alterada',
            `${safeName(user.email ?? 'Um administrador')} trocou a chave Pix da paróquia de ${maskKey(current.pixKey)} para ${maskKey(pixKey)}. Se você não reconhece esta alteração, desative o dízimo online agora no Financeiro.`,
            { kind: 'tithe-key-changed', parishId: target },
          );
        }
      } catch {
        // aviso é conveniência
      }
    }
    // Asaas: deixa a conta pronta (chave Pix + webhook) sem o admin sair do Parish
    const providerSetup = paymentProvider && providerApiKeyEnc && (providerChanged || apiKeyGiven)
      ? await this.runProviderSetup(target, user)
      : null;
    const config = await this.getConfig(user, target);
    return { ...config, cancelledOpenIntents, closedSchedules, providerSetup };
  }

  /**
   * Prepara a conta do provedor para o Parish (idempotente, best-effort):
   * chave Pix ativa e webhook com a URL/token da paróquia. Nunca falha o
   * cadastro — o resultado volta para a tela.
   */
  async runProviderSetup(parishId: string, user: CurrentUser): Promise<ProviderSetupResult | null> {
    const parish = await this.parishFor(parishId);
    if (!parish || !this.paymentsService.hasProvider(parish) || !parish.providerWebhookToken) return null;
    let provider: PaymentProvider;
    try {
      provider = this.paymentsService.forParish(parish);
    } catch (error) {
      return { pixKeyReady: false, webhookRegistered: false, notes: [String((error as Error)?.message ?? error).slice(0, 160)] };
    }
    if (!provider.ensureSetup) return null;
    const webhookUrl = this.webhookUrl(parish.paymentProvider, parish.id);
    if (!webhookUrl) return null;
    let result: ProviderSetupResult;
    try {
      result = await provider.ensureSetup({
        webhookUrl,
        webhookToken: parish.providerWebhookToken,
        contactEmail: user.email ?? 'contato@parish.app',
      });
    } catch (error) {
      result = { pixKeyReady: false, webhookRegistered: false, notes: [String((error as Error)?.message ?? error).slice(0, 160)] };
    }
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'UPDATE',
      entity: 'ParishTitheConfig',
      entityId: parishId,
      metadata: { providerSetup: { pixKeyReady: result.pixKeyReady, webhookRegistered: result.webhookRegistered, notes: result.notes } },
    });
    return result;
  }

  /** Administração pede para conferir/refazer o setup do provedor. */
  async providerSetup(user: CurrentUser, parishId?: string) {
    const target = this.resolveParishId(user, parishId);
    await this.assertParishAdmin(user, target);
    const result = await this.runProviderSetup(target, user);
    if (!result) throw new BadRequestException('A paróquia não tem provedor configurado (ou o provedor não tem setup automático)');
    return result;
  }

  /**
   * Encerra os dízimos automáticos da paróquia no provedor ANTIGO (troca de
   * provedor/ambiente). Sem confirmação do provedor para uma recorrência viva,
   * a troca é recusada: cancelar só no Parish deixaria o débito ativo no banco.
   */
  private async closeSchedulesForProviderSwitch(current: {
    id: string;
    paymentProvider: string | null;
    providerEnv: string | null;
    providerApiKeyEnc: string | null;
    providerWebhookToken: string | null;
  }): Promise<number> {
    const schedules = await this.prisma.titheSchedule.findMany({
      where: { parishId: current.id, status: { in: ['PENDING_AUTHORIZATION', 'ACTIVE', 'PAUSED'] } },
      include: { member: { select: { userId: true } } },
    });
    if (!schedules.length) return 0;
    let provider: PaymentProvider | null = null;
    try {
      provider = this.paymentsService.hasProvider(current) ? this.paymentsService.forParish(current) : null;
    } catch {
      provider = null;
    }
    const now = Date.now();
    const failed: string[] = [];
    let closed = 0;
    for (const schedule of schedules) {
      // Autorização pendente com QR vencido não tem nada vivo no banco
      const liveInBank =
        schedule.status !== 'PENDING_AUTHORIZATION' || !schedule.authorizationExpires || schedule.authorizationExpires.getTime() > now;
      const hasRefs = !!(schedule.providerSubscriptionRef || schedule.providerAuthorizationRef);
      if (hasRefs && provider) {
        try {
          await provider.cancelSubscription({
            providerRef: schedule.providerSubscriptionRef,
            authorizationRef: schedule.providerAuthorizationRef,
          });
        } catch {
          if (liveInBank) {
            failed.push(schedule.id);
            continue;
          }
        }
      } else if (hasRefs && liveInBank) {
        failed.push(schedule.id);
        continue;
      }
      await this.prisma.titheSchedule.update({
        where: { id: schedule.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          authorizationPayload: null,
          lastError: 'Encerrado: a paróquia trocou o provedor de pagamento',
        },
      });
      closed += 1;
      if (schedule.member.userId) {
        try {
          await this.notificationsService.notifyUsers(
            [schedule.member.userId],
            NotificationType.TITHE,
            'Dízimo automático encerrado',
            'Sua paróquia trocou o provedor de pagamento e o seu dízimo automático foi encerrado. Quando quiser, ative de novo pelo app.',
            { kind: 'tithe-schedule', scheduleId: schedule.id },
          );
        } catch {
          // aviso é conveniência
        }
      }
    }
    if (failed.length) {
      throw new BadRequestException(
        `Não foi possível encerrar ${failed.length} dízimo(s) automático(s) no provedor atual — tente de novo ou cancele no painel do provedor antes de trocar`,
      );
    }
    return closed;
  }

  // ===== FIEL =====

  /** Visão do fiel: paróquia (config), situação de dizimista, Pix recentes e contribuições. */
  async getMyTithe(user: CurrentUser) {
    const member = await this.resolveMember(user);
    const parish = await this.prisma.parish.findUnique({
      where: { id: member.community.parishId },
      select: this.parishConfigSelect,
    });
    const schedule = await this.prisma.titheSchedule.findFirst({
      where: { memberId: member.id, status: { in: ['PENDING_AUTHORIZATION', 'ACTIVE', 'PAUSED'] } },
      orderBy: { createdAt: 'desc' },
    });
    const gatewayReady = !!parish && this.paymentsService.hasProvider(parish) && parish.titheEnabled;
    const [tither, intents] = await Promise.all([
      this.prisma.tither.findUnique({
        where: { memberId: member.id },
        select: {
          registrationNumber: true,
          joinedAt: true,
          status: true,
          contributions: {
            orderBy: { date: 'desc' },
            take: 12,
            select: { id: true, amount: true, date: true, referenceMonth: true, method: true, receiptNumber: true },
          },
        },
      }),
      this.prisma.titheIntent.findMany({
        where: { memberId: member.id },
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: {
          id: true,
          amount: true,
          referenceMonth: true,
          kind: true,
          status: true,
          txid: true,
          note: true,
          amountPaid: true,
          anonymous: true,
          contestNote: true,
          contestedAt: true,
          declaredAt: true,
          confirmedAt: true,
          createdAt: true,
        },
      }),
    ]);
    const lastAmount = intents.find((i) => i.status === 'CONFIRMED')?.amount ?? tither?.contributions[0]?.amount ?? null;
    return {
      member: { id: member.id, fullName: member.fullName, community: member.community.name },
      parish: parish
        ? {
            id: parish.id,
            name: parish.name,
            titheEnabled: parish.titheEnabled,
            titheMessage: parish.titheMessage,
            pixKeyType: parish.pixKeyType,
            // A chave é pública por natureza (é para ela que o fiel paga)
            pixKey: parish.titheEnabled ? parish.pixKey : null,
            merchantName: parish.pixMerchantName,
          }
        : null,
      tither: tither
        ? { registrationNumber: tither.registrationNumber, joinedAt: tither.joinedAt, status: tither.status }
        : null,
      contributions: tither?.contributions ?? [],
      intents: intents.map((i) => ({ ...i, canContest: cancelledByTreasury(i) && !i.contestedAt })),
      suggestedAmount: lastAmount,
      currentMonth: this.currentMonth(),
      reminderDay: member.titheReminderDay ?? null,
      monthsBack: MONTHS_BACK,
      monthsAhead: MONTHS_AHEAD,
      persistentQrAvailable: this.parishUsable(parish),
      // Provedor (D3): confirmação automática e dízimo recorrente
      gateway: parish
        ? (() => {
            // Mesmas exigências de createIntent: sem CPF (Asaas) ou e-mail (MP)
            // o Pix cai no estático — o app avisa em vez de prometer confirmação
            const needsCpf = gatewayReady && parish.paymentProvider === 'ASAAS' && !member.cpf;
            const needsEmail = gatewayReady && parish.paymentProvider === 'MERCADOPAGO' && !member.email;
            return {
              provider: gatewayReady ? parish.paymentProvider : null,
              available: gatewayReady && !needsCpf && !needsEmail,
              needsCpf,
              needsEmail,
              feePolicy: parish.feePolicy,
              feeFixed: parish.feeFixed,
              feePercent: parish.feePercent,
              recurringAvailable: gatewayReady && parish.paymentProvider === 'ASAAS' && !!member.cpf,
            };
          })()
        : null,
      schedule: schedule ? this.presentSchedule(schedule) : null,
    };
  }

  private newTxid(): string {
    const stamp = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `PAR${stamp}${rand}`.replace(/[^A-Z0-9]/g, '').slice(0, 25);
  }

  /** Gera o Pix (BR Code + QR) para o valor/mês escolhidos. */
  async createIntent(
    user: CurrentUser,
    dto: { amount: number; referenceMonth?: string; kind?: string; anonymous?: boolean },
  ) {
    const member = await this.resolveMember(user);
    const parish = await this.prisma.parish.findUnique({
      where: { id: member.community.parishId },
      select: this.parishConfigSelect,
    });
    if (!parish?.titheEnabled || !parish.pixKey || !parish.pixMerchantName || !parish.pixMerchantCity) {
      throw new BadRequestException('Sua paróquia ainda não ativou o dízimo pelo app');
    }
    const amount = Math.round(Number(dto.amount) * 100) / 100;
    if (!Number.isFinite(amount) || amount < 1 || amount > MAX_AMOUNT) {
      throw new BadRequestException(`Informe um valor entre R$ 1,00 e R$ ${MAX_AMOUNT.toLocaleString('pt-BR')}`);
    }
    const kind = dto.kind === 'OFFERING' ? 'OFFERING' : 'TITHE';
    const referenceMonth = this.validateReferenceMonth(dto.referenceMonth);
    // Só oferta pode ser anônima — dízimo é vínculo do dizimista com a paróquia
    const anonymous = kind === 'OFFERING' && dto.anonymous === true;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [open, createdToday] = await Promise.all([
      this.prisma.titheIntent.count({ where: { memberId: member.id, status: { in: ['CREATED', 'DECLARED'] } } }),
      this.prisma.titheIntent.count({ where: { memberId: member.id, createdAt: { gte: since } } }),
    ]);
    if (open >= MAX_OPEN_INTENTS) {
      throw new BadRequestException('Você tem Pix em aberto demais — aguarde a conferência ou cancele os antigos');
    }
    if (createdToday >= MAX_INTENTS_PER_DAY) {
      throw new BadRequestException('Limite diário de Pix gerados atingido — tente amanhã');
    }

    const txid = this.newTxid();
    const description = `${kind === 'TITHE' ? 'Dizimo' : 'Oferta'} ${referenceMonth}`;
    // Provedor configurado + identidade do pagador: cobrança dinâmica com
    // confirmação automática. Senão (ou se o provedor falhar), Pix estático.
    const canUseGateway =
      this.paymentsService.hasProvider(parish) && (parish.paymentProvider !== 'ASAAS' || !!member.cpf) && (parish.paymentProvider !== 'MERCADOPAGO' || !!member.email);
    const { fee, charged } = canUseGateway ? this.computeFee(parish, amount) : { fee: 0, charged: amount };
    let intent = await this.prisma.titheIntent.create({
      data: {
        memberId: member.id,
        parishId: parish.id,
        communityId: member.communityId,
        amount,
        referenceMonth,
        kind,
        anonymous,
        method: canUseGateway ? 'GATEWAY' : 'PIX_STATIC',
        txid,
        brCode: canUseGateway
          ? null
          : buildPixBrCode({
              key: parish.pixKey,
              merchantName: parish.pixMerchantName,
              merchantCity: parish.pixMerchantCity,
              amount,
              txid,
              description,
            }),
        feeAmount: canUseGateway ? fee : 0,
        chargedAmount: canUseGateway ? charged : null,
      },
    });
    if (canUseGateway) {
      try {
        const provider = this.paymentsService.forParish(parish);
        const customerId = await this.providerCustomerId(provider, member, parish);
        const charge = await provider.createCharge({
          providerCustomerId: customerId,
          amount: charged,
          dueDate: this.plusDays(3),
          description: `${description} - ${parish.name}`.slice(0, 120),
          externalRef: intent.id,
          idempotencyKey: intent.id,
          payerEmail: member.email,
          payerCpf: member.cpf,
          expiresInSec: 3 * 24 * 60 * 60,
        });
        intent = await this.prisma.titheIntent.update({
          where: { id: intent.id },
          data: {
            providerRef: charge.providerRef,
            providerStatus: charge.status,
            brCode: charge.qrPayload ?? null,
            qrExpiresAt: charge.expiresAt ? new Date(charge.expiresAt) : null,
          },
        });
      } catch (error) {
        // Provedor fora do ar: o fiel não fica sem Pix — volta ao estático da paróquia
        intent = await this.prisma.titheIntent.update({
          where: { id: intent.id },
          data: {
            method: 'PIX_STATIC',
            feeAmount: 0,
            chargedAmount: null,
            brCode: buildPixBrCode({
              key: parish.pixKey,
              merchantName: parish.pixMerchantName,
              merchantCity: parish.pixMerchantCity,
              amount,
              txid,
              description,
            }),
          },
        });
        await this.auditService.log({
          actor: this.auditActor(user),
          action: 'UPDATE',
          entity: 'TitheIntent',
          entityId: intent.id,
          metadata: { providerFallback: true, error: String((error as Error)?.message ?? error).slice(0, 300) },
        });
      }
    }
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'CREATE',
      entity: 'TitheIntent',
      entityId: intent.id,
      metadata: { amount, referenceMonth, kind, txid },
    });
    return this.presentIntent(intent, true);
  }

  private async presentIntent(intent: any, withQr = false) {
    const base = {
      id: intent.id,
      amount: intent.amount,
      referenceMonth: intent.referenceMonth,
      kind: intent.kind,
      status: intent.status,
      txid: intent.txid,
      brCode: intent.brCode,
      note: intent.note,
      amountPaid: intent.amountPaid ?? null,
      anonymous: !!intent.anonymous,
      contestNote: intent.contestNote ?? null,
      canContest: cancelledByTreasury(intent) && !intent.contestedAt,
      method: intent.method ?? 'PIX_STATIC',
      feeAmount: intent.feeAmount ?? 0,
      chargedAmount: intent.chargedAmount ?? null,
      qrExpiresAt: intent.qrExpiresAt ?? null,
      providerStatus: intent.providerStatus ?? null,
      declaredAt: intent.declaredAt,
      confirmedAt: intent.confirmedAt,
      createdAt: intent.createdAt,
    };
    if (!withQr || !intent.brCode) return base;
    const qrDataUrl = await QRCode.toDataURL(intent.brCode, { margin: 1, width: 360, errorCorrectionLevel: 'M' });
    return { ...base, qrDataUrl };
  }

  private async loadOwnIntent(id: string, user: CurrentUser) {
    const member = await this.resolveMember(user);
    const intent = await this.prisma.titheIntent.findFirst({ where: { id, memberId: member.id } });
    if (!intent) throw new NotFoundException('Pix não encontrado');
    return { member, intent };
  }

  async getIntent(id: string, user: CurrentUser) {
    const { intent } = await this.loadOwnIntent(id, user);
    if (intent.method === 'GATEWAY' && (intent.status === 'CREATED' || intent.status === 'DECLARED')) {
      // Sem depender do webhook: consulta o provedor e liquida se já foi pago
      const synced = await this.syncIntentWithProvider(intent.id);
      return this.presentIntent(synced, synced.status === 'CREATED' || synced.status === 'DECLARED');
    }
    if (intent.status === 'CREATED') {
      // A CHAVE embutida no código precisa ser a chave atual da paróquia (e o
      // dízimo precisa estar ativo); nome/cidade antigos não invalidam o Pix
      const parish = await this.prisma.parish.findUnique({ where: { id: intent.parishId }, select: this.parishConfigSelect });
      const usable = this.parishUsable(parish);
      const code = intent.brCode ?? '';
      const match = /BR\.GOV\.BCB\.PIX01(\d{2})/i.exec(code);
      const embeddedKey = match ? code.slice(match.index + match[0].length, match.index + match[0].length + Number(match[1])) : '';
      const sameKey = usable && embeddedKey.toLowerCase() === (parish!.pixKey ?? '').toLowerCase();
      if (!usable || !sameKey) {
        await this.prisma.titheIntent.updateMany({
          where: { id, status: 'CREATED' },
          data: { status: 'CANCELLED', note: usable ? KEY_CHANGED_NOTE : 'Dízimo pelo app desativado pela paróquia' },
        });
        throw new BadRequestException('Este Pix ficou desatualizado — gere um novo');
      }
    }
    return this.presentIntent(intent, intent.status === 'CREATED' || intent.status === 'DECLARED');
  }

  /** Fiel avisa que pagou — a tesouraria confere no extrato. */
  async declareIntent(id: string, user: CurrentUser) {
    const { member, intent } = await this.loadOwnIntent(id, user);
    if (intent.status !== 'CREATED') {
      throw new BadRequestException('Este Pix já foi informado ou encerrado');
    }
    if (intent.method === 'GATEWAY' && intent.providerRef) {
      // Cobrança do provedor: a confirmação é automática — consulta antes de
      // mandar a tesouraria procurar no extrato
      const synced = await this.syncIntentWithProvider(intent.id);
      if (synced.status !== 'CREATED') return this.presentIntent(synced);
    }
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const declaredToday = await this.prisma.titheIntent.count({
      where: { memberId: member.id, declaredAt: { gte: since } },
    });
    if (declaredToday >= MAX_DECLARES_PER_DAY) {
      throw new BadRequestException('Limite diário de Pix informados atingido — a tesouraria já foi avisada dos anteriores');
    }
    // Transição atômica: só sai de CREATED uma vez (dois toques não duplicam)
    const now = new Date();
    const moved = await this.prisma.titheIntent.updateMany({
      where: { id, status: 'CREATED' },
      data: { status: 'DECLARED', declaredAt: now },
    });
    if (moved.count !== 1) throw new BadRequestException('Este Pix já foi informado ou encerrado');
    const updated = await this.prisma.titheIntent.findUniqueOrThrow({ where: { id } });
    // Um aviso por membro a cada 10 min — vários Pix seguidos não viram spam
    const recentlyNotified = await this.prisma.titheIntent.count({
      where: {
        memberId: member.id,
        id: { not: id },
        declaredAt: { gte: new Date(now.getTime() - RENOTIFY_MINUTES * 60 * 1000) },
      },
    });
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'UPDATE',
      entity: 'TitheIntent',
      entityId: id,
      before: { status: 'CREATED' },
      after: { status: 'DECLARED' },
      metadata: { notifiedTreasury: recentlyNotified === 0 },
    });
    if (recentlyNotified > 0) return this.presentIntent(updated);
    // Tesouraria da comunidade/paróquia recebe para conciliar (best-effort)
    try {
      const recipients = await this.prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            ...(member.communityId ? [{ communityId: member.communityId, role: UserRole.COMMUNITY_COORDINATOR }] : []),
            { parishId: intent.parishId, role: UserRole.PARISH_ADMIN },
          ],
        },
        select: { id: true },
      });
      if (recipients.length) {
        const who = intent.anonymous ? 'Um fiel (oferta anônima)' : safeName(member.fullName);
        const money = intent.amount.toFixed(2).replace('.', ',');
        await this.notificationsService.notifyUsers(
          recipients.map((u) => u.id),
          NotificationType.TITHE,
          intent.method === 'GATEWAY' ? 'Pix do provedor aguardando confirmação' : 'Pix de dízimo a conferir',
          intent.method === 'GATEWAY'
            ? `${who} informou que pagou a cobrança do provedor (R$ ${money}, ${intent.referenceMonth}, ref ${intent.providerRef ?? intent.txid}). A confirmação chega sozinha pelo provedor — não procure no extrato. Se demorar, use “Consultar provedor” no Financeiro.`
            : `${who} informou um Pix de R$ ${money} (${intent.referenceMonth}, id ${intent.txid}). Confira no extrato e confirme no Financeiro.`,
          { kind: 'tithe-declared', intentId: id },
        );
      }
    } catch {
      // aviso é conveniência
    }
    return this.presentIntent(updated);
  }

  async cancelIntent(id: string, user: CurrentUser) {
    const { intent } = await this.loadOwnIntent(id, user);
    if (intent.status === 'CONFIRMED') {
      throw new BadRequestException('Contribuição já confirmada — fale com a tesouraria');
    }
    if (intent.status === 'CANCELLED') return this.presentIntent(intent);
    // Cobrança do provedor: o QR precisa parar de aceitar pagamento
    if (intent.method === 'GATEWAY' && intent.providerRef) await this.cancelProviderCharge(intent.parishId, intent.providerRef);
    const moved = await this.prisma.titheIntent.updateMany({
      where: { id, status: { in: ['CREATED', 'DECLARED'] } },
      data: { status: 'CANCELLED', note: 'Cancelado pelo fiel' },
    });
    if (moved.count !== 1) {
      throw new BadRequestException('Este Pix já foi confirmado pela tesouraria — fale com a secretaria');
    }
    const updated = await this.prisma.titheIntent.findUniqueOrThrow({ where: { id } });
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'UPDATE',
      entity: 'TitheIntent',
      entityId: id,
      before: { status: intent.status },
      after: { status: 'CANCELLED' },
    });
    return this.presentIntent(updated);
  }

  // ===== TESOURARIA =====

  private async financeScope(user: CurrentUser): Promise<{ communityIds?: string[]; parishIds?: string[] }> {
    if (user.role === UserRole.SYSTEM_ADMIN) return {};
    if (user.role === UserRole.DIOCESAN_ADMIN && user.dioceseId) {
      const parishes = await this.prisma.parish.findMany({ where: { dioceseId: user.dioceseId }, select: { id: true } });
      return { parishIds: parishes.map((p) => p.id) };
    }
    if (user.role === UserRole.PARISH_ADMIN && user.parishId) return { parishIds: [user.parishId] };
    const linked = (user.communities ?? []).filter((c) => c.isActive !== false).map((c) => c.communityId);
    return { communityIds: [...new Set([user.communityId, ...linked].filter((id): id is string => !!id))] };
  }

  async listIntents(user: CurrentUser, filters: { status?: string; communityId?: string; referenceMonth?: string }) {
    if (!this.canManage(user.role)) throw new ForbiddenException('Sem permissão financeira');
    const scope = await this.financeScope(user);
    const where: any = {};
    if (scope.communityIds) where.communityId = { in: scope.communityIds };
    if (scope.parishIds) where.parishId = { in: scope.parishIds };
    if (filters.communityId) {
      if (scope.communityIds && !scope.communityIds.includes(filters.communityId)) {
        throw new ForbiddenException('Comunidade fora do seu escopo');
      }
      where.communityId = filters.communityId;
    }
    const status = (filters.status ?? 'DECLARED').toUpperCase();
    if (status !== 'ALL') {
      where.status = ['CREATED', 'DECLARED', 'CONFIRMED', 'CANCELLED'].includes(status) ? status : 'DECLARED';
    }
    if (filters.referenceMonth) where.referenceMonth = filters.referenceMonth;
    const intents = await this.prisma.titheIntent.findMany({
      where: { ...where, member: { deletedAt: null } },
      include: { member: { select: { id: true, fullName: true, community: { select: { name: true } } } } },
      orderBy: [{ status: 'asc' }, { declaredAt: 'desc' }, { createdAt: 'desc' }],
      take: 300,
    });
    return intents.map((i) => this.presentForFinance(i));
  }

  private financeListInclude = {
    member: { select: { id: true, fullName: true, community: { select: { name: true } } } },
  } as const;

  private presentForFinance(i: any) {
    return {
      id: i.id,
      member: i.anonymous
        ? { id: null, fullName: 'Oferta anônima', community: i.member.community?.name ?? null }
        : { id: i.member.id, fullName: i.member.fullName, community: i.member.community?.name ?? null },
      amount: i.amount,
      amountPaid: i.amountPaid ?? null,
      anonymous: i.anonymous,
      referenceMonth: i.referenceMonth,
      kind: i.kind,
      status: i.status,
      txid: i.txid,
      note: i.note,
      canReopen: i.status === 'CANCELLED' && i.note !== SELF_CANCEL_NOTE,
      contestNote: i.contestNote ?? null,
      contestedAt: i.contestedAt ?? null,
      // Provedor (D3): a tesouraria precisa saber que a confirmação é automática
      method: i.method ?? 'PIX_STATIC',
      providerStatus: i.providerStatus ?? null,
      providerRef: i.providerRef ?? null,
      chargedAmount: i.chargedAmount ?? null,
      feeAmount: i.feeAmount ?? 0,
      declaredAt: i.declaredAt,
      confirmedAt: i.confirmedAt,
      createdAt: i.createdAt,
    };
  }

  /** Tesouraria consulta o provedor (cobrança dinâmica) sem esperar o webhook. */
  async syncIntentForFinance(id: string, user: CurrentUser) {
    const intent = await this.loadIntentForFinance(id, user);
    if (intent.method !== 'GATEWAY' || !intent.providerRef) {
      throw new BadRequestException('Este Pix não é do provedor — confira no extrato e confirme manualmente');
    }
    await this.syncIntentWithProvider(intent.id, { allowCancelled: true });
    const fresh = await this.prisma.titheIntent.findUniqueOrThrow({ where: { id }, include: this.financeListInclude });
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'UPDATE',
      entity: 'TitheIntent',
      entityId: id,
      metadata: { providerSync: true, status: fresh.status, providerStatus: fresh.providerStatus },
    });
    return this.presentForFinance(fresh);
  }

  private async loadIntentForFinance(id: string, user: CurrentUser) {
    if (!this.canManage(user.role)) throw new ForbiddenException('Sem permissão financeira');
    const intent = await this.prisma.titheIntent.findUnique({
      where: { id },
      include: {
        member: { select: { id: true, fullName: true, userId: true, communityId: true, deletedAt: true } },
        parish: { select: { id: true, name: true, dioceseId: true } },
      },
    });
    if (!intent || intent.member.deletedAt) throw new NotFoundException('Pix não encontrado');
    // Mesmo recorte da listagem, sobre a FOTOGRAFIA do Pix (comunidade/paróquia
    // que recebeu), não sobre onde o membro está hoje
    const scope = await this.financeScope(user);
    const inScope =
      user.role === UserRole.SYSTEM_ADMIN ||
      (scope.parishIds ? scope.parishIds.includes(intent.parishId) : false) ||
      (scope.communityIds ? !!intent.communityId && scope.communityIds.includes(intent.communityId) : false);
    if (!inScope) throw new ForbiddenException('Fora do seu escopo');
    return intent;
  }

  /** Tesouraria localizou o Pix no extrato: vira contribuição + lançamento no Financeiro. */
  async confirmIntent(
    id: string,
    user: CurrentUser,
    dto: { receiptNumber?: string; date?: string; amountPaid?: number; referenceMonth?: string },
  ) {
    const intent = await this.loadIntentForFinance(id, user);
    if (intent.status === 'CONFIRMED') throw new BadRequestException('Já confirmado');
    if (intent.status === 'CANCELLED') throw new BadRequestException('Este Pix foi cancelado');
    // Data do pagamento = dia em que caiu no extrato (date-only, 00:00Z), com
    // fallback no dia em que o fiel avisou — não o instante da conferência
    const toCivilDay = (value: Date) => {
      const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
      return new Date(`${day}T00:00:00.000Z`);
    };
    let paidAt: Date;
    if (dto.date) {
      const raw = String(dto.date).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new BadRequestException('Data inválida (use AAAA-MM-DD)');
      paidAt = new Date(`${raw}T00:00:00.000Z`);
      if (Number.isNaN(paidAt.getTime())) throw new BadRequestException('Data inválida');
      if (paidAt.getTime() > Date.now() + 24 * 60 * 60 * 1000) throw new BadRequestException('Data no futuro');
    } else {
      paidAt = toCivilDay(intent.declaredAt ?? new Date());
    }
    const isOffering = intent.kind === 'OFFERING';
    const category = isOffering ? 'Ofertas' : 'Dízimo';
    // Valor que caiu no extrato pode diferir do gerado (pagou a mais/a menos)
    let paidAmount = intent.amount;
    if (dto.amountPaid !== undefined && dto.amountPaid !== null) {
      const parsed = Math.round(Number(dto.amountPaid) * 100) / 100;
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > MAX_AMOUNT) {
        throw new BadRequestException('Valor pago inválido');
      }
      paidAmount = parsed;
    }
    // Tesouraria pode corrigir o mês de referência ao confirmar
    const paidMonth = dto.referenceMonth ? this.validateReferenceMonth(dto.referenceMonth) : intent.referenceMonth;
    const who = intent.anonymous ? 'Oferta anônima' : safeName(intent.member.fullName);

    const result = await this.settleIntent(intent, {
      paidAt,
      paidAmount,
      paidMonth,
      byUserId: user.id,
      receiptNumber: (dto.receiptNumber ?? '').trim() || undefined,
      source: 'treasury',
    });

    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'UPDATE',
      entity: 'TitheIntent',
      entityId: id,
      before: { status: intent.status },
      after: { status: 'CONFIRMED', contributionId: result.contributionId },
      metadata: { amount: intent.amount, amountPaid: paidAmount, referenceMonth: paidMonth, category },
    });
    if (intent.member.userId) {
      try {
        await this.notificationsService.notifyUsers(
          [intent.member.userId],
          NotificationType.TITHE,
          'Contribuição confirmada 🙏',
          `${category === 'Dízimo' ? 'Seu dízimo' : 'Sua oferta'} de R$ ${paidAmount.toFixed(2).replace('.', ',')} (${paidMonth}) foi registrado. Deus lhe pague por sustentar a missão da paróquia. 🙏`,
          { kind: 'tithe-confirmed', intentId: id },
        );
      } catch {
        // best-effort
      }
    }
    return this.presentIntent(result);
  }

  /** Tesouraria não localizou o Pix: encerra com motivo (o fiel recebe o aviso). */
  async rejectIntent(id: string, user: CurrentUser, rawReason?: string) {
    const intent = await this.loadIntentForFinance(id, user);
    if (intent.status === 'CONFIRMED') throw new BadRequestException('Já confirmado');
    const reason = (rawReason ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 300) || 'Pix não localizado no extrato';
    if (intent.method === 'GATEWAY' && intent.providerRef) await this.cancelProviderCharge(intent.parishId, intent.providerRef);
    const moved = await this.prisma.titheIntent.updateMany({
      where: { id, status: { in: ['CREATED', 'DECLARED'] } },
      data: { status: 'CANCELLED', note: reason },
    });
    if (moved.count !== 1) throw new BadRequestException('Este Pix já foi confirmado ou encerrado');
    const updated = await this.prisma.titheIntent.findUniqueOrThrow({ where: { id } });
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'UPDATE',
      entity: 'TitheIntent',
      entityId: id,
      before: { status: intent.status },
      after: { status: 'CANCELLED', note: reason },
    });
    if (intent.member.userId) {
      try {
        await this.notificationsService.notifyUsers(
          [intent.member.userId],
          NotificationType.TITHE,
          'Pix não localizado',
          `Não encontramos o Pix de R$ ${intent.amount.toFixed(2).replace('.', ',')} (id ${intent.txid}): ${reason}. Se você pagou, fale com a secretaria.`,
          { kind: 'tithe-rejected', intentId: id },
        );
      } catch {
        // best-effort
      }
    }
    return this.presentIntent(updated);
  }

  /**
   * Liquidação: transição atômica + lançamento financeiro (+ contribuição do
   * dizimista quando é dízimo). Usada pela tesouraria e pelo provedor.
   */
  private async settleIntent(
    intent: {
      id: string;
      txid: string;
      kind: string;
      anonymous: boolean;
      memberId: string;
      communityId: string | null;
      parishId: string;
      member: { fullName: string; communityId: string | null };
      parish: { dioceseId: string };
    },
    opts: {
      paidAt: Date;
      paidAmount: number;
      paidMonth: string;
      byUserId: string | null;
      receiptNumber?: string;
      source: 'treasury' | 'provider';
      /** Taxa real informada pelo provedor (valor − líquido) */
      feeAmount?: number | null;
    },
  ) {
    const isOffering = intent.kind === 'OFFERING';
    const category = isOffering ? 'Ofertas' : 'Dízimo';
    const who = intent.anonymous ? 'Oferta anônima' : safeName(intent.member.fullName);
    const id = intent.id;
    return this.prisma.$transaction(async (tx) => {
      // Transição atômica ANTES de criar qualquer registro: duas confirmações
      // simultâneas (tesouraria + webhook) não geram dois lançamentos
      // Dinheiro que chegou no provedor depois de um cancelamento local (fiel,
      // tesouraria ou expiração) é receita real: o provedor pode liquidar
      // também a partir de CANCELLED
      const from: Array<'CREATED' | 'DECLARED' | 'CANCELLED'> =
        opts.source === 'provider' ? ['CREATED', 'DECLARED', 'CANCELLED'] : ['CREATED', 'DECLARED'];
      const moved = await tx.titheIntent.updateMany({
        where: { id, status: { in: from } },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          confirmedByUserId: opts.byUserId,
          note: null,
          amountPaid: opts.paidAmount,
          referenceMonth: opts.paidMonth,
          ...(opts.source === 'provider'
            ? { providerStatus: 'paid', ...(opts.feeAmount != null ? { feeAmount: opts.feeAmount } : {}) }
            : {}),
        },
      });
      if (moved.count !== 1) throw new BadRequestException('Este Pix já foi confirmado ou encerrado');
      const origin = opts.source === 'provider' ? 'Pix provedor' : 'Pix app';
      const financial = await tx.financialTransaction.create({
        data: {
          type: TransactionType.INCOME,
          category,
          amount: opts.paidAmount,
          description: `${category} ${opts.paidMonth} — ${who} (${origin} ${intent.txid})`,
          date: opts.paidAt,
          communityId: intent.communityId ?? intent.member.communityId,
          parishId: intent.parishId,
          dioceseId: intent.parish.dioceseId,
        },
      });
      // Oferta avulsa é receita, não dízimo: não cria/reativa dizimista nem
      // entra na contagem mensal de contribuições
      if (isOffering) {
        return tx.titheIntent.findUniqueOrThrow({ where: { id } });
      }
      const tither = await tx.tither.upsert({
        where: { memberId: intent.memberId },
        create: { memberId: intent.memberId },
        update: { status: 'ACTIVE' },
      });
      const contribution = await tx.titheContribution.create({
        data: {
          titherId: tither.id,
          amount: opts.paidAmount,
          date: opts.paidAt,
          referenceMonth: opts.paidMonth,
          method: 'PIX',
          receiptNumber: opts.receiptNumber || intent.txid,
          financialTransactionId: financial.id,
        },
      });
      return tx.titheIntent.update({ where: { id }, data: { contributionId: contribution.id } });
    });
  }

  private plusDays(days: number): string {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(
      new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    );
  }

  /**
   * Cliente do membro no provedor (criado uma vez e guardado). O cache é por
   * paróquia + provedor + ambiente: cliente do sandbox não existe em produção,
   * nem numa conta de outra paróquia.
   */
  private async providerCustomerId(
    provider: PaymentProvider,
    member: { id: string; fullName: string; cpf: string | null; email: string | null; phone: string | null },
    parish: { id: string; providerEnv: string | null },
  ): Promise<string> {
    const providerEnv = parish.providerEnv === 'production' ? 'production' : 'sandbox';
    const key = { memberId: member.id, provider: provider.name, providerEnv, parishId: parish.id };
    const cached = await this.prisma.memberProviderCustomer.findUnique({
      where: { memberId_provider_providerEnv_parishId: key },
    });
    if (cached) return cached.providerCustomerId;
    const { providerCustomerId } = await provider.ensureCustomer({
      cpfCnpj: member.cpf,
      name: safeName(member.fullName),
      email: member.email,
      phone: member.phone,
      externalRef: member.id,
    });
    await this.prisma.memberProviderCustomer.upsert({
      where: { memberId_provider_providerEnv_parishId: key },
      create: { ...key, providerCustomerId },
      update: { providerCustomerId },
    });
    return providerCustomerId;
  }

  /** Cancela a cobrança no provedor (best-effort): o QR deixa de aceitar pagamento. */
  private async cancelProviderCharge(parishId: string, providerRef: string): Promise<boolean> {
    try {
      const parish = await this.parishFor(parishId);
      if (!parish || !this.paymentsService.hasProvider(parish)) return false;
      await this.paymentsService.forParish(parish).cancelCharge(providerRef);
      return true;
    } catch {
      return false;
    }
  }

  /** Dia civil (Brasília) do pagamento como instante estável (12:00 UTC): relatórios por dia/mês não escorregam com fuso. */
  private civilDate(value: string | null | undefined): Date {
    const text = String(value ?? '');
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return new Date(`${text}T12:00:00.000Z`);
    const parsed = value ? new Date(value) : new Date();
    const at = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
    return new Date(`${day}T12:00:00.000Z`);
  }

  /** Aviso à tesouraria (coordenação da comunidade + administração paroquial), best-effort. */
  private async notifyTreasury(
    intent: { communityId: string | null; parishId: string; member?: { communityId: string | null } | null },
    title: string,
    body: string,
    data: Record<string, unknown> = {},
  ) {
    try {
      const ids = await this.treasuryUserIds(intent.communityId ?? intent.member?.communityId ?? null, intent.parishId);
      if (ids.length) await this.notificationsService.notifyUsers(ids, NotificationType.TITHE, title, body, data);
    } catch {
      // aviso é conveniência
    }
  }

  private intentForSettlementInclude = {
    member: { select: { id: true, fullName: true, userId: true, communityId: true, deletedAt: true } },
    parish: { select: { id: true, name: true, dioceseId: true, ...{} } },
  } as const;

  /** Consulta o provedor e aplica o estado real (pago → liquida; expirado → encerra). */
  private async syncIntentWithProvider(intentId: string, opts: { allowCancelled?: boolean } = {}) {
    const intent = await this.prisma.titheIntent.findUniqueOrThrow({
      where: { id: intentId },
      include: this.intentForSettlementInclude,
    });
    if (intent.method !== 'GATEWAY' || !intent.providerRef) return intent;
    const syncable = intent.status === 'CREATED' || intent.status === 'DECLARED' || (opts.allowCancelled && intent.status === 'CANCELLED');
    if (!syncable) return intent;
    const parish = await this.prisma.parish.findUnique({ where: { id: intent.parishId }, select: this.parishConfigSelect });
    if (!parish || !this.paymentsService.hasProvider(parish)) return intent;
    let charge: ProviderCharge;
    try {
      charge = await this.paymentsService.forParish(parish).getCharge(intent.providerRef);
    } catch {
      return intent; // provedor fora do ar: mantém o estado local
    }
    return this.applyProviderCharge(intent, charge, parish);
  }

  /**
   * Aplica o status do provedor a um Pix (liquidação idempotente). Nunca
   * credita só pelo status: valor e vínculo da cobrança precisam bater.
   */
  private async applyProviderCharge(intent: any, charge: ProviderCharge, parish: { id: string; name: string }) {
    const reload = () =>
      this.prisma.titheIntent.findUniqueOrThrow({ where: { id: intent.id }, include: this.intentForSettlementInclude });
    const open = intent.status === 'CREATED' || intent.status === 'DECLARED';
    const money = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

    if (PAID_STATUSES.has(charge.status) && (open || intent.status === 'CANCELLED')) {
      const expected: number = intent.chargedAmount ?? intent.amount;
      const valueMismatch = typeof charge.value === 'number' && Math.abs(charge.value - expected) > 0.01;
      const refMismatch = !!charge.externalRef && charge.externalRef !== intent.id && charge.externalRef !== intent.scheduleId;
      if (valueMismatch || refMismatch) {
        if (intent.providerStatus !== 'mismatch') {
          await this.prisma.titheIntent.update({ where: { id: intent.id }, data: { providerStatus: 'mismatch' } });
          await this.auditService.log({
            actor: null,
            action: 'UPDATE',
            entity: 'TitheIntent',
            entityId: intent.id,
            metadata: { source: 'provider', mismatch: { expected, value: charge.value ?? null, externalRef: charge.externalRef ?? null } },
          });
          await this.notifyTreasury(
            intent,
            'Pix do provedor com divergência',
            `A cobrança ${charge.providerRef} consta paga no provedor${typeof charge.value === 'number' ? ` com ${money(charge.value)}` : ''}, mas o Pix ${intent.txid} esperava ${money(expected)}. Nada foi lançado — concilie manualmente no Financeiro.`,
            { kind: 'tithe-mismatch', intentId: intent.id },
          );
        }
        return reload();
      }
      const feeAmount =
        typeof charge.value === 'number' && typeof charge.netValue === 'number'
          ? Math.max(0, Math.round((charge.value - charge.netValue) * 100) / 100)
          : null;
      const late = intent.status === 'CANCELLED';
      try {
        await this.settleIntent(intent, {
          paidAt: this.civilDate(charge.paidAt),
          // O que vale como dízimo é o valor pedido; a taxa repassada não é contribuição
          paidAmount: intent.amount,
          paidMonth: intent.referenceMonth,
          byUserId: null,
          receiptNumber: charge.providerRef,
          source: 'provider',
          feeAmount,
        });
      } catch (error) {
        // Só a corrida "já confirmado" é benigna; outra falha volta ao webhook
        // para reprocessamento em vez de sumir
        if (error instanceof BadRequestException) return reload();
        throw error;
      }
      await this.auditService.log({
        actor: null,
        action: 'UPDATE',
        entity: 'TitheIntent',
        entityId: intent.id,
        before: { status: intent.status },
        after: { status: 'CONFIRMED', providerRef: charge.providerRef },
        metadata: { source: 'provider', providerStatus: charge.status, netValue: charge.netValue ?? null, latePayment: late },
      });
      if (intent.member.userId) {
        try {
          await this.notificationsService.notifyUsers(
            [intent.member.userId],
            NotificationType.TITHE,
            'Contribuição confirmada 🙏',
            `${intent.kind === 'OFFERING' ? 'Sua oferta' : 'Seu dízimo'} de ${money(intent.amount)} (${intent.referenceMonth}) foi recebido por ${safeName(parish.name)}. Deus lhe pague!`,
            { kind: 'tithe-confirmed', intentId: intent.id },
          );
        } catch {
          // best-effort
        }
      }
      if (late) {
        await this.notifyTreasury(
          intent,
          'Pix pago após o encerramento',
          `O Pix ${intent.txid} (${money(intent.amount)}, ${intent.referenceMonth}) foi pago no provedor depois de encerrado e foi registrado automaticamente.`,
          { kind: 'tithe-late-payment', intentId: intent.id },
        );
      }
      return reload();
    }
    if (charge.status === 'refunded' && intent.status === 'CONFIRMED') {
      await this.reverseSettlement(intent, parish);
      return reload();
    }
    if (charge.status === 'cancelled' && intent.status === 'CREATED') {
      await this.prisma.titheIntent.updateMany({
        where: { id: intent.id, status: 'CREATED' },
        data: { status: 'CANCELLED', note: 'Cobrança cancelada no provedor — gere outro Pix', providerStatus: charge.status },
      });
    } else if (charge.status !== intent.providerStatus) {
      // 'overdue' não encerra: no Asaas a cobrança vencida continua pagável
      await this.prisma.titheIntent.update({ where: { id: intent.id }, data: { providerStatus: charge.status } });
    }
    return reload();
  }

  /**
   * Estorno/chargeback depois da liquidação: a contribuição sai do histórico
   * do dizimista e o caixa recebe um lançamento de saída no mesmo valor.
   */
  private async reverseSettlement(intent: any, parish: { id: string; name: string }) {
    const amount: number = intent.amountPaid ?? intent.amount;
    const category = intent.kind === 'OFFERING' ? 'Ofertas' : 'Dízimo';
    const who = intent.anonymous ? 'Oferta anônima' : safeName(intent.member.fullName);
    const reversed = await this.prisma.$transaction(async (tx) => {
      const moved = await tx.titheIntent.updateMany({
        where: { id: intent.id, status: 'CONFIRMED' },
        data: { status: 'CANCELLED', note: 'Estornado pelo provedor', providerStatus: 'refunded', contributionId: null },
      });
      if (moved.count !== 1) return false;
      if (intent.contributionId) await tx.titheContribution.deleteMany({ where: { id: intent.contributionId } });
      await tx.financialTransaction.create({
        data: {
          type: TransactionType.EXPENSE,
          category,
          amount,
          description: `Estorno ${category} ${intent.referenceMonth} — ${who} (Pix provedor ${intent.txid})`,
          date: this.civilDate(null),
          communityId: intent.communityId ?? intent.member.communityId,
          parishId: intent.parishId,
          dioceseId: intent.parish.dioceseId,
        },
      });
      return true;
    });
    if (!reversed) return;
    await this.auditService.log({
      actor: null,
      action: 'UPDATE',
      entity: 'TitheIntent',
      entityId: intent.id,
      before: { status: 'CONFIRMED' },
      after: { status: 'CANCELLED', providerStatus: 'refunded' },
      metadata: { source: 'provider', reversedAmount: amount },
    });
    const money = `R$ ${amount.toFixed(2).replace('.', ',')}`;
    if (intent.member.userId) {
      try {
        await this.notificationsService.notifyUsers(
          [intent.member.userId],
          NotificationType.TITHE,
          'Contribuição estornada',
          `O pagamento de ${money} (${intent.referenceMonth}) foi estornado pelo provedor e deixou de constar no seu histórico. Se não reconhece o estorno, fale com a secretaria.`,
          { kind: 'tithe-refunded', intentId: intent.id },
        );
      } catch {
        // best-effort
      }
    }
    await this.notifyTreasury(
      intent,
      'Pix estornado pelo provedor',
      `O Pix ${intent.txid} (${money}, ${intent.referenceMonth}) foi estornado no provedor: a contribuição foi removida e um lançamento de saída foi criado no Financeiro.`,
      { kind: 'tithe-refunded', intentId: intent.id },
    );
  }

  // ===== WEBHOOK DO PROVEDOR =====

  async handleWebhook(providerName: string, parishId: string, request: WebhookRequest) {
    const parish = await this.prisma.parish.findUnique({ where: { id: parishId }, select: this.parishConfigSelect });
    if (!parish || !this.paymentsService.hasProvider(parish) || parish.paymentProvider !== providerName) {
      throw new NotFoundException('Webhook não configurado para esta paróquia');
    }
    // Autentica ANTES de decifrar a chave de API: chamada anônima não paga a criptografia
    const verifier = this.paymentsService.forParish(parish, { verifyOnly: true });
    if (!parish.providerWebhookToken || !verifier.verifyWebhook(request, parish.providerWebhookToken)) {
      throw new ForbiddenException('Assinatura do webhook inválida');
    }
    const provider = this.paymentsService.forParish(parish);
    const event = provider.parseWebhook(request.body);
    // Idempotência: o mesmo evento pode chegar mais de uma vez
    const existing = await this.prisma.paymentWebhookEvent.findUnique({
      where: { provider_eventId: { provider: provider.name, eventId: event.eventId } },
    });
    if (existing?.processedAt) return { received: true, duplicate: true };
    let record = existing;
    if (!record) {
      try {
        record = await this.prisma.paymentWebhookEvent.create({
          data: {
            provider: provider.name,
            eventId: event.eventId,
            parishId,
            eventName: event.eventName,
            // Evento que não é cobrança nem autorização: só o nome (o corpo não tem uso)
            payload: (event.kind === 'other' ? { event: event.eventName } : (request.body ?? {})) as any,
          },
        });
      } catch (error) {
        // Duas entregas simultâneas do mesmo evento: a outra já registrou
        if ((error as any)?.code === 'P2002') return { received: true, duplicate: true };
        throw error;
      }
    }
    return this.runWebhookEvent(provider, parish, event, record.id);
  }

  private async runWebhookEvent(
    provider: PaymentProvider,
    parish: { id: string; name: string; paymentProvider: string | null },
    event: ReturnType<PaymentProvider['parseWebhook']>,
    recordId: string,
  ) {
    try {
      await this.processWebhookEvent(provider, parish, event);
      await this.prisma.paymentWebhookEvent.update({
        where: { id: recordId },
        data: { processedAt: new Date(), error: null, attempts: { increment: 1 } },
      });
      return { received: true, processed: true };
    } catch (error) {
      await this.prisma.paymentWebhookEvent.update({
        where: { id: recordId },
        data: { error: String((error as Error)?.message ?? error).slice(0, 500), attempts: { increment: 1 } },
      });
      // 200 mesmo assim: o evento ficou gravado e o job reprocessa (retentativa
      // do provedor não corrige um erro nosso; 15 falhas pausam a fila do Asaas)
      return { received: true, processed: false };
    }
  }

  /**
   * Reprocessa eventos que falharam (job a cada 10 min): até WEBHOOK_MAX_ATTEMPTS
   * em 3 dias — cobre Pix criado depois do evento, provedor fora do ar, etc.
   */
  async reprocessFailedWebhooks(now: Date): Promise<number> {
    const events = await this.prisma.paymentWebhookEvent.findMany({
      where: {
        processedAt: null,
        receivedAt: { gte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
        // Falhou, ou ficou "em voo" por um reinício no meio do processamento
        OR: [{ error: { not: null } }, { receivedAt: { lt: new Date(now.getTime() - 10 * 60 * 1000) } }],
      },
      orderBy: { receivedAt: 'asc' },
      take: 100,
    });
    let done = 0;
    for (const record of events) {
      if (record.attempts >= WEBHOOK_MAX_ATTEMPTS) {
        await this.prisma.paymentWebhookEvent.update({
          where: { id: record.id },
          data: { processedAt: now, error: `Desistido após ${record.attempts} tentativas: ${record.error ?? ''}`.slice(0, 500) },
        });
        continue;
      }
      const parish = await this.prisma.parish.findUnique({ where: { id: record.parishId }, select: this.parishConfigSelect });
      if (!parish || !this.paymentsService.hasProvider(parish) || parish.paymentProvider !== record.provider) {
        await this.prisma.paymentWebhookEvent.update({
          where: { id: record.id },
          data: { processedAt: now, error: 'Provedor da paróquia mudou — evento descartado' },
        });
        continue;
      }
      let provider: PaymentProvider;
      try {
        provider = this.paymentsService.forParish(parish);
      } catch {
        continue;
      }
      const result = await this.runWebhookEvent(provider, parish, provider.parseWebhook(record.payload), record.id);
      if (result.processed) done += 1;
    }
    return done;
  }

  private async processWebhookEvent(
    provider: PaymentProvider,
    parish: { id: string; name: string; paymentProvider: string | null },
    event: ReturnType<PaymentProvider['parseWebhook']>,
  ) {
    if (event.kind === 'authorization') {
      if (!event.authorizationRef) throw new Error(`Evento ${event.eventName} sem referência da autorização`);
      const schedule = await this.prisma.titheSchedule.findFirst({
        where: { parishId: parish.id, providerAuthorizationRef: event.authorizationRef },
        include: { member: { select: { id: true, userId: true, communityId: true, fullName: true } } },
      });
      // Fica pendente para reprocessar: a autorização pode estar sendo gravada agora
      if (!schedule) throw new Error(`Autorização ${event.authorizationRef} sem dízimo automático correspondente`);
      let status = String(event.authorizationStatus ?? '').toUpperCase();
      let subscriptionRef = event.subscriptionRef ?? schedule.providerSubscriptionRef ?? null;
      // Nunca confia só no evento: reconsulta a autorização (traz também a
      // assinatura que o provedor cria na ativação — sem ela as cobranças
      // mensais não casam com o dízimo automático)
      if (provider.getAuthorization) {
        try {
          const real = await provider.getAuthorization(event.authorizationRef);
          const realStatus = real.status.toUpperCase();
          if (realStatus) status = realStatus;
          subscriptionRef = real.subscriptionRef ?? subscriptionRef;
        } catch {
          // provedor fora do ar: segue com o evento
        }
      }
      const next =
        status === 'ACTIVE' || status === 'ACTIVATED'
          ? 'ACTIVE'
          : status === 'CANCELLED'
            ? 'CANCELLED'
            : status === 'EXPIRED' || status === 'REFUSED' || status === 'FAILED'
              ? 'FAILED'
              : null;
      if (next === 'ACTIVE') {
        if (schedule.status !== 'ACTIVE' || subscriptionRef !== schedule.providerSubscriptionRef) {
          await this.prisma.titheSchedule.update({
            where: { id: schedule.id },
            data: { status: 'ACTIVE', providerSubscriptionRef: subscriptionRef, lastError: null, authorizationPayload: null },
          });
        }
        if (schedule.status !== 'ACTIVE' && schedule.member.userId) {
          try {
            await this.notificationsService.notifyUsers(
              [schedule.member.userId],
              NotificationType.TITHE,
              'Dízimo automático ativado ✅',
              'Seu banco autorizou o Pix Automático — o dízimo será debitado todo mês, sem você precisar fazer nada.',
              { kind: 'tithe-schedule', scheduleId: schedule.id },
            );
          } catch {
            // best-effort
          }
        }
        // O QR imediato pagou o 1º mês: vira o dízimo do mês (idempotente)
        if (event.paymentId) await this.intentFromScheduleCharge(provider, parish, schedule, event.paymentId);
        return;
      }
      if (next === 'CANCELLED' || next === 'FAILED') {
        if (schedule.status === 'CANCELLED' || schedule.status === 'FAILED') return;
        await this.prisma.titheSchedule.update({
          where: { id: schedule.id },
          data: {
            status: next,
            lastError: next === 'FAILED' ? `Autorização ${status.toLowerCase()} no banco` : 'Autorização cancelada no banco',
            authorizationPayload: null,
            ...(next === 'CANCELLED' ? { cancelledAt: new Date() } : {}),
          },
        });
        if (schedule.member.userId) {
          try {
            await this.notificationsService.notifyUsers(
              [schedule.member.userId],
              NotificationType.TITHE,
              next === 'CANCELLED' ? 'Dízimo automático cancelado' : 'Dízimo automático não ativado',
              next === 'CANCELLED'
                ? 'A autorização do Pix Automático foi cancelada no seu banco. Quando quiser, ative de novo pelo app.'
                : 'A autorização não foi concluída no seu banco. Você pode tentar de novo pelo app.',
              { kind: 'tithe-schedule', scheduleId: schedule.id },
            );
          } catch {
            // best-effort
          }
        }
      }
      return;
    }
    if (event.kind !== 'charge') return;
    if (!event.providerRef) throw new Error(`Evento ${event.eventName} sem referência da cobrança`);

    const intent = await this.prisma.titheIntent.findFirst({
      where: { parishId: parish.id, OR: [{ providerRef: event.providerRef }, ...(event.externalRef ? [{ id: event.externalRef }] : [])] },
      include: this.intentForSettlementInclude,
    });
    // Nunca confia só no evento: reconsulta a cobrança antes de creditar
    const charge = await provider.getCharge(event.providerRef);
    if (intent) {
      await this.applyProviderCharge(intent, charge, parish);
      return;
    }
    // Cobrança gerada por uma recorrência (assinatura/Pix Automático): cria o Pix do mês
    const subscriptionRef = event.subscriptionRef ?? charge.subscriptionRef ?? null;
    const scheduleInclude = { member: { select: { id: true, userId: true, communityId: true, fullName: true } } } as const;
    let schedule = subscriptionRef
      ? await this.prisma.titheSchedule.findFirst({ where: { parishId: parish.id, providerSubscriptionRef: subscriptionRef }, include: scheduleInclude })
      : null;
    // A assinatura do Pix Automático nasce no provedor e pode chegar aqui antes
    // de ser conhecida: casa pelo cliente (um dízimo automático aberto por membro)
    if (!schedule && subscriptionRef && charge.customerRef) {
      const customer = await this.prisma.memberProviderCustomer.findFirst({
        where: { parishId: parish.id, provider: provider.name, providerCustomerId: charge.customerRef },
        select: { memberId: true },
      });
      if (customer) {
        schedule = await this.prisma.titheSchedule.findFirst({
          where: {
            parishId: parish.id,
            memberId: customer.memberId,
            mode: 'PIX_AUTOMATIC',
            status: { in: ['ACTIVE', 'PENDING_AUTHORIZATION'] },
            providerSubscriptionRef: null,
          },
          include: scheduleInclude,
        });
        if (schedule) {
          // Cobrança da assinatura = autorização ativa no banco
          await this.prisma.titheSchedule.update({
            where: { id: schedule.id },
            data: { providerSubscriptionRef: subscriptionRef, status: 'ACTIVE', authorizationPayload: null, lastError: null },
          });
        }
      }
    }
    // Fica pendente para reprocessar: o Pix pode estar sendo criado neste instante
    if (!schedule) throw new Error(`Cobrança ${event.providerRef} sem Pix correspondente`);
    await this.intentFromScheduleCharge(provider, parish, schedule, event.providerRef, charge);
  }

  /** Pix do mês gerado por uma recorrência (idempotente por providerRef). */
  private async intentFromScheduleCharge(
    provider: PaymentProvider,
    parish: { id: string; name: string },
    schedule: {
      id: string;
      memberId: string;
      amount: number;
      mode: string;
      nextDueDate: Date | null;
      member: { id: string; userId: string | null; communityId: string | null; fullName: string };
    },
    providerRef: string,
    known?: ProviderCharge,
  ) {
    const charge = known ?? (await provider.getCharge(providerRef));
    let intent = await this.prisma.titheIntent.findFirst({ where: { providerRef }, include: this.intentForSettlementInclude });
    if (!intent) {
      let qrPayload = charge.qrPayload ?? null;
      let qrExpiresAt = charge.expiresAt ?? null;
      if (!qrPayload && !PAID_STATUSES.has(charge.status) && provider instanceof AsaasProvider) {
        try {
          const qr = await provider.getChargeQr(providerRef);
          qrPayload = qr.payload;
          qrExpiresAt = qr.expiresAt;
        } catch {
          qrPayload = null;
        }
      }
      const referenceMonth = (charge.dueDate ?? charge.paidAt ?? new Date().toISOString()).slice(0, 7);
      const chargedAmount = charge.value ?? schedule.amount;
      try {
        intent = await this.prisma.titheIntent.create({
          data: {
            memberId: schedule.memberId,
            parishId: parish.id,
            communityId: schedule.member.communityId,
            // O dízimo é o valor escolhido; taxa repassada fica em chargedAmount/feeAmount
            amount: schedule.amount,
            referenceMonth,
            kind: 'TITHE',
            method: 'GATEWAY',
            txid: this.newTxid(),
            brCode: qrPayload,
            providerRef,
            providerStatus: charge.status,
            qrExpiresAt: qrExpiresAt ? new Date(qrExpiresAt) : null,
            chargedAmount,
            feeAmount: Math.max(0, Math.round((chargedAmount - schedule.amount) * 100) / 100),
            scheduleId: schedule.id,
          },
          include: this.intentForSettlementInclude,
        });
      } catch (error) {
        // Corrida entre dois eventos da mesma cobrança: o outro criou
        if ((error as any)?.code !== 'P2002') throw error;
        intent = await this.prisma.titheIntent.findFirstOrThrow({ where: { providerRef }, include: this.intentForSettlementInclude });
      }
      await this.prisma.titheSchedule.update({
        where: { id: schedule.id },
        data: { nextDueDate: charge.dueDate ? new Date(`${charge.dueDate}T00:00:00.000Z`) : schedule.nextDueDate },
      });
      if (schedule.mode === 'PIX_SUBSCRIPTION' && schedule.member.userId && !PAID_STATUSES.has(charge.status)) {
        try {
          await this.notificationsService.notifyUsers(
            [schedule.member.userId],
            NotificationType.TITHE,
            'Seu dízimo do mês está pronto 💛',
            `O Pix de ${referenceMonth} (R$ ${chargedAmount.toFixed(2).replace('.', ',')}) já está disponível no app — é só pagar.`,
            { kind: 'tithe-charge', intentId: intent.id },
          );
        } catch {
          // best-effort
        }
      }
    }
    await this.applyProviderCharge(intent, charge, parish);
  }

  // ===== RECORRÊNCIA (dízimo automático) =====

  async createSchedule(user: CurrentUser, dto: { amount: number; dayOfMonth: number; mode?: string }) {
    const member = await this.resolveMember(user);
    const parish = await this.parishFor(member.community.parishId);
    if (!parish?.titheEnabled || !this.paymentsService.hasProvider(parish)) {
      throw new BadRequestException('Sua paróquia ainda não ativou o dízimo automático');
    }
    if (parish.paymentProvider !== 'ASAAS') throw new BadRequestException('Dízimo automático disponível apenas com o provedor Asaas');
    if (!member.cpf) throw new BadRequestException('Cadastre seu CPF no perfil para ativar o dízimo automático');
    const amount = Math.round(Number(dto.amount) * 100) / 100;
    if (!Number.isFinite(amount) || amount < 1 || amount > MAX_AMOUNT) throw new BadRequestException('Valor inválido');
    const day = Number(dto.dayOfMonth);
    if (!Number.isInteger(day) || day < 1 || day > 28) throw new BadRequestException('Escolha um dia entre 1 e 28');
    const mode = dto.mode === 'PIX_SUBSCRIPTION' ? 'PIX_SUBSCRIPTION' : 'PIX_AUTOMATIC';
    // Autorização antiga com QR vencido não bloqueia uma nova tentativa
    await this.failExpiredAuthorizations(new Date(), member.id);
    const open = await this.prisma.titheSchedule.findFirst({
      where: { memberId: member.id, status: { in: ['PENDING_AUTHORIZATION', 'ACTIVE', 'PAUSED'] } },
    });
    if (open) throw new BadRequestException('Você já tem um dízimo automático — cancele-o antes de criar outro');

    // Primeira cobrança: próximo dia escolhido (pelo menos amanhã)
    const now = new Date();
    const brt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const [y, m, d] = brt.split('-').map(Number);
    let start = new Date(Date.UTC(y, m - 1, day));
    if (day <= d) start = new Date(Date.UTC(y, m, day));
    if (mode === 'PIX_AUTOMATIC') {
      // O QR imediato já paga o mês corrente: a 1ª cobrança automática só no
      // mês seguinte (senão o fiel pagaria duas vezes no mesmo mês)
      const today = new Date(Date.UTC(y, m - 1, d));
      if ((start.getTime() - today.getTime()) / 86400000 < 20) {
        start = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, day));
      }
    }
    const startDate = start.toISOString().slice(0, 10);
    // Política de taxa vale também para a recorrência
    const { charged } = this.computeFee(parish, amount);

    let schedule;
    try {
      schedule = await this.prisma.titheSchedule.create({
        data: { memberId: member.id, parishId: parish.id, amount, dayOfMonth: day, mode, provider: parish.paymentProvider!, nextDueDate: start },
      });
    } catch (error) {
      // Índice parcial (um dízimo automático aberto por membro): dois toques simultâneos
      if ((error as any)?.code === 'P2002') throw new BadRequestException('Você já tem um dízimo automático — cancele-o antes de criar outro');
      throw error;
    }
    try {
      const provider = this.paymentsService.forParish(parish);
      const customerId = await this.providerCustomerId(provider, member, parish);
      const sub = await provider.createSubscription({
        providerCustomerId: customerId,
        amount: charged,
        cycle: 'MONTHLY',
        startDate,
        description: `Dizimo mensal - ${normalizeAscii(parish.name, 20)}`,
        externalRef: schedule.id,
        mode: mode === 'PIX_AUTOMATIC' ? 'pix_automatic' : 'pix_subscription',
      });
      const updated = await this.prisma.titheSchedule.update({
        where: { id: schedule.id },
        data: {
          providerSubscriptionRef: sub.providerRef ?? null,
          providerAuthorizationRef: sub.authorizationRef ?? null,
          authorizationPayload: sub.qrPayload ?? null,
          authorizationExpires: sub.expiresAt ? new Date(sub.expiresAt) : null,
          status: mode === 'PIX_AUTOMATIC' ? 'PENDING_AUTHORIZATION' : 'ACTIVE',
          nextDueDate: sub.nextDueDate ? new Date(`${sub.nextDueDate}T00:00:00.000Z`) : start,
        },
      });
      await this.auditService.log({
        actor: this.auditActor(user),
        action: 'CREATE',
        entity: 'TitheSchedule',
        entityId: schedule.id,
        metadata: { amount, charged, dayOfMonth: day, mode, provider: parish.paymentProvider },
      });
      const qrDataUrl = updated.authorizationPayload
        ? await QRCode.toDataURL(updated.authorizationPayload, { margin: 1, width: 360, errorCorrectionLevel: 'M' })
        : null;
      return { ...this.presentSchedule(updated), qrDataUrl };
    } catch (error) {
      await this.prisma.titheSchedule.update({
        where: { id: schedule.id },
        data: { status: 'FAILED', lastError: String((error as Error)?.message ?? error).slice(0, 300) },
      });
      throw new BadRequestException(`Não foi possível ativar o dízimo automático: ${String((error as Error)?.message ?? error).slice(0, 200)}`);
    }
  }

  private presentSchedule(schedule: any) {
    // QR de autorização vencido: o app não pode mostrá-lo como válido
    const authorizationExpired =
      schedule.status === 'PENDING_AUTHORIZATION' &&
      !!schedule.authorizationExpires &&
      new Date(schedule.authorizationExpires).getTime() < Date.now();
    return {
      id: schedule.id,
      amount: schedule.amount,
      dayOfMonth: schedule.dayOfMonth,
      mode: schedule.mode,
      status: schedule.status,
      nextDueDate: schedule.nextDueDate,
      authorizationPayload: schedule.status === 'PENDING_AUTHORIZATION' && !authorizationExpired ? schedule.authorizationPayload : null,
      authorizationExpires: schedule.authorizationExpires,
      authorizationExpired,
      lastError: schedule.lastError,
    };
  }

  async getMySchedule(user: CurrentUser) {
    const member = await this.resolveMember(user);
    const schedule = await this.prisma.titheSchedule.findFirst({
      where: { memberId: member.id, status: { in: ['PENDING_AUTHORIZATION', 'ACTIVE', 'PAUSED'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (!schedule) return null;
    const presented = this.presentSchedule(schedule);
    const qrDataUrl = presented.authorizationPayload
      ? await QRCode.toDataURL(presented.authorizationPayload, { margin: 1, width: 360, errorCorrectionLevel: 'M' })
      : null;
    return { ...presented, qrDataUrl };
  }

  /**
   * Autorização de Pix Automático não concluída no prazo do QR: confere no
   * provedor (pode ter ativado sem o webhook chegar) e, se não, encerra como
   * FAILED para o fiel poder tentar de novo.
   */
  async failExpiredAuthorizations(now: Date, memberId?: string): Promise<number> {
    const stale = await this.prisma.titheSchedule.findMany({
      where: { status: 'PENDING_AUTHORIZATION', authorizationExpires: { lt: now }, ...(memberId ? { memberId } : {}) },
      include: { member: { select: { userId: true } } },
      take: 200,
    });
    let failed = 0;
    for (const schedule of stale) {
      let provider: PaymentProvider | null = null;
      try {
        const parish = await this.parishFor(schedule.parishId);
        provider = parish && this.paymentsService.hasProvider(parish) ? this.paymentsService.forParish(parish) : null;
      } catch {
        provider = null;
      }
      if (provider?.getAuthorization && schedule.providerAuthorizationRef) {
        try {
          const real = await provider.getAuthorization(schedule.providerAuthorizationRef);
          const status = real.status.toUpperCase();
          if (status === 'ACTIVE' || status === 'ACTIVATED') {
            await this.prisma.titheSchedule.update({
              where: { id: schedule.id },
              data: { status: 'ACTIVE', providerSubscriptionRef: real.subscriptionRef ?? schedule.providerSubscriptionRef, authorizationPayload: null, lastError: null },
            });
            continue;
          }
        } catch {
          // provedor fora do ar: encerra pelo prazo mesmo
        }
      }
      const moved = await this.prisma.titheSchedule.updateMany({
        where: { id: schedule.id, status: 'PENDING_AUTHORIZATION' },
        data: { status: 'FAILED', lastError: 'Autorização não concluída no prazo — ative de novo quando quiser', authorizationPayload: null },
      });
      if (moved.count !== 1) continue;
      failed += 1;
      if (provider && (schedule.providerAuthorizationRef || schedule.providerSubscriptionRef)) {
        try {
          await provider.cancelSubscription({ providerRef: schedule.providerSubscriptionRef, authorizationRef: schedule.providerAuthorizationRef });
        } catch {
          // best-effort: a autorização vencida não gera débito
        }
      }
      if (schedule.member.userId) {
        try {
          await this.notificationsService.notifyUsers(
            [schedule.member.userId],
            NotificationType.TITHE,
            'Dízimo automático não ativado',
            'A autorização no banco não foi concluída no prazo. Você pode ativar de novo pelo app quando quiser.',
            { kind: 'tithe-schedule', scheduleId: schedule.id },
          );
        } catch {
          // best-effort
        }
      }
    }
    return failed;
  }

  async cancelSchedule(user: CurrentUser, id: string) {
    const member = await this.resolveMember(user);
    const schedule = await this.prisma.titheSchedule.findFirst({ where: { id, memberId: member.id } });
    if (!schedule) throw new NotFoundException('Dízimo automático não encontrado');
    if (schedule.status === 'CANCELLED') return this.presentSchedule(schedule);
    const parish = await this.parishFor(schedule.parishId);
    const hasRefs = !!(schedule.providerSubscriptionRef || schedule.providerAuthorizationRef);
    const authorizationExpired =
      schedule.status === 'PENDING_AUTHORIZATION' && !!schedule.authorizationExpires && schedule.authorizationExpires.getTime() < Date.now();
    const providerUsable = !!parish && this.paymentsService.hasProvider(parish) && parish.paymentProvider === schedule.provider;
    if (hasRefs && providerUsable) {
      try {
        await this.paymentsService.forParish(parish!).cancelSubscription({
          providerRef: schedule.providerSubscriptionRef,
          authorizationRef: schedule.providerAuthorizationRef,
        });
      } catch (error) {
        // Autorização vencida ou já falha: não há nada vivo no banco para cancelar
        if (!authorizationExpired && schedule.status !== 'FAILED') {
          throw new BadRequestException(`O provedor não conseguiu cancelar agora: ${String((error as Error)?.message ?? error).slice(0, 200)}`);
        }
      }
    } else if (hasRefs && schedule.status === 'ACTIVE') {
      // Nunca "cancela" só no Parish um débito que continua vivo no banco do fiel
      throw new BadRequestException('A paróquia trocou o provedor de pagamento e este cancelamento precisa ser feito por ela — procure a secretaria');
    }
    const updated = await this.prisma.titheSchedule.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), authorizationPayload: null },
    });
    await this.auditService.log({ actor: this.auditActor(user), action: 'UPDATE', entity: 'TitheSchedule', entityId: id, before: { status: schedule.status }, after: { status: 'CANCELLED' } });
    return this.presentSchedule(updated);
  }

  /** Regenera o token do webhook (administração). */
  async rotateWebhookToken(user: CurrentUser, parishId?: string) {
    const target = this.resolveParishId(user, parishId);
    await this.assertParishAdmin(user, target);
    const parish = await this.parishFor(target);
    if (this.paymentsService.webhookSecretManagedByAdmin(parish?.paymentProvider)) {
      throw new BadRequestException('No Mercado Pago a assinatura secreta é gerada no painel do MP — cole-a na configuração do provedor');
    }
    const token = this.paymentsService.newWebhookToken();
    await this.prisma.parish.update({ where: { id: target }, data: { providerWebhookToken: token } });
    await this.auditService.log({ actor: this.auditActor(user), action: 'UPDATE', entity: 'ParishTitheConfig', entityId: target, metadata: { webhookTokenRotated: true } });
    // Token novo vai direto para o provedor: sem janela de 403 na fila de eventos
    const providerSetup = await this.runProviderSetup(target, user);
    return { providerWebhookToken: token, providerSetup };
  }

  /**
   * Pix do provedor vencidos (QR expirado) ou esquecidos há dias: confere se
   * não foi pago, cancela a cobrança no provedor e encerra. Cobranças de
   * recorrência não expiram aqui (o provedor é quem manda nelas).
   */
  async expireGatewayIntents(now: Date, cutoff: Date): Promise<number> {
    const stale = await this.prisma.titheIntent.findMany({
      where: {
        status: 'CREATED',
        method: 'GATEWAY',
        scheduleId: null,
        // Pelo QR ou pelos 7 dias — o QR do Asaas dura um ano, e Pix esquecido não fica na fila
        OR: [{ qrExpiresAt: { lt: now } }, { createdAt: { lt: cutoff } }],
      },
      select: { id: true, parishId: true, providerRef: true },
      take: 500,
    });
    let count = 0;
    for (const intent of stale) {
      if (intent.providerRef) {
        // Antes de encerrar, confere se não foi pago (o webhook pode ter falhado)
        const synced = await this.syncIntentWithProvider(intent.id);
        if (synced.status !== 'CREATED') continue;
        await this.cancelProviderCharge(intent.parishId, intent.providerRef);
      }
      const moved = await this.prisma.titheIntent.updateMany({
        where: { id: intent.id, status: 'CREATED' },
        data: { status: 'CANCELLED', note: 'Pix expirado — gere outro quando for contribuir' },
      });
      count += moved.count;
    }
    return count;
  }

  /** Tesouraria reabre um Pix que ela mesma encerrou (achou no extrato depois). */
  async reopenIntent(id: string, user: CurrentUser) {
    const intent = await this.loadIntentForFinance(id, user);
    // Qualquer encerramento que não seja do próprio fiel pode ser reaberto pela
    // tesouraria (não localizado, expirado, chave trocada): o código pago no
    // banco continua válido e precisa de um caminho de conciliação
    if (intent.status !== 'CANCELLED' || intent.note === SELF_CANCEL_NOTE) {
      throw new BadRequestException('Só é possível reabrir um Pix encerrado pela tesouraria ou pelo sistema');
    }
    const moved = await this.prisma.titheIntent.updateMany({
      where: { id, status: 'CANCELLED' },
      data: { status: 'DECLARED', note: null, declaredAt: intent.declaredAt ?? new Date() },
    });
    if (moved.count !== 1) throw new BadRequestException('Este Pix não pode ser reaberto');
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'UPDATE',
      entity: 'TitheIntent',
      entityId: id,
      before: { status: 'CANCELLED', note: intent.note },
      after: { status: 'DECLARED' },
    });
    return this.presentIntent(await this.prisma.titheIntent.findUniqueOrThrow({ where: { id } }));
  }

  /** Fiel contesta um "não localizado": volta à fila com o recado dele. */
  async contestIntent(id: string, user: CurrentUser, rawNote?: string) {
    const { member, intent } = await this.loadOwnIntent(id, user);
    if (!cancelledByTreasury(intent) || intent.contestedAt) {
      throw new BadRequestException('Este Pix não pode ser contestado — fale com a secretaria');
    }
    const note = (rawNote ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 300);
    if (note.length < 5) throw new BadRequestException('Conte onde e quando você pagou (data, banco, valor)');
    const now = new Date();
    const moved = await this.prisma.titheIntent.updateMany({
      where: { id, status: 'CANCELLED' },
      data: { status: 'DECLARED', declaredAt: now, contestNote: note, contestedAt: now, note: null },
    });
    if (moved.count !== 1) throw new BadRequestException('Este Pix não pode ser contestado');
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'UPDATE',
      entity: 'TitheIntent',
      entityId: id,
      before: { status: 'CANCELLED', note: intent.note },
      after: { status: 'DECLARED', contestNote: note },
    });
    try {
      const recipients = await this.treasuryUserIds(member.communityId, intent.parishId);
      if (recipients.length) {
        await this.notificationsService.notifyUsers(
          recipients,
          NotificationType.TITHE,
          'Pix contestado pelo fiel',
          `${intent.anonymous ? 'Um fiel (oferta anônima)' : safeName(member.fullName)} diz que pagou o Pix de R$ ${intent.amount.toFixed(2).replace('.', ',')} (id ${intent.txid}): "${note}". Confira de novo no Financeiro.`,
          { kind: 'tithe-contested', intentId: id },
        );
      }
    } catch {
      // aviso é conveniência
    }
    return this.presentIntent(await this.prisma.titheIntent.findUniqueOrThrow({ where: { id } }));
  }

  /** Preferências do fiel: dia do lembrete mensal (1..28) ou null para desligar. */
  async updatePreferences(user: CurrentUser, dto: { reminderDay?: number | null }) {
    const member = await this.resolveMember(user);
    let reminderDay: number | null = null;
    if (dto.reminderDay !== undefined && dto.reminderDay !== null) {
      const day = Number(dto.reminderDay);
      if (!Number.isInteger(day) || day < 1 || day > 28) throw new BadRequestException('Escolha um dia entre 1 e 28');
      reminderDay = day;
    }
    await this.prisma.member.update({ where: { id: member.id }, data: { titheReminderDay: reminderDay } });
    return { reminderDay };
  }

  /** Nº de dizimista estável (gera se não houver) — vira o txid do QR fixo. */
  private async ensureRegistration(memberId: string): Promise<string> {
    const tither = await this.prisma.tither.upsert({
      where: { memberId },
      create: { memberId },
      update: {},
      select: { id: true, registrationNumber: true },
    });
    const clean = (tither.registrationNumber ?? '').replace(/[^A-Za-z0-9]/g, '');
    if (clean) return clean.slice(0, 20);
    const generated = `D${memberId.slice(-7).toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
    await this.prisma.tither.update({ where: { id: tither.id }, data: { registrationNumber: generated } });
    return generated;
  }

  /** QR fixo do dizimista: sem valor, txid = nº do dizimista (etiqueta/envelope/carnê). */
  async getPersistentQr(user: CurrentUser) {
    const member = await this.resolveMember(user);
    const parish = await this.parishFor(member.community.parishId);
    if (!this.parishUsable(parish)) throw new BadRequestException('Sua paróquia ainda não ativou o dízimo pelo app');
    // Identificador estável e imutável (derivado do membro): não cria dizimista
    // nem mexe no nº de registro que a secretaria controla
    const tither = await this.prisma.tither.findUnique({ where: { memberId: member.id }, select: { registrationNumber: true } });
    const registration = tither?.registrationNumber ?? null;
    const txid = `DZ${member.id.slice(-12).toUpperCase().replace(/[^A-Z0-9]/g, '')}`.slice(0, 25);
    const brCode = buildPixBrCode({
      key: parish!.pixKey!,
      merchantName: parish!.pixMerchantName!,
      merchantCity: parish!.pixMerchantCity!,
      txid,
      description: 'Dizimo',
    });
    const qrDataUrl = await QRCode.toDataURL(brCode, { margin: 1, width: 360, errorCorrectionLevel: 'M' });
    return { registrationNumber: registration, txid, brCode, qrDataUrl, parish: parish!.name, merchantName: parish!.pixMerchantName };
  }

  async persistentQrPdf(user: CurrentUser): Promise<Buffer> {
    const member = await this.resolveMember(user);
    const qr = await this.getPersistentQr(user);
    const parish = await this.prisma.parish.findUnique({ where: { id: member.community.parishId }, select: { name: true, logoUrl: true } });
    const png = await QRCode.toBuffer(qr.brCode, { margin: 1, width: 600, errorCorrectionLevel: 'M' });
    return this.pdfService.renderCertificateDocument({
      logo: await this.fetchLogo(parish?.logoUrl),
      title: 'Meu Pix do Dízimo',
      organization: parish?.name ?? 'Paróquia',
      subtitle: qr.registrationNumber ? `Dizimista nº ${qr.registrationNumber}` : `Identificador ${qr.txid}`,
      orientation: 'portrait',
      pages: [
        {
          recipientName: safeName(member.fullName),
          bodyParagraphs: [
            'Aponte a câmera do app do seu banco para o código ou use o "Pix copia e cola".',
            'Informe o valor no banco — este QR não tem valor fixo.',
            `Identificador do seu dízimo: ${qr.txid}`,
          ],
          qrImage: png,
        },
      ],
      footer: `Recebedor: ${qr.merchantName} · Emitido pelo Parish em ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
    });
  }

  /** QR institucional da paróquia (banner, telão, bancos): sem valor, txid PAROQUIA. */
  async getInstitutionalQr(user: CurrentUser, parishId?: string) {
    const target = this.resolveParishId(user, parishId);
    await this.assertParishAdmin(user, target);
    const parish = await this.parishFor(target);
    if (!this.parishUsable(parish)) throw new BadRequestException('Ative o dízimo pelo app (chave, nome e cidade) antes de gerar o QR');
    const brCode = buildPixBrCode({
      key: parish!.pixKey!,
      merchantName: parish!.pixMerchantName!,
      merchantCity: parish!.pixMerchantCity!,
      txid: 'PAROQUIA',
      description: 'Dizimo e ofertas',
    });
    const qrDataUrl = await QRCode.toDataURL(brCode, { margin: 1, width: 360, errorCorrectionLevel: 'M' });
    return { brCode, qrDataUrl, parish: parish!.name, pixKey: parish!.pixKey, merchantName: parish!.pixMerchantName };
  }

  async institutionalQrPdf(user: CurrentUser, parishId?: string): Promise<Buffer> {
    const qr = await this.getInstitutionalQr(user, parishId);
    const target = this.resolveParishId(user, parishId);
    const parish = await this.prisma.parish.findUnique({ where: { id: target }, select: { name: true, logoUrl: true } });
    const png = await QRCode.toBuffer(qr.brCode, { margin: 1, width: 800, errorCorrectionLevel: 'M' });
    return this.pdfService.renderCertificateDocument({
      logo: await this.fetchLogo(parish?.logoUrl),
      title: 'Dízimo e Ofertas',
      organization: parish?.name ?? 'Paróquia',
      subtitle: 'Contribua pelo Pix',
      orientation: 'portrait',
      pages: [
        {
          recipientName: 'Aponte a câmera do seu banco',
          bodyParagraphs: [
            'Escolha o valor no seu banco. Confira o nome do recebedor antes de confirmar:',
            `${qr.merchantName} · chave ${qr.pixKey}`,
            'Prefere pelo app Parish? Lá o Pix já sai com valor e identificação do dizimista.',
          ],
          qrImage: png,
        },
      ],
      footer: `Emitido pelo Parish em ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
    });
  }

  private async fetchLogo(logoUrl?: string | null): Promise<Buffer | null> {
    if (!logoUrl || !/^https:\/\//i.test(logoUrl)) return null;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(logoUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (response.ok && /image\/(png|jpe?g)/i.test(response.headers.get('content-type') ?? '')) {
        const bytes = Buffer.from(await response.arrayBuffer());
        return bytes.length <= 2 * 1024 * 1024 ? bytes : null;
      }
    } catch {
      // sem logo
    }
    return null;
  }

  /** Relatório do mês por comunidade × tipo × meio (app e manual), no escopo da tesouraria. */
  async monthlyReport(user: CurrentUser, filters: { referenceMonth?: string; communityId?: string }) {
    if (!this.canManage(user.role)) throw new ForbiddenException('Sem permissão financeira');
    const referenceMonth = filters.referenceMonth && /^\d{4}-\d{2}$/.test(filters.referenceMonth) ? filters.referenceMonth : this.currentMonth();
    const scope = await this.financeScope(user);
    const communityWhere: any = {};
    if (scope.communityIds) communityWhere.id = { in: scope.communityIds };
    if (scope.parishIds) communityWhere.parishId = { in: scope.parishIds };
    if (filters.communityId) {
      if (scope.communityIds && !scope.communityIds.includes(filters.communityId)) throw new ForbiddenException('Comunidade fora do seu escopo');
      communityWhere.id = filters.communityId;
    }
    const communities = await this.prisma.community.findMany({ where: communityWhere, select: { id: true, name: true } });
    const communityIds = communities.map((c) => c.id);
    const nameOf = new Map(communities.map((c) => [c.id, c.name]));
    if (!communityIds.length) return { referenceMonth, rows: [], totals: { count: 0, total: 0 } };

    const [intents, manual] = await Promise.all([
      this.prisma.titheIntent.findMany({
        where: { status: 'CONFIRMED', referenceMonth, communityId: { in: communityIds } },
        select: { communityId: true, kind: true, amount: true, amountPaid: true },
      }),
      // Contribuições lançadas à mão (envelope/dinheiro/Pix no balcão) — sem intent
      this.prisma.titheContribution.findMany({
        where: { referenceMonth, intent: null, tither: { member: { communityId: { in: communityIds }, deletedAt: null } } },
        select: { amount: true, method: true, tither: { select: { member: { select: { communityId: true } } } } },
      }),
    ]);
    const agg = new Map<string, { communityId: string; community: string; kind: string; method: string; count: number; total: number }>();
    const add = (communityId: string, kind: string, method: string, amount: number) => {
      const key = `${communityId}|${kind}|${method}`;
      const row = agg.get(key) ?? { communityId, community: nameOf.get(communityId) ?? '—', kind, method, count: 0, total: 0 };
      row.count += 1;
      row.total = Math.round((row.total + amount) * 100) / 100;
      agg.set(key, row);
    };
    for (const i of intents) add(i.communityId ?? '', i.kind === 'OFFERING' ? 'Ofertas' : 'Dízimo', 'Pix pelo app', i.amountPaid ?? i.amount);
    for (const c of manual) add(c.tither.member.communityId ?? '', 'Dízimo', c.method || 'manual', c.amount);
    const rows = [...agg.values()].sort((a, b) => a.community.localeCompare(b.community) || a.kind.localeCompare(b.kind));
    const totals = rows.reduce((acc, r) => ({ count: acc.count + r.count, total: Math.round((acc.total + r.total) * 100) / 100 }), { count: 0, total: 0 });
    return { referenceMonth, rows, totals };
  }

  async monthlyReportCsv(user: CurrentUser, filters: { referenceMonth?: string; communityId?: string }): Promise<string> {
    const report = await this.monthlyReport(user, filters);
    const cell = (v: unknown) => {
      let t = String(v ?? '').replace(/[\r\n]+/g, ' ');
      if (/^[=+\-@\t]/.test(t)) t = `'${t}`;
      return `"${t.replace(/"/g, '""')}"`;
    };
    const lines = ['mes;comunidade;tipo;meio;quantidade;total'];
    for (const r of report.rows) {
      lines.push([report.referenceMonth, r.community, r.kind, r.method, r.count, r.total.toFixed(2).replace('.', ',')].map(cell).join(';'));
    }
    lines.push([report.referenceMonth, 'TOTAL', '', '', report.totals.count, report.totals.total.toFixed(2).replace('.', ',')].map(cell).join(';'));
    return '\uFEFF' + lines.join('\r\n');
  }

  /** Extrato anual do dizimista (todos os meios) — o próprio fiel ou a tesouraria. */
  async annualStatement(user: CurrentUser, year: number, memberId?: string): Promise<Buffer> {
    let targetMemberId: string;
    if (memberId) {
      if (!this.canManage(user.role)) throw new ForbiddenException('Sem permissão financeira');
      const canManage = user.role === UserRole.SYSTEM_ADMIN || (await this.hierarchyService.canManageMember(user.id, memberId));
      if (!canManage) throw new ForbiddenException('Fora do seu escopo');
      targetMemberId = memberId;
    } else {
      targetMemberId = (await this.resolveMember(user)).id;
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new BadRequestException('Ano inválido');
    const member = await this.prisma.member.findFirst({
      where: { id: targetMemberId, deletedAt: null },
      select: { fullName: true, community: { select: { name: true, parish: { select: { name: true, logoUrl: true } } } }, tither: { select: { registrationNumber: true, contributions: { where: { referenceMonth: { startsWith: `${year}-` } }, orderBy: { referenceMonth: 'asc' } } } } },
    });
    if (!member) throw new NotFoundException('Membro não encontrado');
    // Pela tesouraria, ofertas anônimas ficam fora (o txid permitiria desanonimizar)
    const offerings = await this.prisma.titheIntent.findMany({
      where: {
        memberId: targetMemberId,
        kind: 'OFFERING',
        status: 'CONFIRMED',
        referenceMonth: { startsWith: `${year}-` },
        ...(memberId ? { anonymous: false } : {}),
      },
      orderBy: { confirmedAt: 'asc' },
      select: { referenceMonth: true, amount: true, amountPaid: true, confirmedAt: true, txid: true },
    });
    const day = (v: Date | null | undefined) => (v ? v.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—');
    const money = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
    const rows: string[][] = [];
    let total = 0;
    for (const c of member.tither?.contributions ?? []) {
      rows.push([c.referenceMonth, 'Dízimo', money(c.amount), c.method, day(c.date), c.receiptNumber ?? '']);
      total += c.amount;
    }
    for (const o of offerings) {
      const v = o.amountPaid ?? o.amount;
      rows.push([o.referenceMonth, 'Oferta', money(v), 'Pix pelo app', day(o.confirmedAt), o.txid]);
      total += v;
    }
    rows.sort((a, b) => a[0].localeCompare(b[0]));
    if (!rows.length) rows.push(['—', 'Nenhuma contribuição registrada em ' + year, '', '', '', '']);
    rows.push(['', 'TOTAL', money(Math.round(total * 100) / 100), '', '', '']);
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'EXPORT',
      entity: 'TitheStatement',
      entityId: targetMemberId,
      metadata: { year, rows: rows.length },
    });
    return this.pdfService.renderTableDocument({
      logo: await this.fetchLogo(member.community.parish.logoUrl),
      title: `Extrato de Contribuições ${year}`,
      subtitle: `${safeName(member.fullName)}${member.tither?.registrationNumber ? ` · dizimista nº ${member.tither.registrationNumber}` : ''} · ${member.community.name} — ${member.community.parish.name}`,
      sections: [{ columns: ['Referência', 'Tipo', 'Valor', 'Meio', 'Data', 'Comprovante'], widths: [1.1, 1, 1, 1.2, 1, 1.6], rows }],
      signatureLines: ['Tesouraria Paroquial'],
      footer: `${memberId ? 'Ofertas anônimas não constam. ' : ''}Declaração para fins de acompanhamento pessoal — dízimo não é dedutível no Imposto de Renda. Emitido pelo Parish.`,
    });
  }

  /** Comprovante em PDF (fiel dono ou tesouraria). */
  async receipt(id: string, user: CurrentUser): Promise<Buffer> {
    const intent = await this.prisma.titheIntent.findUnique({
      where: { id },
      include: {
        member: { select: { id: true, fullName: true, userId: true, deletedAt: true } },
        parish: { select: { name: true, logoUrl: true } },
      },
    });
    if (!intent || intent.member.deletedAt) throw new NotFoundException('Pix não encontrado');
    const isOwner = intent.member.userId === user.id;
    if (!isOwner) await this.loadIntentForFinance(id, user);
    // Oferta anônima: o comprovante identifica o doador — só ele pode emitir
    if (intent.anonymous && !isOwner) throw new ForbiddenException('Comprovante de oferta anônima só para quem doou');
    if (intent.status !== 'CONFIRMED') throw new BadRequestException('Comprovante só após a confirmação da tesouraria');
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'EXPORT',
      entity: 'TitheIntent',
      entityId: id,
      metadata: { receipt: true },
    });
    const money = `R$ ${(intent.amountPaid ?? intent.amount).toFixed(2).replace('.', ',')}`;
    const day = (value: Date | null) =>
      value ? value.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—';
    let logo: Buffer | null = null;
    if (intent.parish.logoUrl && /^https:\/\//i.test(intent.parish.logoUrl)) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const response = await fetch(intent.parish.logoUrl, { signal: controller.signal });
        clearTimeout(timer);
        if (response.ok && /image\/(png|jpe?g)/i.test(response.headers.get('content-type') ?? '')) {
          logo = Buffer.from(await response.arrayBuffer());
        }
      } catch {
        logo = null;
      }
    }
    return this.pdfService.renderCertificateDocument({
      logo,
      title: 'Comprovante de Contribuição',
      organization: intent.parish.name,
      subtitle: intent.kind === 'TITHE' ? 'Dízimo' : 'Oferta',
      orientation: 'portrait',
      pages: [
        {
          recipientName: safeName(intent.member.fullName),
          bodyParagraphs: [
            `Contribuiu com ${money}`,
            `referente a ${intent.referenceMonth},`,
            `via Pix (id ${intent.txid}), confirmado em ${day(intent.confirmedAt)}.`,
            'Deus lhe pague pela generosidade.',
          ],
          signatureLines: ['Tesouraria Paroquial'],
        },
      ],
      footer: `Emitido pelo Parish em ${day(new Date())}`,
    });
  }
}
