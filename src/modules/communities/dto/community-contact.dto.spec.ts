import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCommunityDto } from './create-community.dto';
import { UpdateCommunityDto } from './update-community.dto';

/**
 * F10: comunidades com telefone/e-mail gravados como '' (painel apagando o
 * contato) apareciam como contato "vazio" no app e contavam como preenchidas.
 */
describe('Comunidade: telefone e e-mail vazios viram null', () => {
  const base = { name: 'Capela São José', address: 'Rua A, 1', city: 'Imbituva', state: 'PR', zipCode: '84430-000', parishId: 'p1' };

  it.each(['', '   ', '\t'])('create: %j → null (e continua válido)', async (vazio) => {
    const dto = plainToInstance(CreateCommunityDto, { ...base, phone: vazio, email: vazio });
    expect(dto.phone).toBeNull();
    expect(dto.email).toBeNull();
    expect(await validate(dto)).toHaveLength(0);
  });

  it('update: vazio limpa o contato (null), ausente fica ausente', async () => {
    const dto = plainToInstance(UpdateCommunityDto, { phone: ' ', email: '' });
    expect(dto.phone).toBeNull();
    expect(dto.email).toBeNull();
    expect(await validate(dto)).toHaveLength(0);
    const semContato = plainToInstance(UpdateCommunityDto, { name: 'Matriz' });
    expect(semContato).not.toHaveProperty('phone');
    expect(semContato).not.toHaveProperty('email');
  });

  it('preenchido: só tira os espaços das pontas', () => {
    const dto = plainToInstance(CreateCommunityDto, { ...base, phone: ' (42) 3436-1234 ', email: ' matriz@paroquia.org ' });
    expect(dto.phone).toBe('(42) 3436-1234');
    expect(dto.email).toBe('matriz@paroquia.org');
  });
});
