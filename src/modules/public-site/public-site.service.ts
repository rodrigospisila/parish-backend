import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { FREE_FEATURES, PAID_FEATURES } from '../plans/plan-rules';

/** Dias de teste grátis oferecidos na reivindicação/contratação (contrato C1/C3). */
export const PUBLIC_TRIAL_DAYS = 30;

/** Versão curta do app: 1.2 ou 1.2.3 (sem sufixo de pré-lançamento). */
export const SHORT_SEMVER = /^\d{1,3}\.\d{1,3}(?:\.\d{1,4})?$/;

export interface PublicTier {
  key: string;
  name: string;
  description: string | null;
  maxMembers: number | null;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
}

export interface PublicPlans {
  trialDays: number;
  tiers: PublicTier[];
  /** Chaves do que é grátis para sempre e do que entra no plano pago (plan-rules) */
  freeFeatures: string[];
  paidFeatures: string[];
}

export interface PublicAppConfig {
  /** Abaixo desta versão o app mostra "Atualize o Parish" (bloqueante). null = sem bloqueio */
  minSupportedVersion: string | null;
  /** Versão mais nova publicada (aviso não bloqueante). null = sem aviso */
  latestVersion: string | null;
  iosUrl: string | null;
  androidUrl: string | null;
  /** Canais de suporte (env SUPPORT_EMAIL/SUPPORT_WHATSAPP) — o app troca sem build nova */
  supportEmail: string | null;
  supportWhatsapp: string | null;
}

/**
 * Dados públicos do site de vendas e do app (sem login): faixas de preço
 * ATIVAS (`PlanTier`) e a configuração de versão do app (envs APP_*).
 */
@Injectable()
export class PublicSiteService {
  private readonly logger = new Logger(PublicSiteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** GET /public/plans — só faixas ativas, na ordem do painel (sortOrder, depois preço). */
  async plans(): Promise<PublicPlans> {
    const tiers = await this.prisma.planTier.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { monthlyPriceCents: 'asc' }, { key: 'asc' }],
      select: {
        key: true,
        name: true,
        description: true,
        maxMembers: true,
        monthlyPriceCents: true,
        yearlyPriceCents: true,
      },
    });
    return {
      trialDays: PUBLIC_TRIAL_DAYS,
      tiers: tiers.map((t) => ({
        key: t.key,
        name: t.name,
        description: t.description ?? null,
        maxMembers: t.maxMembers ?? null,
        monthlyPriceCents: t.monthlyPriceCents,
        yearlyPriceCents: t.yearlyPriceCents,
      })),
      freeFeatures: [...FREE_FEATURES],
      paidFeatures: [...PAID_FEATURES],
    };
  }

  /**
   * GET /public/app-config — envs APP_MIN_VERSION, APP_LATEST_VERSION,
   * APP_IOS_URL, APP_ANDROID_URL. Sem env (ou valor fora do formato) = null,
   * ou seja, sem bloqueio nem aviso. A comparação de versões é do app.
   */
  appConfig(): PublicAppConfig {
    return {
      minSupportedVersion: this.version('APP_MIN_VERSION'),
      latestVersion: this.version('APP_LATEST_VERSION'),
      iosUrl: this.httpsUrl('APP_IOS_URL'),
      androidUrl: this.httpsUrl('APP_ANDROID_URL'),
      supportEmail: this.text('SUPPORT_EMAIL', /^[^\s@]+@[^\s@]+\.[^\s@]+$/),
      supportWhatsapp: this.text('SUPPORT_WHATSAPP', /^\+?\d{10,15}$/, (v) => v.replace(/[\s().-]/g, '')),
    };
  }

  private raw(name: string): string {
    return String(this.config.get<string>(name) ?? '').trim();
  }

  private version(name: string): string | null {
    const value = this.raw(name);
    if (!value) return null;
    if (!SHORT_SEMVER.test(value)) {
      this.logger.warn(`${name}="${value.slice(0, 40)}" fora do formato 1.2.3 — ignorado`);
      return null;
    }
    return value;
  }

  private httpsUrl(name: string): string | null {
    const value = this.raw(name);
    if (!value) return null;
    return /^https:\/\/\S+$/i.test(value) ? value : null;
  }

  private text(name: string, format: RegExp, normalize: (v: string) => string = (v) => v): string | null {
    const value = normalize(this.raw(name));
    return value && format.test(value) ? value : null;
  }
}
