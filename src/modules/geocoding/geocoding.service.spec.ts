import 'reflect-metadata';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { DEFAULT_GEOCODING_USER_AGENT, GeocodingService } from './geocoding.service';
import { GeocodingController } from './geocoding.controller';
import { UserThrottlerGuard } from '../auth/guards/app-throttler.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const resposta = (rows: any[], ok = true) => ({ ok, status: ok ? 200 : 503, json: async () => rows }) as any;

describe('GeocodingService — Nominatim com cache, fila e timeout', () => {
  let service: GeocodingService;
  let fetchMock: jest.Mock;
  let relogio: number;
  let esperas: number[];
  const original = global.fetch;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue(resposta([{ lat: '-25.1', lon: '-50.1', display_name: 'Rua A, Ponta Grossa', place_rank: 26 }]));
    (global as any).fetch = fetchMock;
    service = new GeocodingService();
    relogio = 1_000_000;
    esperas = [];
    jest.spyOn(service as any, 'nowMs').mockImplementation(() => relogio);
    jest.spyOn(service as any, 'sleep').mockImplementation(async (ms: any) => {
      esperas.push(ms);
      relogio += ms;
    });
  });

  afterAll(() => {
    (global as any).fetch = original;
  });

  it('User-Agent com o site do produto (sem e-mail) e timeout no fetch', async () => {
    const r = await service.search('Rua A, Ponta Grossa');
    expect(r).toEqual([{ latitude: -25.1, longitude: -50.1, label: 'Rua A, Ponta Grossa', rank: 26 }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('https://nominatim.openstreetmap.org/search?q=Rua%20A%2C%20Ponta%20Grossa');
    expect(url).toContain('countrycodes=br');
    expect(init.headers['User-Agent']).toBe(DEFAULT_GEOCODING_USER_AGENT);
    expect(init.headers['User-Agent']).not.toMatch(/@/);
    expect(init.signal).toBeDefined();
  });

  it('cache por texto normalizado (caixa, acento, espaços): a segunda busca não chama o provedor', async () => {
    await service.search('Praça São José,  Imbituva');
    await service.search('praca sao jose, imbituva');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // passou a validade (24 h): busca de novo
    relogio += 25 * 60 * 60 * 1000;
    await service.search('praca sao jose, imbituva');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('consultas iguais ao mesmo tempo viram uma só chamada', async () => {
    await Promise.all([service.search('Curitiba'), service.search('curitiba'), service.search('CURITIBA')]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fila global: no máximo 1 chamada por segundo ao provedor', async () => {
    await Promise.all([service.search('Curitiba'), service.search('Londrina'), service.search('Maringá')]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    // a 1ª sai na hora; as outras esperam completar 1 s desde a anterior
    expect(esperas).toEqual([1000, 1000]);
  });

  it('fila cheia → 503 na hora (não prende a conexão)', async () => {
    let solta: () => void = () => undefined;
    fetchMock.mockImplementation(() => new Promise((resolve) => (solta = () => resolve(resposta([])))));
    const presas = Array.from({ length: 20 }, (_, i) => service.search(`cidade ${i}`));
    await expect(service.search('mais uma')).rejects.toBeInstanceOf(ServiceUnavailableException);
    solta();
    fetchMock.mockResolvedValue(resposta([]));
    await Promise.allSettled(presas);
  });

  it('falha do provedor não vai para o cache; resposta vazia vai (por 1 h)', async () => {
    fetchMock.mockResolvedValueOnce(resposta([], false));
    expect(await service.search('Lugar Nenhum')).toEqual([]);
    expect(await service.search('Lugar Nenhum')).toEqual([{ latitude: -25.1, longitude: -50.1, label: 'Rua A, Ponta Grossa', rank: 26 }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockResolvedValue(resposta([]));
    await service.search('Outro Lugar');
    await service.search('Outro Lugar');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('timeout/erro de rede → lista vazia, sem lançar', async () => {
    fetchMock.mockRejectedValueOnce(Object.assign(new Error('timeout'), { name: 'TimeoutError' }));
    expect(await service.search('Ponta Grossa')).toEqual([]);
  });

  it('busca estruturada (rua + cidade + UF) e validação', async () => {
    await service.searchStructured({ street: 'Rua XV de Novembro', city: 'Curitiba', state: 'PR' });
    expect(fetchMock.mock.calls[0][0]).toContain('street=Rua%20XV%20de%20Novembro&city=Curitiba&state=PR&country=Brasil');
    await expect(service.searchStructured({ street: 'R', city: 'Curitiba', state: 'PR' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.search('ab')).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('GeocodingController', () => {
  it('rota logada com limite por usuário (JwtAuthGuard + UserThrottlerGuard)', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, GeocodingController);
    expect(guards).toEqual([JwtAuthGuard, UserThrottlerGuard]);
  });

  it('street presente → estruturada; senão, busca livre', async () => {
    const svc = { search: jest.fn().mockResolvedValue([]), searchStructured: jest.fn().mockResolvedValue([]) };
    const ctrl = new GeocodingController(svc as any);
    await ctrl.search(undefined, 'Rua A', 'Imbituva', 'PR');
    expect(svc.searchStructured).toHaveBeenCalledWith({ street: 'Rua A', city: 'Imbituva', state: 'PR' });
    await ctrl.search('Imbituva');
    expect(svc.search).toHaveBeenCalledWith('Imbituva');
  });
});
