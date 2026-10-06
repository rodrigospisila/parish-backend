import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { LoginMeta, SessionSecurityService } from './session-security.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ConsentType, UserRole } from '@prisma/client';
import { MembersService } from '../members/members.service';
import { OtpService } from './otp.service';
import { AuditService } from '../../common/audit.service';
import { ConsentsService } from '../consents/consents.service';
import { CURRENT_POLICY_VERSION } from '../consents/consent.constants';
import { MessagingService } from '../messaging/messaging.service';
import { emailInsensitive, normalizeEmail, pickEmailMatch } from './email-lookup';
import { pickCoordinatedPastoralIds } from '../pastorals/coordination-scope';
import { isTermsAcceptanceRequired, TERMS_VERSION } from '../users/terms.constants';

/** Resposta única para conta inexistente, celular inválido e senha errada (não revela qual foi). */
export const INVALID_CREDENTIALS_MESSAGE = 'E-mail, celular ou senha incorretos';
/** Só aparece para quem acertou a senha — antes disso a conta desativada é indistinguível. */
export const ACCOUNT_DISABLED_MESSAGE = 'Conta desativada — procure a secretaria da sua paróquia';

/** Única leitura do hash da senha no login (omitido globalmente no PrismaService). */
const LOGIN_OMIT = { password: false } as const;

/**
 * Hash descartável: quando a conta não existe, a senha é comparada com ele
 * mesmo assim, para o tempo de resposta não denunciar quais contas existem.
 */
let timingHash: Promise<string> | null = null;
const dummyHash = () => (timingHash ??= bcrypt.hash('parish-login-sem-conta', 10));

/**
 * O banco guarda só o SHA-256 do refresh token: um dump/backup não vira
 * sessão. Linhas antigas (JWT em claro) seguem aceitas até expirarem.
 */
export const hashRefreshToken = (token: string) => createHash('sha256').update(token).digest('hex');

/**
 * Janela em que reapresentar um refresh token recém-trocado é tratado como
 * concorrência legítima (duas abas do painel, nova tentativa de rede) e não
 * como roubo: responde 401 sem derrubar a sessão.
 */
export const REFRESH_REUSE_GRACE_MS = 60_000;

/** Opções de sessão na emissão de tokens. */
interface SessionOptions {
  /** Família de rotação (um aparelho). Ausente = sessão nova. */
  sessionId?: string;
  /** Instante (s) do último login com senha; null = desconhecido (token antigo). Ausente = agora. */
  authTime?: number | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly membersService: MembersService,
    private readonly otpService: OtpService,
    private readonly auditService: AuditService,
    private readonly consentsService: ConsentsService,
    private readonly security: SessionSecurityService,
    private readonly messagingService: MessagingService,
  ) {}

  /** Papéis cujo escopo administrativo não muda pelo autoatendimento (igual ao users.service). */
  private static readonly SELF_SERVICE_COMMUNITY_ROLES: UserRole[] = [UserRole.FAITHFUL, UserRole.VOLUNTEER];

  /**
   * Usuário devolvido no login/cadastro/2FA. Mesma regra do presentSelf
   * (GET /users/me): o gestor sem comunidade de ESCOPO (PARISH_ADMIN,
   * DIOCESAN_ADMIN...) recebe em `communityId`/`community` a comunidade de FÉ
   * (vínculo principal) só para exibição — sem isso o app reabria o assistente
   * de comunidade a cada login. `scopeCommunityId` traz o valor gravado (o
   * escopo real continua vindo do banco no JwtStrategy).
   */
  private async mapUserResponse(user: any) {
    const pastoralMemberships = user.member?.pastoralMemberships || [];

    const response: Record<string, any> = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      forcePasswordChange: user.forcePasswordChange,
      // Aviso de aceite dos termos vigentes (app e painel abrem o aviso por isto)
      termsAcceptanceRequired: isTermsAcceptanceRequired(user),
      termsVersion: TERMS_VERSION,
      twoFactorEnabled: !!user.twoFactorEnabled,
      dioceseId: user.dioceseId,
      parishId: user.parishId,
      communityId: user.communityId,
      scopeCommunityId: user.communityId ?? null,
      createdAt: user.createdAt,
      pastoralIds: pastoralMemberships
        .map((membership: any) => membership.communityPastoralId)
        .filter((id: string | null | undefined): id is string => !!id),
      // COORDENAÇÃO (papel ativo ou coordenação vigente) — o painel libera a gestão da pastoral por isto
      coordinatedPastoralIds: pickCoordinatedPastoralIds(pastoralMemberships, user.member?.pastoralCoordinations ?? []),
      // Vínculos de sub-grupo (só pastoralGroupId) não têm communityPastoral — ignorar aqui
      pastorals: pastoralMemberships
        .filter((membership: any) => membership.communityPastoral)
        .map((membership: any) => ({
          id: membership.communityPastoral.id,
          name: membership.communityPastoral.globalPastoral.name,
          communityId: membership.communityPastoral.communityId,
          role: membership.role,
        })),
    };

    if (!user.communityId && user.role && !AuthService.SELF_SERVICE_COMMUNITY_ROLES.includes(user.role)) {
      const links: any[] = user.communities ?? [];
      const faithLink = links.find((link) => link.isPrimary) ?? links[0] ?? null;
      const faithCommunityId: string | null = faithLink?.communityId ?? user.member?.communityId ?? null;
      if (faithCommunityId) {
        response.communityId = faithCommunityId;
        response.community =
          faithLink?.community ??
          (await this.prisma.community.findUnique({ where: { id: faithCommunityId }, select: { id: true, name: true } }));
      }
    }

    return response;
  }

  async register(registerDto: RegisterDto) {
    const { password, name, role, communityId, consentGiven, verifiedPhoneToken } = registerDto;
    // Gravado sempre em minúsculas daqui para frente (o login ignora a caixa)
    const email = normalizeEmail(registerDto.email);

    // SEGURANÇA: o registro público NUNCA atribui papel elevado.
    // Qualquer papel acima de FAITHFUL só pode ser criado por um administrador
    // via POST /users (que valida hierarquia e escopo). Sem esta trava, qualquer
    // pessoa poderia se auto-registrar como SYSTEM_ADMIN.
    if (role && role !== UserRole.FAITHFUL) {
      throw new ForbiddenException(
        'O registro público permite apenas o perfil FAITHFUL. Perfis administrativos são criados pela gestão da paróquia.',
      );
    }

    // Celular só VERIFICADO (token do OTP, já em E.164). O campo `phone` cru
    // é ignorado: gravá-lo ocuparia o número de outra pessoa sem SMS e
    // bloquearia o cadastro e o login dela (M7). Telefone sem verificação só
    // pela gestão, em POST /users.
    const phone = verifiedPhoneToken ? this.otpService.decodeVerifiedPhoneToken(verifiedPhoneToken) : null;

    // Verificar se o usuário já existe — sem diferença de caixa: "Maria@x.com"
    // antigo impede criar "maria@x.com" (seriam duas contas no mesmo login)
    const existingUser = await this.prisma.user.findFirst({
      where: { email: emailInsensitive(email) },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Email já cadastrado');
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Aceite de termos/política: registrado quando o titular consente no cadastro
    const acceptedTerms = consentGiven === true;
    const now = new Date();

    // Usar transação para criar User e Member juntos
    // Escopo GEOGRÁFICO derivado da comunidade: sem isso o perfil mostra
    // "Paróquia: Não informada" e o seletor de comunidade abre vazio
    const communityScope = communityId
      ? await this.prisma.community.findUnique({
          where: { id: communityId },
          select: { parishId: true, parish: { select: { dioceseId: true } } },
        })
      : null;

    const result = await this.prisma.$transaction(async (tx) => {
      // Criar usuário — sempre FAITHFUL e sem escopo administrativo de GESTÃO
      // (o papel continua FAITHFUL; parishId/dioceseId aqui são localização)
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          phone,
          role: UserRole.FAITHFUL,
          communityId,
          parishId: communityScope?.parishId ?? null,
          dioceseId: communityScope?.parish?.dioceseId ?? null,
          acceptedTermsAt: acceptedTerms ? now : null,
          acceptedTermsVersion: acceptedTerms ? CURRENT_POLICY_VERSION : null,
        },
        include: {
          member: {
            include: {
              pastoralMemberships: {
                where: { isActive: true },
                include: {
                  communityPastoral: {
                    select: {
                      id: true,
                      communityId: true,
                      globalPastoral: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Garante o perfil de Member (somente para roles elegiveis e quando ha comunidade
      // definida) - mesma regra usada em UsersService, centralizada em MembersService.
      if (communityId) {
        // Telefone VERIFICADO por SMS + membro pré-cadastrado sem conta com o
        // mesmo telefone (ex.: "Responsável – <catequizando>" importado da
        // planilha): a conta nova ADOTA esse membro em vez de criar outro —
        // assume o nome real e herda os dependentes/matrículas vinculados.
        // Só no caminho verificado: telefone digitado à mão não adota ninguém.
        let adoptedMemberId: string | undefined = user.member?.id;
        if (!adoptedMemberId && verifiedPhoneToken && phone) {
          // Prefere o membro da comunidade escolhida; senão, o mais antigo com o telefone
          const orphan =
            (await tx.member.findFirst({
              where: { phone, userId: null, deletedAt: null, communityId },
              orderBy: { createdAt: 'asc' },
              select: { id: true },
            })) ??
            (await tx.member.findFirst({
              where: { phone, userId: null, deletedAt: null },
              orderBy: { createdAt: 'asc' },
              select: { id: true },
            })) ??
            (await this.findOrphanByPhoneDigits(tx, phone, communityId));
          if (orphan) {
            await tx.member.update({
              where: { id: orphan.id },
              // O telefone verificado (E.164) substitui o digitado no painel
              data: { userId: user.id, fullName: name, email, phone },
            });
            adoptedMemberId = orphan.id;
          }
        }

        const member = await this.membersService.ensureProfileForUser(
          tx,
          {
            userId: user.id,
            role: UserRole.FAITHFUL,
            name,
            email,
            phone,
            communityId,
            consentGiven,
          },
          adoptedMemberId,
        );

        // Registra o consentimento granular de tratamento de dados (LGPD)
        if (member && acceptedTerms) {
          await this.consentsService.grantInitialConsents(tx, member.id, user.id, [
            ConsentType.DATA_PROCESSING,
          ]);
        }
      }

      return user;
    });

    await this.auditService.log({
      actor: { id: result.id, email: result.email, role: result.role },
      action: 'REGISTER',
      entity: 'User',
      entityId: result.id,
      metadata: { communityId: result.communityId },
    });

    // Gerar tokens
    const tokens = await this.generateTokens(
      result.id,
      result.email,
      result.role,
      result.dioceseId ?? undefined,
      result.parishId ?? undefined,
      result.communityId ?? undefined
    );

    return {
      user: await this.mapUserResponse(result),
      ...tokens,
    };
  }

  /**
   * Reforço da adoção (A23): membro cadastrado no painel com o telefone
   * formatado ("(42) 99999-8888") não casa por igualdade com o E.164 do
   * token. Compara só os dígitos, com e sem o 55.
   */
  private async findOrphanByPhoneDigits(tx: any, phone: string, communityId: string): Promise<{ id: string } | null> {
    const digits = phone.replace(/\D/g, '');
    const local = digits.startsWith('55') ? digits.slice(2) : digits;
    if (local.length < 10) return null;
    const rows: Array<{ id: string }> = await tx.$queryRaw`
      SELECT id FROM "members"
      WHERE "userId" IS NULL AND "deletedAt" IS NULL AND phone IS NOT NULL
        AND regexp_replace(phone, '\\D', '', 'g') IN (${digits}, ${local})
      ORDER BY ("communityId" = ${communityId}) DESC, "createdAt" ASC
      LIMIT 1`;
    return rows?.[0] ?? null;
  }

  async login(loginDto: LoginDto, meta: LoginMeta = {}) {
    const { password } = loginDto;
    const via: 'email' | 'phone' = loginDto.phone ? 'phone' : 'email';

    // Resolve a conta por e-mail OU celular; daqui para frente o fluxo é um só
    // (senha, conta ativa, 2FA, auditoria, aviso de aparelho novo)
    const user = await this.findLoginUser(loginDto);

    if (!user) {
      // Compara mesmo assim: o tempo de resposta não denuncia se a conta existe
      await bcrypt.compare(password, await dummyHash());
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    // Senha ANTES de qualquer outro estado da conta: com senha errada a
    // resposta é sempre a genérica (quem chuta e-mails não descobre contas)
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Fica na atividade da conta: o titular vê tentativas com senha errada
      void this.auditService
        .log({ actor: { id: user.id, email: user.email, role: user.role }, action: 'LOGIN_FAILED', entity: 'User', entityId: user.id, ip: meta.ip ?? null, metadata: { reason: 'password', via, userAgent: meta.userAgent ?? null } })
        .catch(() => undefined);
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    // Só quem acertou a senha fica sabendo que a conta está desativada.
    // 403 (e não 401): os apps mostram o texto do servidor em vez de
    // traduzir para "senha incorreta".
    if (!user.isActive) {
      void this.auditService
        .log({ actor: { id: user.id, email: user.email, role: user.role }, action: 'LOGIN_FAILED', entity: 'User', entityId: user.id, ip: meta.ip ?? null, metadata: { reason: 'inactive', via, userAgent: meta.userAgent ?? null } })
        .catch(() => undefined);
      throw new ForbiddenException(ACCOUNT_DISABLED_MESSAGE);
    }

    // Segundo fator ativo: não emite sessão ainda — devolve o desafio
    if (user.twoFactorEnabled) return this.security.challenge(user);
    return this.completeLogin(user, meta, via);
  }

  /**
   * Conta do login: por celular (normalizado como no esqueci-a-senha; `phone`
   * é único, então no máximo uma) ou por e-mail sem diferença de caixa
   * (prefere o igual exato). Celular que não normaliza = conta inexistente.
   */
  private async findLoginUser(loginDto: LoginDto) {
    // O hash da senha fica fora de toda consulta (omit global); o login é quem o confere
    if (loginDto.phone) {
      const phone = this.messagingService.normalizePhone(loginDto.phone);
      if (!phone) return null;
      return this.prisma.user.findUnique({ where: { phone }, include: this.sessionInclude, omit: LOGIN_OMIT });
    }

    const typed = String(loginDto.email ?? '').trim();
    if (!typed) return null;

    // Caminho comum: igual exato, pelo índice único
    const exact = await this.prisma.user.findUnique({ where: { email: typed }, include: this.sessionInclude, omit: LOGIN_OMIT });
    if (exact) return exact;

    // Conta gravada com outra caixa ("Maria@Gmail.com" digitado "maria@gmail.com")
    const candidates = await this.prisma.user.findMany({
      where: { email: emailInsensitive(typed) },
      include: this.sessionInclude,
      omit: LOGIN_OMIT,
      orderBy: { createdAt: 'asc' },
      take: 5,
    });
    return pickEmailMatch(candidates, typed);
  }

  /** Segunda etapa do login (2FA): confere o código e emite a sessão. */
  async twoFactorLogin(challengeToken: string, code: string, meta: LoginMeta = {}) {
    const challenge = this.security.verifyChallenge(challengeToken);
    const ok = await this.security.verifySecondFactor(challenge.userId, code);
    if (!ok) {
      void this.auditService
        .log({ actor: { id: challenge.userId }, action: 'TWO_FACTOR_LOGIN_FAILED', entity: 'User', entityId: challenge.userId, ip: meta.ip ?? null, metadata: { userAgent: meta.userAgent ?? null } })
        .catch(() => undefined);
      throw new UnauthorizedException('Código do autenticador inválido');
    }
    const user = await this.prisma.user.findUnique({ where: { id: challenge.userId }, include: this.sessionInclude });
    if (!user || !user.isActive) throw new UnauthorizedException('Usuário inativo');
    // Desafio é de uso único: depois da sessão emitida, não serve mais
    this.security.consumeChallenge(challenge);
    return this.completeLogin(user, meta);
  }

  /**
   * Reemite a sessão do próprio usuário depois de uma ação que encerra as
   * demais (ativar 2FA, esquecer outro aparelho): as sessões antigas caem e
   * o cliente que pediu a ação troca para os tokens novos.
   */
  async reissueSession(userId: string, authTime?: number | null) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, isActive: true, dioceseId: true, parishId: true, communityId: true },
    });
    if (!user || !user.isActive) throw new UnauthorizedException('Usuário inativo');
    return this.generateTokens(user.id, user.email, user.role, user.dioceseId ?? undefined, user.parishId ?? undefined, user.communityId ?? undefined, { authTime });
  }

  private sessionInclude = {
    member: {
      include: {
        pastoralMemberships: {
          where: { isActive: true },
          include: {
            communityPastoral: {
              select: {
                id: true,
                communityId: true,
                globalPastoral: { select: { id: true, name: true } },
              },
            },
          },
        },
        // Coordenação vigente (histórico oficial) — base de coordinatedPastoralIds
        pastoralCoordinations: {
          where: { isCurrent: true, communityPastoral: { deletedAt: null } },
          select: { communityPastoralId: true },
        },
      },
    },
    // Vínculos ativos: a comunidade de fé do gestor sem comunidade de escopo
    communities: {
      where: { isActive: true },
      include: { community: { select: { id: true, name: true } } },
    },
  } as const;

  /** Emite a sessão: último login, aparelho conhecido (alerta se novo) e tokens. */
  private async completeLogin(user: any, meta: LoginMeta, via?: 'email' | 'phone') {
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
    const device = await this.security.registerDevice({ id: user.id, email: user.email, name: user.name }, meta);
    void this.auditService
      .log({
        actor: { id: user.id, email: user.email, role: user.role },
        action: user.twoFactorEnabled ? 'TWO_FACTOR_LOGIN' : 'LOGIN',
        entity: 'User',
        entityId: user.id,
        ip: meta.ip ?? null,
        metadata: { newDevice: device.isNew, device: meta.deviceName ?? null, userAgent: meta.userAgent ?? null, ...(via ? { via } : {}) },
      })
      .catch(() => undefined);
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      user.dioceseId ?? undefined,
      user.parishId ?? undefined,
      user.communityId ?? undefined,
    );
    return { user: await this.mapUserResponse(user), ...tokens, newDevice: device.isNew };
  }

  /** Linha do refresh token: pelo hash (atual) ou pelo valor em claro (linhas antigas). */
  private findStoredRefreshToken(refreshToken: string) {
    return this.prisma.refreshToken.findFirst({
      where: { token: { in: [hashRefreshToken(refreshToken), refreshToken] } },
    });
  }

  /**
   * Rotação do refresh token. O token apresentado é CONSUMIDO de forma
   * atômica antes de emitir o par novo (B38: duas abas com o mesmo token não
   * geram duas sessões). O consumido fica marcado (rotatedAt) até expirar:
   * reapresentá-lo depois da janela de graça é sinal de roubo e derruba a
   * sessão (família) inteira (B46).
   */
  async refreshToken(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(String(refreshToken ?? ''), {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const stored = await this.findStoredRefreshToken(refreshToken);
    if (!stored || stored.userId !== payload?.sub) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const now = new Date();
    if (stored.expiresAt < now) {
      await this.prisma.refreshToken.deleteMany({ where: { id: stored.id } });
      throw new UnauthorizedException('Refresh token expirado');
    }

    if (stored.rotatedAt) {
      await this.handleRotatedTokenReuse(stored);
      throw new UnauthorizedException('Refresh token inválido');
    }

    // Linha antiga (sem sessão): ganha uma agora e passa a ser rastreada
    const sessionId: string = stored.sessionId ?? (typeof payload.sid === 'string' ? payload.sid : randomUUID());
    const consumed = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, rotatedAt: null },
      data: { rotatedAt: now, sessionId },
    });
    if (consumed.count === 0) {
      // Outra requisição trocou este mesmo token agora há pouco
      throw new UnauthorizedException('Refresh token inválido');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuário não encontrado ou inativo');
    }

    return this.generateTokens(
      user.id,
      user.email,
      user.role,
      user.dioceseId ?? undefined,
      user.parishId ?? undefined,
      user.communityId ?? undefined,
      // Mesma sessão; o horário do login com senha atravessa as renovações
      { sessionId, authTime: typeof payload.at === 'number' ? payload.at : null },
    );
  }

  /** Refresh token já trocado reapresentado: concorrência (graça) ou reuso (revoga a família). */
  private async handleRotatedTokenReuse(stored: { id: string; userId: string; sessionId: string | null; rotatedAt: Date | null }) {
    const age = Date.now() - (stored.rotatedAt?.getTime() ?? 0);
    if (age <= REFRESH_REUSE_GRACE_MS) return;
    await this.prisma.refreshToken.deleteMany({
      where: stored.sessionId ? { userId: stored.userId, sessionId: stored.sessionId } : { id: stored.id },
    });
    this.logger.warn(`Reuso de refresh token já trocado (usuário ${stored.userId}): sessão encerrada`);
    void this.auditService
      .log({ actor: { id: stored.userId }, action: 'UPDATE', entity: 'User', entityId: stored.userId, metadata: { refreshTokenReuse: true, sessionRevoked: true } })
      .catch(() => undefined);
  }

  /**
   * Sair DESTE aparelho (M29/B3): apaga só a sessão do access token (`sid`)
   * e/ou a do refresh token enviado — o access token dela cai na hora (a
   * JwtStrategy confere se a sessão existe). Sem nenhum dos dois (token de
   * antes desta versão), mantém o comportamento antigo: todas as sessões.
   * `pushToken`: o aparelho deixa de receber os avisos desta conta (M42).
   */
  async logout(
    user: { id: string; sessionId?: string | null },
    options: { refreshToken?: string | null; pushToken?: string | null } = {},
  ) {
    const sessionIds = new Set<string>();
    const rowIds: string[] = [];
    if (user.sessionId) sessionIds.add(user.sessionId);
    if (options.refreshToken) {
      const stored = await this.findStoredRefreshToken(options.refreshToken);
      if (stored && stored.userId === user.id) {
        if (stored.sessionId) sessionIds.add(stored.sessionId);
        else rowIds.push(stored.id);
      }
    }

    if (sessionIds.size || rowIds.length) {
      await this.prisma.refreshToken.deleteMany({
        where: {
          userId: user.id,
          OR: [
            ...(sessionIds.size ? [{ sessionId: { in: [...sessionIds] } }] : []),
            ...(rowIds.length ? [{ id: { in: rowIds } }] : []),
          ],
        },
      });
    } else {
      await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    }

    if (options.pushToken) {
      await this.prisma.user.updateMany({
        where: { id: user.id, pushToken: options.pushToken },
        data: { pushToken: null, pushTokenUpdatedAt: new Date() },
      });
    }

    return { message: 'Logout realizado com sucesso' };
  }

  /** "Sair de todos os aparelhos": refresh tokens somem, access tokens anteriores caem e o push é desligado. */
  async logoutAll(userId: string) {
    await this.security.revokeSessions(userId);
    await this.prisma.user.update({ where: { id: userId }, data: { pushToken: null, pushTokenUpdatedAt: new Date() } });
    void this.auditService
      .log({ actor: { id: userId }, action: 'UPDATE', entity: 'User', entityId: userId, metadata: { logoutAllDevices: true, sessionsRevoked: true } })
      .catch(() => undefined);
    return { message: 'Todas as sessões foram encerradas' };
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: UserRole,
    dioceseId?: string,
    parishId?: string,
    communityId?: string,
    session: SessionOptions = {},
  ) {
    // `jti`: nonce único por emissão. Sem ele, dois logins do mesmo usuário no
    // mesmo segundo produziriam JWTs idênticos (payload + iat em segundos) e
    // colidiriam na constraint única de refreshToken.token.
    // `sid`: sessão do aparelho (o logout encerra só ela). `at`: hora do último
    // login com senha — ação sensível (ativar 2FA) aceita login recente.
    const sessionId = session.sessionId ?? randomUUID();
    const authTime = session.authTime === undefined ? Math.floor(Date.now() / 1000) : session.authTime;
    const basePayload = {
      sub: userId,
      email,
      role,
      dioceseId,
      parishId,
      communityId,
      sid: sessionId,
      ...(authTime ? { at: authTime } : {}),
    };

    // Gerar access token
    const accessToken = this.jwtService.sign(
      { ...basePayload, jti: randomUUID() },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN') || '1d',
      },
    );

    // Gerar refresh token (jti próprio, garante unicidade do token persistido;
    // `typ` impede que sirva como Bearer mesmo se os segredos coincidirem)
    const refreshToken = this.jwtService.sign(
      { ...basePayload, typ: 'refresh', jti: randomUUID() },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
      },
    );

    // Expiração da linha = a do próprio JWT (JWT_REFRESH_EXPIRES_IN), não 7 dias fixos
    let expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    try {
      const decoded: any = this.jwtService.decode(refreshToken);
      if (typeof decoded?.exp === 'number') expiresAt = new Date(decoded.exp * 1000);
    } catch {
      // mantém os 7 dias
    }

    // Só o hash vai para o banco
    await this.prisma.refreshToken.create({
      data: {
        token: hashRefreshToken(refreshToken),
        userId,
        expiresAt,
        sessionId,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Usuário da sessão (JwtStrategy, a cada requisição). Com `sessionId`,
   * confere também se a sessão do aparelho ainda existe (`sessionAlive`):
   * logout e reuso de refresh apagam a sessão e o access token cai junto.
   */
  async validateUser(userId: string, sessionId?: string) {
    const [user, liveSession] = await Promise.all([
      this.findSessionUser(userId),
      sessionId
        ? this.prisma.refreshToken.findFirst({ where: { userId, sessionId }, select: { id: true } })
        : Promise.resolve(null),
    ]);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuário não encontrado ou inativo');
    }

    const memberships = user.member?.pastoralMemberships ?? [];
    return {
      ...user,
      sessionAlive: sessionId ? !!liveSession : true,
      // PARTICIPAÇÃO (todos os vínculos ativos): agenda, escalas, avisos
      pastoralIds: memberships
        .map((membership) => membership.communityPastoralId)
        .filter((id): id is string => !!id),
      // COORDENAÇÃO (papel COORDINATOR ativo ou coordenação vigente): só estes
      // ids dão acesso de gestão à pastoral — ser membro não basta
      coordinatedPastoralIds: pickCoordinatedPastoralIds(
        memberships,
        user.member?.pastoralCoordinations ?? [],
      ),
    };
  }

  private findSessionUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        dioceseId: true,
        parishId: true,
        communityId: true,
        primaryCommunityId: true,
        sessionsRevokedAt: true,
        // Troca de senha obrigatória (conta criada/redefinida pela gestão) — JwtStrategy
        forcePasswordChange: true,
        member: {
          select: {
            id: true,
            pastoralMemberships: {
              where: {
                isActive: true,
                communityPastoralId: { not: null },
              },
              select: {
                communityPastoralId: true,
                role: true,
              },
            },
            // Coordenação vigente (histórico oficial) — base de coordinatedPastoralIds
            pastoralCoordinations: {
              where: { isCurrent: true, communityPastoral: { deletedAt: null } },
              select: { communityPastoralId: true },
            },
          },
        },
        communities: {
          // Vínculos desativados (leftAt) NÃO concedem escopo
          where: { isActive: true },
          include: {
            community: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }
}
