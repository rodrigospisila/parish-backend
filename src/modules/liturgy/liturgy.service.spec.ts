import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import { LiturgyService } from './liturgy.service';
import { LiturgyController } from './liturgy.controller';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

/** B34: liturgia por data vai em ?dia=&mes=&ano= e nunca inventa "Tempo Comum". */
describe('LiturgyService (B34)', () => {
  let service: LiturgyService;
  const config = { get: jest.fn().mockReturnValue(undefined) } as any;

  const advento = {
    data: '01/12/2026',
    liturgia: '3ª feira da 1ª Semana do Advento',
    cor: 'Roxo',
    evangelho: { titulo: 'Evangelho', texto: '...', referencia: 'Lc 10,21-24' },
  };

  beforeEach(() => {
    jest.resetAllMocks();
    (mockedAxios.isAxiosError as unknown as jest.Mock).mockImplementation((e: any) => !!e?.isAxiosError);
    service = new LiturgyService(config);
  });

  it('consulta a API com ?dia=&mes=&ano= e devolve a liturgia daquela data', async () => {
    mockedAxios.get.mockResolvedValue({ data: advento });

    const result = await service.getLiturgyByDate('2026-12-01');

    expect(mockedAxios.get).toHaveBeenCalledWith('https://liturgia.up.railway.app/', {
      params: { dia: '01', mes: '12', ano: '2026' },
      timeout: expect.any(Number),
    });
    expect(result).toMatchObject({ date: '2026-12-01', liturgy: advento.liturgia, liturgicalColor: 'Roxo' });
    expect(result.gospel?.reference).toBe('Lc 10,21-24');
  });

  it('guarda em cache por data (segunda chamada não vai à API)', async () => {
    mockedAxios.get.mockResolvedValue({ data: advento });
    await service.getLiturgyByDate('2026-12-01');
    await service.getLiturgyByDate('2026-12-01');
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it('API fora do ar: 503, sem fallback "Tempo Comum / Verde" e sem cache', async () => {
    mockedAxios.get.mockRejectedValue({ isAxiosError: true, message: 'timeout', response: { status: 502 } });

    await expect(service.getLiturgyByDate('2026-12-01')).rejects.toBeInstanceOf(ServiceUnavailableException);
    mockedAxios.get.mockResolvedValue({ data: advento });
    await expect(service.getLiturgyByDate('2026-12-01')).resolves.toMatchObject({ liturgicalColor: 'Roxo' });
  });

  it('API responde OUTRA data (ex.: a de hoje): 503, não grava sob a data pedida', async () => {
    mockedAxios.get.mockResolvedValue({ data: { ...advento, data: '06/10/2026', liturgia: 'Tempo Comum', cor: 'Verde' } });

    await expect(service.getLiturgyByDate('2026-12-01')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('resposta sem tempo litúrgico/cor: 503 (não inventa)', async () => {
    mockedAxios.get.mockResolvedValue({ data: { data: '01/12/2026' } });
    await expect(service.getLiturgyByDate('2026-12-01')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('hoje é o dia de Brasília (não o do processo)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-12-02T01:30:00Z')); // 01/12 22:30 em Brasília
    try {
      mockedAxios.get.mockResolvedValue({ data: advento });
      await service.getTodayLiturgy();
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        params: { dia: '01', mes: '12', ano: '2026' },
      }));
    } finally {
      jest.useRealTimers();
    }
  });

  it('data malformada ou inexistente: 400 (antes era Error cru → 500)', async () => {
    const controller = new LiturgyController(service);
    expect(() => controller.getLiturgyByDate('2026-1-1')).toThrow(BadRequestException);
    expect(() => controller.getLiturgyByDate('2026-02-30')).toThrow(BadRequestException);
    await expect(service.getLiturgyByDate('abc')).rejects.toBeInstanceOf(BadRequestException);
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });
});
