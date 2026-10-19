/**
 * CSV para Excel brasileiro: UTF-8 com BOM, separador `;`, linhas CRLF,
 * células entre aspas e proteção contra fórmula (=, +, -, @ no início viram
 * texto com apóstrofo — mesma regra dos CSVs do dízimo/balancete).
 * Identificadores numéricos (CPF, CEP, telefone, nº do dizimista, recibo) saem
 * como `="0123"` para o Excel não apagar os zeros à esquerda (idText, S21).
 */
export const CSV_BOM = '﻿';

/** Marca de célula de identificador (ver idText). */
const FORCED_TEXT = Symbol('csvForcedText');
type ForcedText = { [FORCED_TEXT]: string };

/**
 * S21: o Excel ignora as aspas do CSV ao adivinhar o tipo e transforma CPF
 * "01234567890", CEP "01310100" ou envelope "0153" em número, sem os zeros à
 * esquerda. A célula marcada aqui sai como `="0123"` — o Excel mostra o TEXTO
 * 0123. Só vale para valor feito de dígitos (com o `+` do E.164 opcional):
 * sem aspas, letras, `&` ou parênteses, a "fórmula" é só uma constante de
 * texto e não abre brecha de injeção. Qualquer outro valor segue o caminho
 * normal (aspas + apóstrofo contra fórmula).
 */
export function idText(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  const text = String(value).trim();
  return /^\+?\d{1,40}$/.test(text) ? ({ [FORCED_TEXT]: text } as ForcedText) : value;
}

export function csvCell(value: unknown): string {
  if (value && typeof value === 'object' && FORCED_TEXT in (value as object)) {
    // Só dígitos (e o + do E.164), conferido em idText: nada a escapar
    return `"=""${(value as ForcedText)[FORCED_TEXT]}"""`;
  }
  let text = value === null || value === undefined ? '' : String(value);
  text = text.replace(/[\r\n]+/g, ' ');
  if (/^[=+\-@\t]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function csvLine(cells: unknown[]): string {
  return `${cells.map(csvCell).join(';')}\r\n`;
}

const PUBLIC_TZ = 'America/Sao_Paulo';

/** dd/mm/aaaa no fuso de Brasília (datas com hora: lançamentos, cadastros). */
export function brDate(value: Date | null | undefined): string {
  if (!value) return '';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: PUBLIC_TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(value);
}

/** dd/mm/aaaa hh:mm no fuso de Brasília. */
export function brDateTime(value: Date | null | undefined): string {
  if (!value) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: PUBLIC_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

/**
 * Data CIVIL (nascimento, sacramento, encontro): o dia gravado em UTC
 * (meia-noite UTC ou meio-dia de Brasília caem no mesmo dia UTC). Ano 1900 =
 * só dia/mês conhecidos → "dd/mm".
 */
export function civilDate(value: Date | null | undefined): string {
  if (!value) return '';
  const dd = String(value.getUTCDate()).padStart(2, '0');
  const mm = String(value.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = value.getUTCFullYear();
  return yyyy <= 1900 ? `${dd}/${mm}` : `${dd}/${mm}/${yyyy}`;
}

/** 1234.5 → "1234,50" (o Excel em pt-BR lê como número). */
export function brMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return (Math.round(value * 100) / 100).toFixed(2).replace('.', ',');
}

export function yesNo(value: boolean | null | undefined): string {
  return value ? 'Sim' : 'Não';
}

export const LABELS: Record<string, Record<string, string>> = {
  entityStatus: { ACTIVE: 'Ativa', INACTIVE: 'Inativa' },
  memberStatus: {
    ACTIVE: 'Ativo',
    INACTIVE: 'Inativo',
    DECEASED: 'Falecido',
    ANONYMIZED: 'Anonimizado (LGPD)',
    AWAY: 'Afastado',
    IN_FORMATION: 'Em formação',
    TRANSFERRED: 'Transferido',
    DISENGAGED: 'Desligado',
  },
  gender: { MALE: 'Masculino', FEMALE: 'Feminino', OTHER: 'Outro' },
  maritalStatus: {
    SINGLE: 'Solteiro(a)',
    MARRIED: 'Casado(a)',
    DIVORCED: 'Divorciado(a)',
    WIDOWED: 'Viúvo(a)',
    COMMON_LAW_MARRIAGE: 'União estável',
  },
  memberType: {
    MEMBER: 'Membro',
    AGENT: 'Agente de pastoral',
    COORDINATOR: 'Coordenador(a)',
    CATECHIST: 'Catequista',
    MINISTER: 'Ministro(a)',
    VOLUNTEER: 'Voluntário(a)',
    FAMILY_RESPONSIBLE: 'Responsável familiar',
    CANDIDATE: 'Candidato(a)/formando',
  },
  sacramentType: {
    BAPTISM: 'Batismo',
    FIRST_COMMUNION: 'Primeira Eucaristia',
    CONFIRMATION: 'Crisma',
    MARRIAGE: 'Matrimônio',
    HOLY_ORDERS: 'Ordem',
    ANOINTING_OF_THE_SICK: 'Unção dos Enfermos',
  },
  recordKind: { RECORD: 'Assento (livro da paróquia)', INFORMED: 'Informado (recebido em outra paróquia)' },
  pastoralKind: { PASTORAL: 'Pastoral', MOVEMENT: 'Movimento', MINISTRY: 'Ministério', SERVICE: 'Serviço' },
  scheduleStatus: { OPEN: 'Aberta', CLOSED: 'Fechada', COMPLETED: 'Realizada', CANCELLED: 'Cancelada' },
  assignmentStatus: { PENDING: 'Aguardando', CONFIRMED: 'Confirmado', DECLINED: 'Recusado', EXPIRED: 'Sem resposta' },
  enrollmentStatus: {
    ACTIVE: 'Ativa',
    TRANSFERRED: 'Transferida',
    COMPLETED: 'Concluída',
    DROPPED_OUT: 'Desistência',
    PENDING_APPROVAL: 'Aguardando aprovação',
    REJECTED: 'Não aprovada',
    WAITLISTED: 'Fila de espera',
  },
  titherStatus: { ACTIVE: 'Ativo', INACTIVE: 'Inativo' },
  transactionType: { INCOME: 'Entrada', EXPENSE: 'Saída' },
  weekday: { '0': 'Domingo', '1': 'Segunda', '2': 'Terça', '3': 'Quarta', '4': 'Quinta', '5': 'Sexta', '6': 'Sábado' },
};

export function label(group: keyof typeof LABELS, value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  return LABELS[group][String(value)] ?? String(value);
}
