import { Gender } from '@prisma/client';
import { normalizeBrazilianPhone } from '../messaging/log-mask';
import { isValidCpf, onlyDigits } from './br-documents';

/**
 * Regras PURAS da importação de planilhas (C5 — saas-implantacao-09/ux-web-03):
 * leitura das colunas, datas, telefone, CPF e a chave de duplicidade. O
 * banco fica no MemberImportService.
 */

export const IMPORT_MAX_ROWS = 2000;

export type ImportKind = 'MEMBERS' | 'TITHERS';
export type ImportAction = 'CREATE' | 'UPDATE' | 'SKIP';
export type DuplicateReason = 'CPF' | 'PHONE' | 'NAME_BIRTH';

/**
 * Colunas aceitas (chave canônica → apelidos). O painel mapeia as colunas da
 * planilha para as chaves canônicas; os apelidos cobrem quem chama a API com
 * o cabeçalho cru ("Nome", "Telefone", "Data de nascimento"...). A comparação
 * ignora caixa, acento, espaço e pontuação.
 */
const FIELD_ALIASES: Record<string, string[]> = {
  fullName: ['fullname', 'nome', 'name', 'nomecompleto'],
  cpf: ['cpf'],
  rg: ['rg', 'identidade'],
  email: ['email', 'correioeletronico'],
  phone: ['phone', 'telefone', 'celular', 'whatsapp', 'fone', 'telefonecelular'],
  birthDate: ['birthdate', 'nascimento', 'datanascimento', 'datadenascimento', 'aniversario', 'dtnascimento'],
  gender: ['gender', 'sexo', 'genero'],
  notes: ['notes', 'observacoes', 'observacao', 'obs'],
  zipCode: ['zipcode', 'cep'],
  street: ['street', 'endereco', 'rua', 'logradouro'],
  number: ['number', 'numero', 'num'],
  complement: ['complement', 'complemento'],
  neighborhood: ['neighborhood', 'bairro'],
  city: ['city', 'cidade', 'municipio'],
  state: ['state', 'uf', 'estado'],
  fatherName: ['fathername', 'pai', 'nomedopai', 'nomepai'],
  motherName: ['mothername', 'mae', 'nomedamae', 'nomemae'],
  // Dizimistas
  registrationNumber: [
    'registrationnumber', 'numerodizimista', 'ndizimista', 'nodizimista', 'dizimista', 'envelope', 'registro',
    'matricula', 'carne',
  ],
  joinedAt: ['joinedat', 'desde', 'dataadesao', 'adesao', 'dizimistadesde', 'datacadastro'],
};

const foldKey = (key: string) =>
  key
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const ALIAS_INDEX: Map<string, string> = (() => {
  const index = new Map<string, string>();
  for (const [canonical, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) index.set(alias, canonical);
  }
  return index;
})();

/** Linha crua → chaves canônicas (primeiro valor não vazio de cada campo). */
export function canonicalRow(row: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(row ?? {})) {
    const canonical = ALIAS_INDEX.get(foldKey(key));
    if (!canonical) continue;
    const value = raw === null || raw === undefined ? '' : String(raw).replace(/\s+/g, ' ').trim();
    if (value && !out[canonical]) out[canonical] = value;
  }
  return out;
}

/** Nome sem acento, minúsculo e com espaços colapsados (chave de duplicidade). */
export function foldName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Data da planilha → Date à meia-noite UTC (o formato que o cadastro grava).
 * Aceita dd/mm/aaaa, dd/mm/aa, dd-mm-aaaa, dd.mm.aaaa, AAAA-MM-DD (com ou sem
 * hora) e dd/mm SEM ANO — que vira o ano 1900, a convenção do sistema para
 * "só dia/mês" (idade oculta). `null` = vazio; `'invalid'` = não dá para ler.
 */
export function parseImportDate(
  raw: string | undefined,
  opts: { allowNoYear?: boolean; now?: Date } = {},
): { date: Date; yearUnknown: boolean } | null | 'invalid' {
  const value = (raw ?? '').trim();
  if (!value) return null;
  const now = opts.now ?? new Date();
  let year: number;
  let month: number;
  let day: number;
  let yearUnknown = false;

  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(value);
  if (m) {
    year = Number(m[1]);
    month = Number(m[2]);
    day = Number(m[3]);
  } else if ((m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(value))) {
    day = Number(m[1]);
    month = Number(m[2]);
    year = Number(m[3]);
    if (m[3].length === 2) {
      // 2 dígitos: até o ano corrente é 20xx, senão 19xx
      const currentYY = now.getUTCFullYear() % 100;
      year += year <= currentYY ? 2000 : 1900;
    }
  } else if (opts.allowNoYear !== false && (m = /^(\d{1,2})[/.-](\d{1,2})$/.exec(value))) {
    day = Number(m[1]);
    month = Number(m[2]);
    year = 1900;
    yearUnknown = true;
  } else {
    return 'invalid';
  }

  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) return 'invalid';
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return 'invalid';
  if (date.getTime() > now.getTime()) return 'invalid';
  if (year === 1900) yearUnknown = true;
  return { date, yearUnknown };
}

export function parseGender(raw: string | undefined): Gender | null | 'invalid' {
  const value = foldKey(raw ?? '');
  if (!value) return null;
  if (['m', 'masc', 'masculino', 'homem', 'male'].includes(value)) return Gender.MALE;
  if (['f', 'fem', 'feminino', 'mulher', 'female'].includes(value)) return Gender.FEMALE;
  if (['o', 'outro', 'other'].includes(value)) return Gender.OTHER;
  return 'invalid';
}

/** Campos do Member que a importação grava (todos opcionais, menos o nome). */
export interface ImportMemberData {
  fullName: string;
  cpf: string | null;
  rg: string | null;
  email: string | null;
  phone: string | null;
  birthDate: Date | null;
  gender: Gender | null;
  notes: string | null;
  zipCode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  fatherName: string | null;
  motherName: string | null;
}

export interface ParsedImportRow {
  line: number;
  data: ImportMemberData | null;
  /** Dizimistas: nº de registro/envelope e data de adesão */
  tither: { registrationNumber: string | null; joinedAt: Date | null } | null;
  errors: string[];
  warnings: string[];
  /** Chaves de duplicidade */
  nameKey: string;
  phoneDigits: string | null;
  birthKey: string | null;
  birthYearUnknown: boolean;
}

const cut = (value: string | undefined, max: number) => {
  const v = (value ?? '').trim();
  return v ? v.slice(0, max) : null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** As 27 UFs: sigla → nome por extenso (S19). */
export const BRAZIL_UFS: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
};

/** Nome por extenso sem acento/caixa/pontuação → sigla ("parana" → PR, "pará" → PA). */
const UF_BY_NAME: Map<string, string> = new Map(
  Object.entries(BRAZIL_UFS).map(([uf, name]) => [foldKey(name), uf]),
);

/**
 * UF da planilha → sigla (S19): aceita a sigla ("pr", "PR") ou o nome por
 * extenso sem depender de acento/caixa ("Paraná", "PARANA", "são paulo").
 * Nada de cortar em 2 letras ("Paraná" virava "PA", o Pará): o que não for
 * sigla nem nome conhecido devolve null (a linha ganha um aviso).
 */
export function parseUf(value: string | null | undefined): string | null {
  const folded = foldKey(String(value ?? ''));
  if (!folded) return null;
  const upper = folded.toUpperCase();
  if (folded.length === 2 && BRAZIL_UFS[upper]) return upper;
  return UF_BY_NAME.get(folded) ?? null;
}

/** Valida e normaliza UMA linha (erros e avisos ficam na própria linha). */
export function parseImportRow(
  raw: Record<string, unknown>,
  line: number,
  kind: ImportKind,
  now: Date = new Date(),
): ParsedImportRow {
  const row = canonicalRow(raw);
  const errors: string[] = [];
  const warnings: string[] = [];

  const fullName = cut(row.fullName, 200);
  if (!fullName) errors.push('Nome ausente');
  else if (fullName.length < 3) errors.push('Nome muito curto');

  let cpf: string | null = null;
  if (row.cpf) {
    if (!isValidCpf(row.cpf)) errors.push('CPF inválido (confira os dígitos)');
    else cpf = onlyDigits(row.cpf);
  }

  let email: string | null = null;
  if (row.email) {
    const candidate = row.email.toLowerCase();
    if (!EMAIL_RE.test(candidate) || candidate.length > 200) errors.push('E-mail inválido');
    else email = candidate;
  }

  let phone: string | null = null;
  let phoneDigits: string | null = null;
  if (row.phone) {
    const normalized = normalizeBrazilianPhone(row.phone);
    if (normalized) {
      phone = normalized;
      phoneDigits = onlyDigits(normalized);
    } else {
      // Mesmo comportamento do cadastro: fica como digitado, mas avisa
      phone = row.phone.slice(0, 40);
      phoneDigits = onlyDigits(row.phone) || null;
      warnings.push('Telefone fora do padrão (DDD + número) — gravado como digitado');
    }
  }

  let birthDate: Date | null = null;
  let birthYearUnknown = false;
  if (row.birthDate) {
    const parsed = parseImportDate(row.birthDate, { now });
    if (parsed === 'invalid') errors.push('Data de nascimento inválida (use dd/mm/aaaa, dd/mm ou AAAA-MM-DD)');
    else if (parsed) {
      birthDate = parsed.date;
      birthYearUnknown = parsed.yearUnknown;
      if (parsed.yearUnknown) warnings.push('Nascimento sem ano — gravado só dia/mês (idade oculta)');
    }
  }

  const gender = parseGender(row.gender);
  if (gender === 'invalid') warnings.push('Sexo não reconhecido — ignorado (use M ou F)');

  const state = row.state ? parseUf(row.state) : null;
  if (row.state && !state) {
    warnings.push(`Estado "${row.state.slice(0, 40)}" não reconhecido — deixado em branco (use a sigla, ex.: PR)`);
  }

  let tither: ParsedImportRow['tither'] = null;
  if (kind === 'TITHERS') {
    let joinedAt: Date | null = null;
    if (row.joinedAt) {
      const parsed = parseImportDate(row.joinedAt, { now, allowNoYear: false });
      if (parsed === 'invalid' || (parsed && parsed.yearUnknown)) {
        errors.push('Data de adesão ao dízimo inválida (use dd/mm/aaaa ou AAAA-MM-DD)');
      } else if (parsed) {
        joinedAt = parsed.date;
      }
    }
    tither = { registrationNumber: cut(row.registrationNumber, 40), joinedAt };
  }

  const data: ImportMemberData | null = fullName
    ? {
        fullName,
        cpf,
        rg: cut(row.rg, 30),
        email,
        phone,
        birthDate,
        gender: gender === 'invalid' ? null : gender,
        notes: cut(row.notes, 1000),
        zipCode: row.zipCode ? (onlyDigits(row.zipCode).slice(0, 8) || null) : null,
        street: cut(row.street, 200),
        number: cut(row.number, 20),
        complement: cut(row.complement, 100),
        neighborhood: cut(row.neighborhood, 100),
        city: cut(row.city, 100),
        state,
        fatherName: cut(row.fatherName, 200),
        motherName: cut(row.motherName, 200),
      }
    : null;

  return {
    line,
    data,
    tither,
    errors,
    warnings,
    nameKey: fullName ? foldName(fullName) : '',
    phoneDigits,
    birthKey: birthDate ? birthDate.toISOString().slice(0, 10) : null,
    birthYearUnknown,
  };
}
