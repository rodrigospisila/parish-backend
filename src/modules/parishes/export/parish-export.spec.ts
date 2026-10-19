import { PassThrough } from 'stream';
import * as zlib from 'zlib';
import { ZipStreamWriter, crc32 } from './zip-stream';
import { writeParishExport } from './parish-export';
import { civilDate, csvCell } from './csv';

/** Leitor mínimo de ZIP (diretório central) para conferir o que o escritor gerou. */
function readZip(zip: Buffer): Map<string, Buffer> {
  const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  expect(eocd).toBeGreaterThan(0);
  const count = zip.readUInt16LE(eocd + 10);
  let p = zip.readUInt32LE(eocd + 16);
  const files = new Map<string, Buffer>();
  for (let i = 0; i < count; i++) {
    expect(zip.readUInt32LE(p)).toBe(0x02014b50);
    const flags = zip.readUInt16LE(p + 8);
    expect(flags & 0x0800).toBeTruthy(); // nome UTF-8
    const crc = zip.readUInt32LE(p + 16);
    const csize = zip.readUInt32LE(p + 20);
    const size = zip.readUInt32LE(p + 24);
    const nameLen = zip.readUInt16LE(p + 28);
    const offset = zip.readUInt32LE(p + 42);
    const name = zip.subarray(p + 46, p + 46 + nameLen).toString('utf8');
    expect(zip.readUInt32LE(offset)).toBe(0x04034b50);
    const localNameLen = zip.readUInt16LE(offset + 26);
    const start = offset + 30 + localNameLen;
    const data = zlib.inflateRawSync(zip.subarray(start, start + csize));
    expect(data.length).toBe(size);
    expect(crc32(data)).toBe(crc);
    files.set(name, data);
    p += 46 + nameLen;
  }
  return files;
}

async function collect(run: (out: PassThrough) => Promise<unknown>): Promise<Buffer> {
  const out = new PassThrough();
  const chunks: Buffer[] = [];
  out.on('data', (c: Buffer) => chunks.push(c));
  await run(out);
  out.end();
  return Buffer.concat(chunks);
}

describe('ZipStreamWriter', () => {
  it('gera ZIP válido em stream (deflate, CRC, nomes UTF-8, arquivo grande em pedaços)', async () => {
    const big = 'linha;com;acentuação\r\n'.repeat(20000);
    const zip = await collect(async (out) => {
      const writer = new ZipStreamWriter(out, new Date('2026-10-19T15:00:00Z'));
      await writer.addFile('ação.csv', async (write) => {
        for (let i = 0; i < 10; i++) await write(big.slice(i * (big.length / 10), (i + 1) * (big.length / 10)));
      });
      await writer.addFile('vazio.txt', async () => undefined);
      await writer.finish();
    });
    const files = readZip(zip);
    expect([...files.keys()]).toEqual(['ação.csv', 'vazio.txt']);
    expect(files.get('ação.csv')!.toString('utf8')).toBe(big);
    expect(files.get('vazio.txt')!.length).toBe(0);
    expect(zip.length).toBeLessThan(Buffer.byteLength(big) / 10); // comprimido
  });

  it('crc32 confere com o valor conhecido', () => {
    expect(crc32(Buffer.from('123456789'))).toBe(0xcbf43926);
  });

  it('para quando o download é interrompido', async () => {
    const out = new PassThrough();
    const writer = new ZipStreamWriter(out);
    out.destroy();
    await expect(writer.addFile('x.csv', async (write) => write('a'))).rejects.toThrow('Download interrompido');
  });
});

describe('CSV', () => {
  it('protege fórmula, escapa aspas e mostra nascimento sem ano como dd/mm', () => {
    expect(csvCell('=SOMA(A1)')).toBe(`"'=SOMA(A1)"`);
    expect(csvCell('diz "oi"')).toBe('"diz ""oi"""');
    expect(csvCell(null)).toBe('""');
    expect(civilDate(new Date(Date.UTC(1900, 4, 12)))).toBe('12/05');
    expect(civilDate(new Date(Date.UTC(1980, 4, 12)))).toBe('12/05/1980');
  });
});

describe('writeParishExport', () => {
  const page = (rows: any[]) => jest.fn().mockResolvedValueOnce(rows).mockResolvedValue([]);
  let prisma: any;

  beforeEach(() => {
    prisma = {
      community: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'c1', name: 'Matriz São José', address: 'Rua A', city: 'Imbituva', state: 'PR', zipCode: '84430000',
            phone: null, email: null, website: null, coordinatorName: null, latitude: -25.2, longitude: -50.6,
            status: 'ACTIVE', deletedAt: null, createdAt: new Date('2026-01-01T12:00:00Z') },
        ]),
      },
      member: {
        findMany: page([
          { id: 'm1', fullName: 'Maria Souza', birthDate: new Date(Date.UTC(1900, 4, 12)), cpf: '52998224725', rg: null,
            gender: 'FEMALE', maritalStatus: null, occupation: null, phone: '+5542999990000', email: null,
            zipCode: null, street: null, number: null, complement: null, neighborhood: null, city: null, state: null,
            fatherName: null, motherName: null, communityId: 'c1', memberType: null, status: 'ACTIVE', userId: 'u1',
            consentGiven: true, consentDate: null, notes: '=cmd', createdAt: new Date('2026-02-01T12:00:00Z'),
            spouse: null, responsible: null, communityLinks: [] },
        ]),
      },
      sacrament: {
        findMany: page([
          { id: 's1', type: 'BAPTISM', date: new Date(Date.UTC(1990, 0, 2)), recordKind: 'RECORD', book: '3',
            page: '12', term: '45', place: null, minister: 'Pe. João', notes: null, memberId: 'm9',
            personSnapshot: { fullName: 'Ana Antiga', birthDate: '1989-12-01T00:00:00.000Z' },
            member: { fullName: 'Usuário Anônimo', birthDate: null, fatherName: null, motherName: null,
              status: 'ANONYMIZED', communityId: 'c1' } },
        ]),
      },
      communityPastoral: { findMany: page([]) },
      pastoralMember: { findMany: page([]) },
      schedule: { findMany: page([]) },
      catechesisClass: { findMany: page([]) },
      catechesisEnrollment: { findMany: page([]) },
      tither: { findMany: page([]) },
      titheContribution: { findMany: page([]) },
      financialTransaction: {
        findMany: page([
          { id: 'f1', date: new Date('2026-10-01T15:00:00Z'), type: 'INCOME', category: 'Dízimo', costCenter: null,
            accountName: null, communityId: null, description: 'Dízimo 2026-10', amount: 150.5, reversalOfId: null,
            createdAt: new Date('2026-10-01T15:00:00Z') },
        ]),
      },
    };
  });

  it('um CSV por entidade (BOM, ";"), LEIA-ME com contagens; só a paróquia pedida', async () => {
    let summary: any[] = [];
    const zip = await collect(async (out) => {
      summary = await writeParishExport(
        prisma,
        {
          parish: { id: 'p1', name: 'Paróquia São José', city: 'Imbituva', state: 'PR', cnpj: '11.222.333/0001-81' },
          generatedBy: 'Pe. Titular',
          now: new Date('2026-10-19T15:00:00Z'),
        },
        out,
      );
    });
    const files = readZip(zip);
    expect([...files.keys()]).toEqual([
      'comunidades.csv', 'membros.csv', 'sacramentos.csv', 'pastorais.csv', 'pastorais-membros.csv',
      'escalas-futuras.csv', 'catequese-turmas.csv', 'catequese-matriculas.csv', 'dizimistas.csv',
      'dizimo-contribuicoes.csv', 'financeiro-lancamentos.csv', 'LEIA-ME.txt',
    ]);
    const membros = files.get('membros.csv')!.toString('utf8');
    expect(membros.startsWith('﻿"ID";"Nome completo";"Nascimento"')).toBe(true);
    expect(membros).toContain('"m1";"Maria Souza";"12/05";"52998224725"');
    expect(membros).toContain(`"'=cmd"`);
    expect(membros).toContain('"Matriz São José"');
    // Assento de cadastro anonimizado: a pessoa vem do snapshot do livro
    expect(files.get('sacramentos.csv')!.toString('utf8')).toContain('"Batismo";"02/01/1990";"Assento (livro da paróquia)";"3";"12";"45"');
    expect(files.get('sacramentos.csv')!.toString('utf8')).toContain('"Ana Antiga";"01/12/1989"');
    expect(files.get('financeiro-lancamentos.csv')!.toString('utf8')).toContain('"Entrada";"Dízimo";"";"";"(paróquia)";"Dízimo 2026-10";"150,50"');
    const readme = files.get('LEIA-ME.txt')!.toString('utf8');
    expect(readme).toContain('Paróquia São José');
    expect(readme).toContain('CNPJ 11.222.333/0001-81');
    expect(readme).toContain('19/10/2026');
    expect(readme).toContain('- membros.csv: Pessoas cadastradas (comunidade principal na paróquia) (1 linha)');
    expect(summary.find((f) => f.name === 'sacramentos.csv').rows).toBe(1);

    // Escopo: tudo filtrado pelas comunidades DA paróquia (ou parishId no financeiro)
    expect(prisma.community.findMany.mock.calls[0][0].where).toEqual({ parishId: 'p1' });
    expect(prisma.member.findMany.mock.calls[0][0].where.AND[0]).toEqual({ communityId: { in: ['c1'] }, deletedAt: null });
    expect(prisma.sacrament.findMany.mock.calls[0][0].where.AND[0]).toEqual({ member: { communityId: { in: ['c1'] } } });
    expect(prisma.financialTransaction.findMany.mock.calls[0][0].where.AND[0]).toEqual({
      OR: [{ parishId: 'p1' }, { communityId: { in: ['c1'] } }],
    });
    expect(prisma.schedule.findMany.mock.calls[0][0].where.AND[0].date.gte).toEqual(new Date('2026-10-19T03:00:00Z'));
  });
});
