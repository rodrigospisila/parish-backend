import {
  EnforcementHitsService,
  INVALID_COMMUNITY_ID,
  normalizeHitCommunityId,
  normalizeHitFeature,
} from './enforcement-hits.service';

/** R13: communityId vindo do cliente não incha a memória nem a tabela. */
describe('EnforcementHitsService — valores gravados', () => {
  const cuid = 'cmg1abcde0001xyz2k3l4m5n6';
  const uuid = '550e8400-e29b-41d4-a716-446655440000';

  it('communityId: cuid/uuid ficam; vazio fica vazio; o resto vira "invalido"', () => {
    expect(normalizeHitCommunityId(cuid)).toBe(cuid);
    expect(normalizeHitCommunityId(uuid)).toBe(uuid);
    expect(normalizeHitCommunityId(undefined)).toBe('');
    expect(normalizeHitCommunityId(null)).toBe('');
    expect(normalizeHitCommunityId('')).toBe('');
    expect(normalizeHitCommunityId('x'.repeat(100_000))).toBe(INVALID_COMMUNITY_ID);
    expect(normalizeHitCommunityId('a'.repeat(41))).toBe(INVALID_COMMUNITY_ID);
    expect(normalizeHitCommunityId("c1' OR 1=1")).toBe(INVALID_COMMUNITY_ID);
    expect(normalizeHitCommunityId('curto')).toBe(INVALID_COMMUNITY_ID);
    expect(normalizeHitCommunityId({ id: cuid })).toBe(INVALID_COMMUNITY_ID);
  });

  it('feature: só caracteres seguros, até 120', () => {
    expect(normalizeHitFeature('catechesis:fora-do-escopo')).toBe('catechesis:fora-do-escopo');
    expect(normalizeHitFeature('mass-schedules')).toBe('mass-schedules');
    expect(normalizeHitFeature('x'.repeat(100_000))).toHaveLength(120);
    expect(normalizeHitFeature('cate<script>chesis 😀')).toBe('catescriptchesis');
    expect(normalizeHitFeature(undefined)).toBe('');
    expect(normalizeHitFeature(42)).toBe('');
  });

  it('record grava os valores normalizados e conta uma vez por pessoa/dia', () => {
    const upsert = jest.fn().mockResolvedValue({});
    const service = new EnforcementHitsService({ enforcementHit: { upsert } } as any);

    service.record({ kind: 'PLAN_FEATURE', feature: 'catechesis', communityId: 'z'.repeat(100_000), userId: 'u1', mode: 'log' });
    service.record({ kind: 'PLAN_FEATURE', feature: 'catechesis', communityId: 'y'.repeat(100_000), userId: 'u1', mode: 'log' });
    service.record({ kind: 'PLAN_FEATURE', feature: 'catechesis', communityId: cuid, userId: 'u1', mode: 'log' });

    // os dois valores enormes caem na mesma chave "invalido" → uma gravação só
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert.mock.calls[0][0].create).toMatchObject({ feature: 'catechesis', communityId: INVALID_COMMUNITY_ID, count: 1 });
    expect(upsert.mock.calls[1][0].create).toMatchObject({ communityId: cuid });
  });

  it('nunca lança (falha do banco só vira aviso)', async () => {
    const upsert = jest.fn().mockRejectedValue(new Error('db fora'));
    const service = new EnforcementHitsService({ enforcementHit: { upsert } } as any);
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    expect(() => service.record({ kind: 'TERMS', userId: 'u1', mode: 'on' })).not.toThrow();
    await new Promise((resolve) => setImmediate(resolve));
    expect((service as any).logger.warn).toHaveBeenCalled();
  });
});
