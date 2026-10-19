import { Prisma } from '@prisma/client';
import { Writable } from 'stream';
import { PrismaService } from '../../../database/prisma.service';
import { personForRecord } from '../../sacraments/sacrament-record';
import { ZipStreamWriter } from './zip-stream';
import { CSV_BOM, brDate, brDateTime, brMoney, civilDate, csvLine, label, yesNo } from './csv';

/**
 * Exportação de TODOS os dados da paróquia (saas-implantacao-19 — portabilidade
 * do controlador): um ZIP com uma planilha CSV por entidade + LEIA-ME.txt.
 * Tudo é lido em lotes (cursor por id) e escrito direto na resposta — nada é
 * montado inteiro em memória. Escopo: comunidades da paróquia (inclusive
 * arquivadas) e lançamentos com `parishId` da paróquia. Pessoas entram pelo
 * cadastro PRINCIPAL numa comunidade da paróquia — quem só tem vínculo
 * secundário pertence a outra paróquia e fica de fora.
 */

const BATCH = 500;

export interface ExportFileSummary {
  name: string;
  description: string;
  rows: number;
}

export interface ParishExportContext {
  parish: { id: string; name: string; city: string; state: string; cnpj: string | null };
  generatedBy: string;
  now?: Date;
}

/** Lê `where` em lotes por id crescente (estável, sem OFFSET). */
async function* batches<T extends { id: string }>(
  fetch: (where: { id?: { gt: string } }, take: number) => Promise<T[]>,
): AsyncGenerator<T> {
  let cursor: string | undefined;
  for (;;) {
    const rows = await fetch(cursor ? { id: { gt: cursor } } : {}, BATCH);
    for (const row of rows) yield row;
    if (rows.length < BATCH) return;
    cursor = rows[rows.length - 1].id;
  }
}

/** Início do dia de hoje no fuso de Brasília (-03). */
function startOfTodayBrt(now: Date): Date {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
  return new Date(`${day}T00:00:00-03:00`);
}

export async function writeParishExport(
  prisma: PrismaService,
  ctx: ParishExportContext,
  out: Writable,
): Promise<ExportFileSummary[]> {
  const now = ctx.now ?? new Date();
  const zip = new ZipStreamWriter(out, now);
  const files: ExportFileSummary[] = [];
  const parishId = ctx.parish.id;

  const communities = await prisma.community.findMany({
    where: { parishId },
    select: {
      id: true, name: true, address: true, city: true, state: true, zipCode: true, phone: true, email: true,
      website: true, coordinatorName: true, latitude: true, longitude: true, status: true, deletedAt: true,
      createdAt: true,
    },
    orderBy: { name: 'asc' },
  });
  const communityIds = communities.map((c) => c.id);
  const communityName = new Map(communities.map((c) => [c.id, c.name]));
  const inParish = { in: communityIds };

  const csv = async (
    name: string,
    description: string,
    headers: string[],
    rows: () => AsyncGenerator<unknown[]> | Iterable<unknown[]>,
  ) => {
    let count = 0;
    await zip.addFile(name, async (write) => {
      await write(CSV_BOM + csvLine(headers));
      let buffer = '';
      for await (const row of rows() as AsyncIterable<unknown[]>) {
        buffer += csvLine(row);
        count++;
        if (buffer.length > 64 * 1024) {
          await write(buffer);
          buffer = '';
        }
      }
      if (buffer) await write(buffer);
    });
    files.push({ name, description, rows: count });
  };

  // 1. Comunidades
  await csv(
    'comunidades.csv',
    'Comunidades (matriz e capelas), inclusive as arquivadas',
    ['ID', 'Nome', 'Endereço', 'Cidade', 'UF', 'CEP', 'Telefone', 'E-mail', 'Site', 'Coordenação', 'Latitude',
      'Longitude', 'Situação', 'Arquivada em', 'Cadastrada em'],
    function* () {
      for (const c of communities) {
        yield [c.id, c.name, c.address, c.city, c.state, c.zipCode, c.phone, c.email, c.website, c.coordinatorName,
          c.latitude ?? '', c.longitude ?? '', label('entityStatus', c.status), brDate(c.deletedAt), brDate(c.createdAt)];
      }
    },
  );

  // 2. Membros (cadastro principal na paróquia)
  await csv(
    'membros.csv',
    'Pessoas cadastradas (comunidade principal na paróquia)',
    ['ID', 'Nome completo', 'Nascimento', 'CPF', 'RG', 'Sexo', 'Estado civil', 'Profissão', 'Celular', 'E-mail',
      'CEP', 'Rua', 'Número', 'Complemento', 'Bairro', 'Cidade', 'UF', 'Pai', 'Mãe', 'Cônjuge', 'Responsável',
      'Comunidade principal', 'Outras comunidades', 'Classificação', 'Situação', 'Tem conta no app',
      'Consentimento (LGPD)', 'Data do consentimento', 'Observações', 'Cadastrado em'],
    async function* () {
      const rows = batches((cursor, take) =>
        prisma.member.findMany({
          where: { AND: [{ communityId: inParish, deletedAt: null }, cursor] },
          orderBy: { id: 'asc' },
          take,
          select: {
            id: true, fullName: true, birthDate: true, cpf: true, rg: true, gender: true, maritalStatus: true,
            occupation: true, phone: true, email: true, zipCode: true, street: true, number: true, complement: true,
            neighborhood: true, city: true, state: true, fatherName: true, motherName: true, communityId: true,
            memberType: true, status: true, userId: true, consentGiven: true, consentDate: true, notes: true,
            createdAt: true,
            spouse: { select: { fullName: true } },
            responsible: { select: { fullName: true } },
            communityLinks: {
              where: { isActive: true, isPrimary: false },
              select: { community: { select: { name: true } } },
            },
          },
        }),
      );
      for await (const m of rows) {
        yield [m.id, m.fullName, civilDate(m.birthDate), m.cpf, m.rg, label('gender', m.gender),
          label('maritalStatus', m.maritalStatus), m.occupation, m.phone, m.email, m.zipCode, m.street, m.number,
          m.complement, m.neighborhood, m.city, m.state, m.fatherName, m.motherName, m.spouse?.fullName,
          m.responsible?.fullName, communityName.get(m.communityId),
          m.communityLinks.map((l) => l.community.name).join(', '), label('memberType', m.memberType),
          label('memberStatus', m.status), yesNo(!!m.userId), yesNo(m.consentGiven), brDate(m.consentDate), m.notes,
          brDate(m.createdAt)];
      }
    },
  );

  // 3. Sacramentos (assentos do livro e sacramentos informados)
  await csv(
    'sacramentos.csv',
    'Sacramentos com livro/folha/termo (assentos da paróquia e sacramentos informados)',
    ['ID', 'Sacramento', 'Data', 'Tipo de registro', 'Livro', 'Folha', 'Termo', 'Local', 'Ministro', 'Pessoa',
      'Nascimento', 'Pai', 'Mãe', 'ID do membro', 'Comunidade', 'Observações'],
    async function* () {
      const rows = batches((cursor, take) =>
        prisma.sacrament.findMany({
          where: { AND: [{ member: { communityId: inParish } }, cursor] },
          orderBy: { id: 'asc' },
          take,
          select: {
            id: true, type: true, date: true, recordKind: true, book: true, page: true, term: true, place: true,
            minister: true, notes: true, personSnapshot: true, memberId: true,
            member: {
              select: { fullName: true, birthDate: true, fatherName: true, motherName: true, status: true, communityId: true },
            },
          },
        }),
      );
      for await (const s of rows) {
        const person = personForRecord(s.member, s.personSnapshot);
        yield [s.id, label('sacramentType', s.type), civilDate(s.date), label('recordKind', s.recordKind), s.book,
          s.page, s.term, s.place, s.minister, person?.fullName ?? '(anonimizado)', civilDate(person?.birthDate),
          person?.fatherName, person?.motherName, s.memberId, communityName.get(s.member.communityId), s.notes];
      }
    },
  );

  // 4. Pastorais e seus membros
  await csv(
    'pastorais.csv',
    'Pastorais, movimentos e ministérios de cada comunidade',
    ['ID', 'Comunidade', 'Pastoral', 'Tipo', 'Situação', 'Descrição', 'Missão', 'Fundada em', 'Arquivada em'],
    async function* () {
      const rows = batches((cursor, take) =>
        prisma.communityPastoral.findMany({
          where: { AND: [{ communityId: inParish }, cursor] },
          orderBy: { id: 'asc' },
          take,
          select: {
            id: true, communityId: true, status: true, description: true, mission: true, foundedAt: true,
            deletedAt: true, globalPastoral: { select: { name: true, kind: true } },
          },
        }),
      );
      for await (const p of rows) {
        yield [p.id, communityName.get(p.communityId), p.globalPastoral.name, label('pastoralKind', p.globalPastoral.kind),
          label('entityStatus', p.status), p.description, p.mission, civilDate(p.foundedAt), brDate(p.deletedAt)];
      }
    },
  );

  await csv(
    'pastorais-membros.csv',
    'Quem participa de cada pastoral (e grupo)',
    ['ID', 'Pastoral', 'Comunidade', 'Grupo', 'ID do membro', 'Nome', 'Função', 'Ativo', 'Entrou em', 'Saiu em'],
    async function* () {
      const rows = batches((cursor, take) =>
        prisma.pastoralMember.findMany({
          where: {
            AND: [
              {
                OR: [
                  { communityPastoral: { communityId: inParish } },
                  { pastoralGroup: { communityPastoral: { communityId: inParish } } },
                ],
              },
              cursor,
            ],
          },
          orderBy: { id: 'asc' },
          take,
          select: {
            id: true, role: true, isActive: true, joinedAt: true, leftAt: true, memberId: true,
            member: { select: { fullName: true } },
            communityPastoral: { select: { communityId: true, globalPastoral: { select: { name: true } } } },
            pastoralGroup: {
              select: {
                name: true,
                communityPastoral: { select: { communityId: true, globalPastoral: { select: { name: true } } } },
              },
            },
          },
        }),
      );
      for await (const pm of rows) {
        const pastoral = pm.communityPastoral ?? pm.pastoralGroup?.communityPastoral ?? null;
        yield [pm.id, pastoral?.globalPastoral.name, pastoral ? communityName.get(pastoral.communityId) : '',
          pm.pastoralGroup?.name, pm.memberId, pm.member.fullName, pm.role, yesNo(pm.isActive), brDate(pm.joinedAt),
          brDate(pm.leftAt)];
      }
    },
  );

  // 5. Escalas a partir de hoje (uma linha por pessoa escalada)
  const today = startOfTodayBrt(now);
  await csv(
    'escalas-futuras.csv',
    'Escalas de hoje em diante, uma linha por pessoa escalada',
    ['ID da escala', 'Data', 'Início', 'Fim', 'Título', 'Comunidade', 'Local', 'Situação da escala', 'Função',
      'Pessoa', 'ID do membro', 'Pastoral', 'Confirmação'],
    async function* () {
      const rows = batches((cursor, take) =>
        prisma.schedule.findMany({
          where: {
            AND: [
              { deletedAt: null, date: { gte: today } },
              { OR: [{ communityId: inParish }, { event: { communityId: inParish } }] },
              cursor,
            ],
          },
          orderBy: { id: 'asc' },
          take,
          select: {
            id: true, date: true, title: true, startTime: true, endTime: true, location: true, status: true,
            communityId: true, event: { select: { communityId: true, startDate: true } },
            assignments: {
              select: {
                role: true, status: true, memberId: true, member: { select: { fullName: true } },
                communityPastoral: { select: { globalPastoral: { select: { name: true } } } },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        }),
      );
      for await (const s of rows) {
        const community = communityName.get(s.communityId ?? s.event?.communityId ?? '');
        const base = [s.id, brDate(s.date), s.startTime ?? '', s.endTime ?? '', s.title, community, s.location,
          label('scheduleStatus', s.status)];
        if (!s.assignments.length) {
          yield [...base, '', '', '', '', ''];
          continue;
        }
        for (const a of s.assignments) {
          yield [...base, a.role, a.member.fullName, a.memberId, a.communityPastoral?.globalPastoral.name,
            label('assignmentStatus', a.status)];
        }
      }
    },
  );

  // 6. Catequese
  await csv(
    'catequese-turmas.csv',
    'Turmas da catequese',
    ['ID', 'Turma', 'Ano', 'Etapa', 'Comunidade', 'Dia da semana', 'Horário', 'Sala', 'Vagas', 'Situação',
      'Arquivada em'],
    async function* () {
      const rows = batches((cursor, take) =>
        prisma.catechesisClass.findMany({
          where: { AND: [{ communityId: inParish }, cursor] },
          orderBy: { id: 'asc' },
          take,
          select: {
            id: true, name: true, year: true, weekday: true, time: true, room: true, capacity: true, status: true,
            deletedAt: true, communityId: true, stage: { select: { name: true } },
          },
        }),
      );
      for await (const c of rows) {
        yield [c.id, c.name, c.year, c.stage.name, communityName.get(c.communityId), label('weekday', c.weekday),
          c.time, c.room, c.capacity ?? '', label('entityStatus', c.status), brDate(c.deletedAt)];
      }
    },
  );

  await csv(
    'catequese-matriculas.csv',
    'Matrículas da catequese (catequizando por turma)',
    ['ID', 'Turma', 'Ano', 'ID do membro', 'Catequizando', 'Nascimento', 'Responsável', 'Situação', 'Sem batismo',
      'Matriculado em', 'Concluído em'],
    async function* () {
      const rows = batches((cursor, take) =>
        prisma.catechesisEnrollment.findMany({
          where: { AND: [{ class: { communityId: inParish } }, cursor] },
          orderBy: { id: 'asc' },
          take,
          select: {
            id: true, status: true, unbaptized: true, enrolledAt: true, completedAt: true, memberId: true,
            class: { select: { name: true, year: true } },
            member: { select: { fullName: true, birthDate: true, responsible: { select: { fullName: true } } } },
          },
        }),
      );
      for await (const e of rows) {
        yield [e.id, e.class.name, e.class.year, e.memberId, e.member.fullName, civilDate(e.member.birthDate),
          e.member.responsible?.fullName, label('enrollmentStatus', e.status), yesNo(e.unbaptized),
          brDate(e.enrolledAt), brDate(e.completedAt)];
      }
    },
  );

  // 7. Dízimo
  await csv(
    'dizimistas.csv',
    'Dizimistas (registro e situação)',
    ['ID', 'Nº do dizimista', 'Nome', 'ID do membro', 'Comunidade', 'Situação', 'Dizimista desde'],
    async function* () {
      const rows = batches((cursor, take) =>
        prisma.tither.findMany({
          where: { AND: [{ member: { communityId: inParish } }, cursor] },
          orderBy: { id: 'asc' },
          take,
          select: {
            id: true, registrationNumber: true, status: true, joinedAt: true, memberId: true,
            member: { select: { fullName: true, communityId: true } },
          },
        }),
      );
      for await (const t of rows) {
        yield [t.id, t.registrationNumber, t.member.fullName, t.memberId, communityName.get(t.member.communityId),
          label('titherStatus', t.status), brDate(t.joinedAt)];
      }
    },
  );

  await csv(
    'dizimo-contribuicoes.csv',
    'Contribuições do dízimo',
    ['ID', 'Nº do dizimista', 'Dizimista', 'ID do membro', 'Comunidade', 'Mês de referência', 'Data', 'Valor (R$)',
      'Meio', 'Recibo'],
    async function* () {
      const rows = batches((cursor, take) =>
        prisma.titheContribution.findMany({
          where: { AND: [{ tither: { member: { communityId: inParish } } }, cursor] },
          orderBy: { id: 'asc' },
          take,
          select: {
            id: true, amount: true, date: true, referenceMonth: true, method: true, receiptNumber: true,
            tither: {
              select: { registrationNumber: true, memberId: true, member: { select: { fullName: true, communityId: true } } },
            },
          },
        }),
      );
      for await (const c of rows) {
        yield [c.id, c.tither.registrationNumber, c.tither.member.fullName, c.tither.memberId,
          communityName.get(c.tither.member.communityId), c.referenceMonth, brDate(c.date), brMoney(c.amount),
          c.method, c.receiptNumber];
      }
    },
  );

  // 8. Financeiro
  const financeWhere: Prisma.FinancialTransactionWhereInput = {
    OR: [{ parishId }, { communityId: inParish }],
  };
  await csv(
    'financeiro-lancamentos.csv',
    'Lançamentos financeiros (entradas e saídas)',
    ['ID', 'Data', 'Tipo', 'Categoria', 'Centro de custo', 'Conta', 'Comunidade', 'Descrição', 'Valor (R$)',
      'Estorno de', 'Lançado em'],
    async function* () {
      const rows = batches((cursor, take) =>
        prisma.financialTransaction.findMany({
          where: { AND: [financeWhere, cursor] },
          orderBy: { id: 'asc' },
          take,
          select: {
            id: true, date: true, type: true, category: true, costCenter: true, accountName: true, communityId: true,
            description: true, amount: true, reversalOfId: true, createdAt: true,
          },
        }),
      );
      for await (const t of rows) {
        yield [t.id, brDate(t.date), label('transactionType', t.type), t.category, t.costCenter, t.accountName,
          t.communityId ? communityName.get(t.communityId) ?? '' : '(paróquia)', t.description, brMoney(t.amount),
          t.reversalOfId, brDateTime(t.createdAt)];
      }
    },
  );

  // LEIA-ME por último: já sabe quantas linhas cada planilha tem
  await zip.addFile('LEIA-ME.txt', async (write) => {
    await write(buildReadme(ctx, files, now));
  });
  await zip.finish();
  return files;
}

export function buildReadme(ctx: ParishExportContext, files: ExportFileSummary[], now: Date): string {
  const lines = [
    `EXPORTAÇÃO DOS DADOS DA PARÓQUIA — ${ctx.parish.name}`,
    `${ctx.parish.city}/${ctx.parish.state}${ctx.parish.cnpj ? ` · CNPJ ${ctx.parish.cnpj}` : ''}`,
    `Gerada em ${brDateTime(now)} (horário de Brasília) por ${ctx.generatedBy}.`,
    '',
    'ARQUIVOS',
    ...files.map((f) => `- ${f.name}: ${f.description} (${f.rows} linha${f.rows === 1 ? '' : 's'})`),
    '',
    'COMO ABRIR',
    '- Planilhas CSV em UTF-8 com separador ";" — abrem direto no Excel, LibreOffice ou Google Planilhas.',
    '- A primeira linha de cada planilha é o cabeçalho. A coluna "ID" liga as planilhas entre si',
    '  (ex.: "ID do membro" em sacramentos.csv aponta para a coluna "ID" de membros.csv).',
    '',
    'LEGENDA',
    '- Datas no formato dd/mm/aaaa, no horário de Brasília.',
    '- Nascimento só com dia/mês ("dd/mm") = o ano não foi informado no cadastro.',
    '- Valores em reais com vírgula decimal (ex.: 150,00).',
    '- "Tipo de registro" dos sacramentos: "Assento" = registrado no livro desta paróquia (livro/folha/termo);',
    '  "Informado" = sacramento recebido em outra paróquia e apenas anotado aqui.',
    '- "(anonimizado)" = cadastro apagado a pedido do titular (LGPD); o registro canônico/contábil é mantido.',
    '- Textos que começam com =, +, - ou @ recebem um apóstrofo na frente para não virarem fórmula.',
    '- Membros: entram as pessoas cuja comunidade PRINCIPAL é desta paróquia. Escalas: de hoje em diante.',
    '',
    'PROTEÇÃO DE DADOS (LGPD)',
    'Este arquivo contém dados pessoais (inclusive de crianças e dados religiosos, que são sensíveis).',
    'Guarde-o em local seguro, compartilhe só com quem precisa e apague as cópias que não forem mais necessárias.',
    '',
  ];
  return lines.join('\r\n');
}
