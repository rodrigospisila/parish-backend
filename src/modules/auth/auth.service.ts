import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ConsentType, UserRole } from '@prisma/client';
import { MembersService } from '../members/members.service';
import { OtpService } from './otp.service';
import { AuditService } from '../../common/audit.service';
import { ConsentsService } from '../consents/consents.service';
import { CURRENT_POLICY_VERSION } from '../consents/consent.constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly membersService: MembersService,
    private readonly otpService: OtpService,
    private readonly auditService: AuditService,
    private readonly consentsService: ConsentsService,
  ) {}

  private mapUserResponse(user: any) {
    const pastoralMemberships = user.member?.pastoralMemberships || [];

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      forcePasswordChange: user.forcePasswordChange,
      dioceseId: user.dioceseId,
      parishId: user.parishId,
      communityId: user.communityId,
      createdAt: user.createdAt,
      pastoralIds: pastoralMemberships
        .map((membership: any) => membership.communityPastoralId)
        .filter((id: string | null | undefined): id is string => !!id),
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
  }

  async register(registerDto: RegisterDto) {
    const { email, password, name, role, communityId, consentGiven, verifiedPhoneToken } =
      registerDto;

    // SEGURANÇA: o registro público NUNCA atribui papel elevado.
    // Qualquer papel acima de FAITHFUL só pode ser criado por um administrador
    // via POST /users (que valida hierarquia e escopo). Sem esta trava, qualquer
    // pessoa poderia se auto-registrar como SYSTEM_ADMIN.
    if (role && role !== UserRole.FAITHFUL) {
      throw new ForbiddenException(
        'O registro público permite apenas o perfil FAITHFUL. Perfis administrativos são criados pela gestão da paróquia.',
      );
    }

    // If a verifiedPhoneToken was provided, extract the phone from it (mobile registration path).
    // Otherwise fall back to the raw phone field (admin/internal path).
    const phone = verifiedPhoneToken
      ? this.otpService.decodeVerifiedPhoneToken(verifiedPhoneToken)
      : registerDto.phone;

    // Verificar se o usuário já existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
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
          user.member?.id,
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
      user: this.mapUserResponse(result),
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Buscar usuário
    const user = await this.prisma.user.findUnique({
      where: { email },
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

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Verificar se o usuário está ativo
    if (!user.isActive) {
      throw new UnauthorizedException('Usuário inativo');
    }

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Atualizar último login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Gerar tokens
    const tokens = await this.generateTokens(
      user.id, 
      user.email, 
      user.role, 
      user.dioceseId ?? undefined,
      user.parishId ?? undefined,
      user.communityId ?? undefined
    );

    return {
      user: this.mapUserResponse(user),
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      // Verificar se o refresh token é válido
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      // Buscar refresh token no banco
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (!storedToken) {
        throw new UnauthorizedException('Refresh token inválido');
      }

      // Verificar se o token expirou
      if (storedToken.expiresAt < new Date()) {
        await this.prisma.refreshToken.delete({
          where: { id: storedToken.id },
        });
        throw new UnauthorizedException('Refresh token expirado');
      }

      // Buscar usuário
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Usuário não encontrado ou inativo');
      }

      // Gerar novos tokens
      const tokens = await this.generateTokens(
        user.id, 
        user.email, 
        user.role,
        user.dioceseId ?? undefined,
        user.parishId ?? undefined,
        user.communityId ?? undefined
      );

      // Deletar o refresh token antigo
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }

  async logout(userId: string) {
    // Deletar todos os refresh tokens do usuário
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return { message: 'Logout realizado com sucesso' };
  }

  private async generateTokens(userId: string, email: string, role: UserRole, dioceseId?: string, parishId?: string, communityId?: string) {
    // `jti`: nonce único por emissão. Sem ele, dois logins do mesmo usuário no
    // mesmo segundo produziriam JWTs idênticos (payload + iat em segundos) e
    // colidiriam na constraint única de refreshToken.token.
    const basePayload = { sub: userId, email, role, dioceseId, parishId, communityId };

    // Gerar access token
    const accessToken = this.jwtService.sign(
      { ...basePayload, jti: randomUUID() },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN') || '1d',
      },
    );

    // Gerar refresh token (jti próprio, garante unicidade do token persistido)
    const refreshToken = this.jwtService.sign(
      { ...basePayload, jti: randomUUID() },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
      },
    );

    // Calcular data de expiração do refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

    // Salvar refresh token no banco
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
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

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuário não encontrado ou inativo');
    }

    return {
      ...user,
      pastoralIds: user.member?.pastoralMemberships
        .map((membership) => membership.communityPastoralId)
        .filter((id): id is string => !!id),
    };
  }
}
