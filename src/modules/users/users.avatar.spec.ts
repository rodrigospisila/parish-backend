import { NotFoundException } from '@nestjs/common';
import { UsersController } from './users.controller';

/**
 * GET /users/:id/avatar — achado B50: sem foto, o painel pede ?optional=1 e
 * recebe 204 (sem erro no console); sem o parâmetro (app) segue 404.
 */
describe('UsersController.avatar', () => {
  const makeRes = () => {
    const res: any = {};
    res.set = jest.fn(() => res);
    res.status = jest.fn(() => res);
    res.end = jest.fn(() => res);
    return res;
  };

  const make = (getAvatarFile: jest.Mock) =>
    new UsersController({ getAvatarFile } as any, {} as any);

  it('com foto: 200 com o MIME e o conteúdo', async () => {
    const ctrl = make(jest.fn().mockResolvedValue({ mimeType: 'image/png', buffer: Buffer.from([1, 2, 3]) }));
    const res = makeRes();
    await ctrl.avatar('u1', '1', res);
    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({ 'Content-Type': 'image/png', 'Content-Length': '3' }));
    expect(res.status).not.toHaveBeenCalled();
    expect(res.end).toHaveBeenCalledWith(Buffer.from([1, 2, 3]));
  });

  it('sem foto e ?optional=1: 204 sem corpo', async () => {
    const ctrl = make(jest.fn().mockRejectedValue(new NotFoundException('Sem foto de perfil')));
    const res = makeRes();
    await ctrl.avatar('u1', '1', res);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalledWith();
  });

  it('sem foto e sem o parâmetro (app): continua 404', async () => {
    const ctrl = make(jest.fn().mockRejectedValue(new NotFoundException('Sem foto de perfil')));
    await expect(ctrl.avatar('u1', undefined, makeRes())).rejects.toBeInstanceOf(NotFoundException);
  });

  it('outro erro não vira 204 mesmo com ?optional=1', async () => {
    const ctrl = make(jest.fn().mockRejectedValue(new Error('banco fora')));
    await expect(ctrl.avatar('u1', '1', makeRes())).rejects.toThrow('banco fora');
  });
});
