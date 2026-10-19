import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { SacramentType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { formatCivilDate, PUBLIC_TZ } from '../catechesis/civil-date';
import { personForRecord, SACRAMENT_LABELS } from './sacrament-record';

/** Dados do assento que entram na certidão. */
export interface CertificateRecord {
  type: SacramentType;
  date: Date | null;
  place: string | null;
  minister: string | null;
  book: string | null;
  page: string | null;
  term: string | null;
  personSnapshot?: unknown;
}

export interface CertificateRequest {
  record: CertificateRecord;
  memberId: string;
  /** Comunidade do cabeçalho (do processo); default: a comunidade do membro */
  communityId?: string | null;
  /** SacramentProcess.involved: [{ role, name, memberId? }] — padrinhos/testemunhas */
  involved?: unknown;
  finalidade?: string | null;
  /** Processo celebrado antes do registro da celebração: dados vêm do agendamento */
  legacyFromSchedule?: boolean;
  now?: Date;
}

export type CertificateKind = 'CERTIDAO' | 'DECLARACAO';

export interface CertificateResult {
  buffer: Buffer;
  kind: CertificateKind;
  /** Nome sugerido do arquivo (certidao-batismo.pdf / declaracao-batismo.pdf) */
  filename: string;
  fromSnapshot: boolean;
}

/** Papéis de padrinho/madrinha/testemunha no `involved` do processo. */
const SPONSOR_ROLE = /padrinh|madrinh|godparent|godfather|godmother|sponsor|testemunh|witness/i;

const FILE_SLUG: Record<string, string> = {
  BAPTISM: 'batismo',
  FIRST_COMMUNION: 'primeira-eucaristia',
  CONFIRMATION: 'crisma',
  MARRIAGE: 'matrimonio',
  HOLY_ORDERS: 'ordem',
  ANOINTING_OF_THE_SICK: 'uncao-dos-enfermos',
};

function cleanText(value: unknown, max = 120): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.replace(/[\p{Cc}\p{Cf}]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  return clean || null;
}

/** Nomes dos padrinhos/testemunhas do processo (só papéis reconhecidos). */
export function sponsorNames(involved: unknown): string[] {
  if (!Array.isArray(involved)) return [];
  const names: string[] = [];
  for (const entry of involved.slice(0, 20)) {
    if (!entry || typeof entry !== 'object') continue;
    const role = cleanText((entry as any).role, 60);
    const name = cleanText((entry as any).name);
    if (role && name && SPONSOR_ROLE.test(role)) names.push(name);
  }
  return names;
}

/** Nascimento: ano 1900 = cadastro só com dia/mês (idade oculta). */
function formatBirth(date: Date | null): string {
  if (!date) return 'Não informado';
  const formatted = formatCivilDate(date);
  return formatted.endsWith('/1900') ? formatted.slice(0, 5) : formatted;
}

function formatFiliation(father: string | null, mother: string | null): string {
  if (father && mother) return `${father} e ${mother}`;
  if (father) return `${father} (pai)`;
  if (mother) return `${mother} (mãe)`;
  return 'Não informada';
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

/**
 * Certidão / declaração de sacramento em PDF (cat-gestao-03, eng-acessos-08).
 * - "Certidão de <Sacramento>" só quando o assento tem livro, folha e termo;
 *   senão "Declaração para conferência — <Sacramento>", com o aviso de que
 *   não substitui a certidão.
 * - Pessoa: o personSnapshot do assento quando existe (sobrevive à
 *   anonimização LGPD); senão o cadastro atual.
 * Quem chama confere escopo, a parametrização da comunidade e recordKind.
 */
@Injectable()
export class SacramentCertificateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
  ) {}

  async render(request: CertificateRequest): Promise<CertificateResult> {
    const { record } = request;
    const member = await this.prisma.member.findUnique({
      where: { id: request.memberId },
      select: { fullName: true, birthDate: true, fatherName: true, motherName: true, status: true, communityId: true },
    });
    if (!member) throw new NotFoundException('Membro não encontrado');
    const person = personForRecord(member, record.personSnapshot);
    if (!person) {
      throw new ConflictException(
        'Cadastro anonimizado sem os dados da pessoa no assento — emita a certidão a partir do livro de registro',
      );
    }

    const community = await this.prisma.community.findUnique({
      where: { id: request.communityId || member.communityId },
      select: {
        name: true,
        parish: {
          select: {
            name: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            phone: true,
            email: true,
            priestName: true,
            diocese: { select: { name: true } },
          },
        },
      },
    });
    if (!community?.parish) throw new NotFoundException('Comunidade não encontrada');
    const parish = community.parish;

    const label = SACRAMENT_LABELS[record.type] ?? record.type;
    const book = cleanText(record.book, 40);
    const page = cleanText(record.page, 40);
    const term = cleanText(record.term, 40);
    const isCertidao = !request.legacyFromSchedule && !!(book && page && term);
    const kind: CertificateKind = isCertidao ? 'CERTIDAO' : 'DECLARACAO';
    const now = request.now ?? new Date();

    const registry = [book ? `Livro ${book}` : null, page ? `folha ${page}` : null, term ? `termo ${term}` : null]
      .filter(Boolean)
      .join(', ');
    const sponsors = sponsorNames(request.involved);
    const fields: Array<{ label: string; value: string }> = [
      { label: 'Nascimento', value: formatBirth(person.birthDate) },
      { label: 'Filiação', value: formatFiliation(person.fatherName, person.motherName) },
      { label: 'Data da celebração', value: record.date ? formatCivilDate(record.date) : 'Não informada' },
      { label: 'Local', value: cleanText(record.place, 200) ?? 'Não informado' },
      { label: 'Ministro', value: cleanText(record.minister) ?? 'Não informado' },
    ];
    if (sponsors.length) {
      fields.push({ label: record.type === SacramentType.MARRIAGE ? 'Testemunhas' : 'Padrinhos', value: joinNames(sponsors) });
    }
    fields.push({ label: 'Registro', value: registry || 'Sem livro, folha e termo informados' });

    const bodyParagraphs = isCertidao
      ? [
          `Certifico que, no livro de registro de ${label} desta paróquia — ${registry} —, consta o assento de:`,
        ]
      : [`Declaramos, para conferência, que no cadastro paroquial consta o seguinte registro de ${label} de:`];

    const closingParagraphs: string[] = [];
    if (request.legacyFromSchedule) {
      closingParagraphs.push(
        'Processo celebrado antes do registro da celebração no sistema: data e ministro são os do agendamento. Confira com o livro de registro.',
      );
    }
    if (isCertidao) closingParagraphs.push('O referido é verdade e dou fé.');
    if (request.finalidade) closingParagraphs.push(`Finalidade: ${request.finalidade}.`);
    const longDate = new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: PUBLIC_TZ,
    }).format(now);
    closingParagraphs.push(`${parish.city}${parish.state ? `/${parish.state}` : ''}, ${longDate}.`);

    const addressLine = [
      parish.address,
      `${parish.city}${parish.state ? `/${parish.state}` : ''}`,
      parish.zipCode ? `CEP ${parish.zipCode}` : null,
    ]
      .filter(Boolean)
      .join(' — ');
    const contactLine = [parish.phone, parish.email].filter(Boolean).join(' · ');
    const organization = [parish.name, parish.diocese?.name].filter(Boolean).join('\n');
    const priest = cleanText(parish.priestName);
    const emittedAt = now.toLocaleString('pt-BR', { timeZone: PUBLIC_TZ });

    const buffer = await this.pdfService.renderCertificateDocument({
      orientation: 'portrait',
      bodyAlign: 'justify',
      titleSize: 20,
      title: isCertidao ? `Certidão de ${label}` : `Declaração para conferência — ${label}`,
      organization,
      subtitle: [addressLine, contactLine, `Comunidade: ${community.name}`].filter(Boolean).join('\n'),
      pages: [
        {
          recipientName: person.fullName,
          notice: isCertidao ? undefined : 'Este documento não substitui a certidão assinada pelo pároco.',
          bodyParagraphs,
          fields,
          closingParagraphs,
          signatureLines: [priest ? `${priest}\nPároco` : 'Pároco', 'Secretaria Paroquial'],
        },
      ],
      footer: `Emitido em ${emittedAt}`,
    });

    const slug = FILE_SLUG[record.type] ?? 'sacramento';
    return {
      buffer,
      kind,
      filename: `${isCertidao ? 'certidao' : 'declaracao'}-${slug}.pdf`,
      fromSnapshot: person.fromSnapshot,
    };
  }
}
