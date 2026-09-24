import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CommunitySuggestionsService } from './community-suggestions.service';
import { PrismaService } from '../../database/prisma.service';
import { CreateCommunitySuggestionDto } from './dto/create-community-suggestion.dto';
import { ReviewCommunitySuggestionDto } from './dto/review-community-suggestion.dto';

describe('CommunitySuggestionsService — sugestões dos fiéis', () => {
  let service: CommunitySuggestionsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      community: { findFirst: jest.fn().mockResolvedValue({ id: 'com1' }) },
      communitySuggestion: {
        create: jest.fn().mockResolvedValue({ id: 'sug1', status: 'PENDING' }),
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'sug1' }),
      },
      communityGeoCandidate: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    prisma.$transaction = jest.fn((fn: any) => fn(prisma));
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommunitySuggestionsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(CommunitySuggestionsService);
  });

  const local = (over: Partial<CreateCommunitySuggestionDto> = {}) =>
    ({ kind: 'LOCATION', latitude: -25.09, longitude: -50.16, message: 'A igreja fica na outra quadra', ...over }) as CreateCommunitySuggestionDto;

  describe('validação (serviço)', () => {
    it('mensagem obrigatória, 3 a 1000 caracteres depois do trim', async () => {
      await expect(service.create('com1', 'u1', { kind: 'INFO', message: '  ab  ' } as any)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.create('com1', 'u1', { kind: 'INFO' } as any)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.create('com1', 'u1', { kind: 'INFO', message: 'x'.repeat(1001) } as any)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.communitySuggestion.create).not.toHaveBeenCalled();
    });

    it('tipo inválido', async () => {
      await expect(service.create('com1', 'u1', { kind: 'XPTO', message: 'abc' } as any)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('LOCATION exige coordenada dentro do Brasil', async () => {
      await expect(service.create('com1', 'u1', local({ latitude: undefined }))).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.create('com1', 'u1', local({ latitude: 40.7, longitude: -74.0 }))).rejects.toBeInstanceOf(BadRequestException); // Nova York
      await expect(service.create('com1', 'u1', local({ longitude: -20 }))).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.create('com1', 'u1', local({ latitude: NaN }))).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.create('com1', 'u1', local({ accuracyM: -5 }))).rejects.toBeInstanceOf(BadRequestException);
    });

    it('404 para comunidade apagada/inativa/inexistente', async () => {
      prisma.community.findFirst.mockResolvedValue(null);
      await expect(service.create('nada', 'u1', local())).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.community.findFirst.mock.calls[0][0].where).toEqual({ id: 'nada', deletedAt: null, status: 'ACTIVE' });
    });
  });

  describe('criação', () => {
    it('LOCATION grava PENDING e cria candidato de pino na fila de revisão (sem mexer no pino)', async () => {
      const r = await service.create('com1', 'u1', local({ message: '  A igreja fica na outra quadra  ', atChurch: true, accuracyM: 8.6 }));

      expect(r).toEqual({ id: 'sug1', status: 'PENDING' });
      expect(prisma.communitySuggestion.create.mock.calls[0][0].data).toEqual({
        communityId: 'com1',
        userId: 'u1',
        kind: 'LOCATION',
        scheduleType: null,
        latitude: -25.09,
        longitude: -50.16,
        accuracyM: 8.6,
        atChurch: true,
        message: 'A igreja fica na outra quadra',
        status: 'PENDING',
      });
      expect(prisma.communityGeoCandidate.createMany).toHaveBeenCalledWith({
        data: [
          {
            communityId: 'com1',
            latitude: -25.09,
            longitude: -50.16,
            source: 'usuario',
            reason: 'sugestao-usuario',
            label: 'A igreja fica na outra quadra',
            detail: 'sugestão de usuário sug1 — no local, GPS ±9 m',
          },
        ],
        skipDuplicates: true,
      });
      // nada de update na comunidade: a sugestão nunca é aplicada sozinha
      expect(prisma.community.update).toBeUndefined();
    });

    it('label do candidato é cortado em 200 caracteres; fora da igreja diz que foi marcado no mapa', async () => {
      await service.create('com1', 'u1', local({ message: 'y'.repeat(600) }));
      const cand = prisma.communityGeoCandidate.createMany.mock.calls[0][0].data[0];
      expect(cand.label).toHaveLength(200);
      expect(cand.detail).toBe('sugestão de usuário sug1 — marcado no mapa');
    });

    it('SCHEDULE guarda o tipo de celebração e não cria candidato de pino nem guarda coordenada', async () => {
      await service.create('com1', 'u1', {
        kind: 'SCHEDULE',
        scheduleType: 'CONFESSION',
        latitude: -25.1,
        longitude: -50.1,
        message: 'Confissão é às 17h, não 16h',
      } as any);
      const data = prisma.communitySuggestion.create.mock.calls[0][0].data;
      expect(data).toMatchObject({ kind: 'SCHEDULE', scheduleType: 'CONFESSION', latitude: null, longitude: null, accuracyM: null });
      expect(prisma.communityGeoCandidate.createMany).not.toHaveBeenCalled();
    });

    it('INFO ignora scheduleType', async () => {
      await service.create('com1', null, { kind: 'INFO', scheduleType: 'MASS', message: 'Telefone mudou' } as any);
      expect(prisma.communitySuggestion.create.mock.calls[0][0].data).toMatchObject({ kind: 'INFO', scheduleType: null, userId: null });
    });
  });

  describe('administração', () => {
    it('lista com filtros, paginação e sem e-mail/telefone de quem enviou', async () => {
      prisma.communitySuggestion.count.mockResolvedValue(7);
      const r = await service.list({ status: 'pending', kind: 'LOCATION', limit: 5, offset: 10 });
      const args = prisma.communitySuggestion.findMany.mock.calls[0][0];
      expect(args.where).toEqual({ status: 'PENDING', kind: 'LOCATION' });
      expect(args).toMatchObject({ skip: 10, take: 5, orderBy: { createdAt: 'desc' } });
      expect(args.select.user).toEqual({ select: { id: true, name: true } });
      expect(args.select.community).toEqual({ select: { id: true, name: true, city: true, state: true } });
      expect(r).toEqual({ total: 7, limit: 5, offset: 10, items: [] });
    });

    it('lista recusa status/tipo inválidos e limita o tamanho da página', async () => {
      await expect(service.list({ status: 'XPTO' })).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.list({ kind: 'XPTO' })).rejects.toBeInstanceOf(BadRequestException);
      const r = await service.list({ limit: 9999 });
      expect(r.limit).toBe(200);
    });

    it('revisão grava status, observação, quando e quem — e não toca na comunidade', async () => {
      prisma.communitySuggestion.findUnique.mockResolvedValue({ id: 'sug1' });
      await service.review('sug1', { status: 'ACCEPTED', reviewNote: '  pino corrigido à mão  ' } as any, 'adm1');
      const args = prisma.communitySuggestion.update.mock.calls[0][0];
      expect(args.where).toEqual({ id: 'sug1' });
      expect(args.data).toMatchObject({ status: 'ACCEPTED', reviewNote: 'pino corrigido à mão', reviewedByUserId: 'adm1' });
      expect(args.data.reviewedAt).toBeInstanceOf(Date);
      expect(prisma.communityGeoCandidate.createMany).not.toHaveBeenCalled();
    });

    it('revisão sem observação mantém a anterior', async () => {
      prisma.communitySuggestion.findUnique.mockResolvedValue({ id: 'sug1' });
      await service.review('sug1', { status: 'REVIEWED' } as any, 'adm1');
      expect('reviewNote' in prisma.communitySuggestion.update.mock.calls[0][0].data).toBe(false);
    });

    it('revisão recusa PENDING e sugestão inexistente', async () => {
      await expect(service.review('sug1', { status: 'PENDING' } as any, 'adm1')).rejects.toBeInstanceOf(BadRequestException);
      prisma.communitySuggestion.findUnique.mockResolvedValue(null);
      await expect(service.review('x', { status: 'REJECTED' } as any, 'adm1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

describe('DTOs das sugestões (class-validator)', () => {
  const erros = async (cls: any, body: any) => (await validate(plainToInstance(cls, body))).map((e) => e.property);

  it('LOCATION sem coordenada é recusado', async () => {
    expect(await erros(CreateCommunitySuggestionDto, { kind: 'LOCATION', message: 'aqui não' })).toEqual(
      expect.arrayContaining(['latitude', 'longitude']),
    );
  });

  it('coordenada fora do Brasil é recusada', async () => {
    expect(await erros(CreateCommunitySuggestionDto, { kind: 'LOCATION', latitude: 48.85, longitude: 2.35, message: 'Paris' })).toEqual(
      expect.arrayContaining(['latitude', 'longitude']),
    );
  });

  it('mensagem só com espaços é recusada (trim antes do tamanho)', async () => {
    expect(await erros(CreateCommunitySuggestionDto, { kind: 'INFO', message: '     ' })).toEqual(['message']);
  });

  it('corpo válido passa', async () => {
    expect(
      await erros(CreateCommunitySuggestionDto, {
        kind: 'LOCATION',
        latitude: -25.09,
        longitude: -50.16,
        accuracyM: 12,
        atChurch: true,
        message: 'Estou na porta da igreja',
      }),
    ).toEqual([]);
    expect(await erros(CreateCommunitySuggestionDto, { kind: 'SCHEDULE', scheduleType: 'ADORATION', message: 'Adoração às quintas' })).toEqual([]);
  });

  it('scheduleType inválido é recusado', async () => {
    expect(await erros(CreateCommunitySuggestionDto, { kind: 'SCHEDULE', scheduleType: 'NOVENA', message: 'abc' })).toEqual(['scheduleType']);
  });

  it('revisão aceita REVIEWED/ACCEPTED/REJECTED, não PENDING', async () => {
    expect(await erros(ReviewCommunitySuggestionDto, { status: 'ACCEPTED', reviewNote: 'ok' })).toEqual([]);
    expect(await erros(ReviewCommunitySuggestionDto, { status: 'PENDING' })).toEqual(['status']);
  });
});
