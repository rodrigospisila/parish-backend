import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');

export interface PdfSection {
  /** Titulo da secao (ex.: data/celebracao) */
  heading?: string;
  /** Linha auxiliar abaixo do titulo (ex.: local, horario) */
  subheading?: string;
  /** Cabecalhos das colunas da tabela */
  columns: string[];
  /** Proporcao de largura de cada coluna (soma livre; normalizada). Default: colunas iguais */
  widths?: number[];
  /** Linhas da tabela (celulas como texto) */
  rows: string[][];
}

export interface PdfTableDocumentInput {
  /** Titulo principal do documento */
  title: string;
  /** Subtitulo (ex.: comunidade e periodo) */
  subtitle?: string;
  sections: PdfSection[];
  /** Texto de rodape (ex.: data de emissao) */
  footer?: string;
}

export interface PdfCertificatePage {
  /** Nome em destaque (catequizando, participante) */
  recipientName: string;
  /** Parágrafos do corpo (texto corrido, já formatado) */
  bodyParagraphs: string[];
  /** Linhas de assinatura (ex.: ['Pároco', 'Coordenação da Catequese']) */
  signatureLines?: string[];
}

export interface PdfCertificateDocumentInput {
  /** Título do documento (ex.: 'Certificado de Conclusão') */
  title: string;
  /** Nome da paróquia/organização, exibido acima do título */
  organization: string;
  /** Subtítulo abaixo do título (ex.: etapa e ano) */
  subtitle?: string;
  /** Uma página por destinatário (lote = várias páginas) */
  pages: PdfCertificatePage[];
  /** Texto de rodapé (ex.: data/local de emissão) */
  footer?: string;
  /** 'landscape' (certificado) ou 'portrait' (declaração). Default: landscape */
  orientation?: 'landscape' | 'portrait';
}

const PAGE_MARGIN = 40;
const ROW_PADDING = 4;
const CERT_MARGIN = 56;

/**
 * Servico generico de geracao de PDF (pdfkit).
 * Recebe dados estruturados e devolve Buffer; nao conhece regras de negocio.
 */
@Injectable()
export class PdfService {
  /** Gera um documento A4 com secoes tabulares (escalas, listagens, relatorios). */
  async renderTableDocument(input: PdfTableDocumentInput): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN, bufferPages: true });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const contentWidth = doc.page.width - PAGE_MARGIN * 2;

      doc.font('Helvetica-Bold').fontSize(16).text(input.title, { align: 'center' });
      if (input.subtitle) {
        doc.moveDown(0.2);
        doc.font('Helvetica').fontSize(11).fillColor('#444444').text(input.subtitle, { align: 'center' });
        doc.fillColor('#000000');
      }
      doc.moveDown(1);

      for (const section of input.sections) {
        this.ensureSpace(doc, 60);

        if (section.heading) {
          doc.font('Helvetica-Bold').fontSize(12).text(section.heading);
        }
        if (section.subheading) {
          doc.font('Helvetica').fontSize(9).fillColor('#555555').text(section.subheading);
          doc.fillColor('#000000');
        }
        doc.moveDown(0.3);

        const widths = this.resolveColumnWidths(section, contentWidth);
        this.renderRow(doc, section.columns, widths, true);

        for (const row of section.rows) {
          this.renderRow(doc, row, widths, false);
        }

        doc.moveDown(1);
      }

      if (input.footer) {
        doc.font('Helvetica').fontSize(8).fillColor('#777777').text(input.footer, PAGE_MARGIN, doc.page.height - PAGE_MARGIN - 12, {
          width: contentWidth,
          align: 'right',
        });
      }

      doc.end();
    });
  }

  /**
   * Certificado/declaração: página centrada com moldura, nome em destaque e
   * linhas de assinatura. Uma página por destinatário (suporta lote).
   */
  async renderCertificateDocument(input: PdfCertificateDocumentInput): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: input.orientation ?? 'landscape',
        margin: CERT_MARGIN,
        bufferPages: true,
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      input.pages.forEach((page, index) => {
        if (index > 0) doc.addPage();
        const width = doc.page.width;
        const height = doc.page.height;
        const contentWidth = width - CERT_MARGIN * 2;

        // Moldura dupla
        doc
          .rect(24, 24, width - 48, height - 48)
          .lineWidth(2)
          .strokeColor('#8a6d3b')
          .stroke();
        doc
          .rect(32, 32, width - 64, height - 64)
          .lineWidth(0.7)
          .strokeColor('#8a6d3b')
          .stroke()
          .strokeColor('#000000');

        doc.y = CERT_MARGIN + 8;
        doc
          .font('Helvetica')
          .fontSize(12)
          .fillColor('#555555')
          .text(input.organization, CERT_MARGIN, doc.y, { width: contentWidth, align: 'center' });
        doc.moveDown(0.8);
        doc
          .font('Helvetica-Bold')
          .fontSize(26)
          .fillColor('#333333')
          .text(input.title, { width: contentWidth, align: 'center' });
        if (input.subtitle) {
          doc.moveDown(0.3);
          doc
            .font('Helvetica')
            .fontSize(12)
            .fillColor('#555555')
            .text(input.subtitle, { width: contentWidth, align: 'center' });
        }

        doc.moveDown(1.4);
        doc
          .font('Helvetica-Bold')
          .fontSize(20)
          .fillColor('#000000')
          .text(page.recipientName, { width: contentWidth, align: 'center' });
        doc.moveDown(0.8);
        doc.font('Helvetica').fontSize(12).fillColor('#222222');
        for (const paragraph of page.bodyParagraphs) {
          doc.text(paragraph, { width: contentWidth, align: 'center', lineGap: 3 });
          doc.moveDown(0.5);
        }

        // Linhas de assinatura lado a lado, ancoradas na base da página
        const signatures = page.signatureLines ?? [];
        if (signatures.length) {
          const signatureY = height - CERT_MARGIN - 46;
          const slotWidth = contentWidth / signatures.length;
          signatures.forEach((label, slot) => {
            const lineWidth = Math.min(190, slotWidth - 24);
            const centerX = CERT_MARGIN + slotWidth * slot + slotWidth / 2;
            doc
              .moveTo(centerX - lineWidth / 2, signatureY)
              .lineTo(centerX + lineWidth / 2, signatureY)
              .lineWidth(0.8)
              .strokeColor('#333333')
              .stroke();
            doc
              .font('Helvetica')
              .fontSize(10)
              .fillColor('#333333')
              .text(label, centerX - slotWidth / 2 + 12, signatureY + 6, {
                width: slotWidth - 24,
                align: 'center',
              });
          });
        }

        if (input.footer) {
          doc
            .font('Helvetica')
            .fontSize(8)
            .fillColor('#777777')
            .text(input.footer, CERT_MARGIN, height - CERT_MARGIN + 14, {
              width: contentWidth,
              align: 'center',
            });
        }
        doc.fillColor('#000000');
      });

      doc.end();
    });
  }

  private resolveColumnWidths(section: PdfSection, contentWidth: number): number[] {
    const proportions =
      section.widths && section.widths.length === section.columns.length
        ? section.widths
        : section.columns.map(() => 1);
    const total = proportions.reduce((sum, value) => sum + value, 0);
    return proportions.map((value) => (value / total) * contentWidth);
  }

  private renderRow(doc: PDFKit.PDFDocument, cells: string[], widths: number[], isHeader: boolean) {
    doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);

    const rowHeight =
      Math.max(
        ...cells.map((cell, index) =>
          doc.heightOfString(cell || '-', { width: widths[index] - ROW_PADDING * 2 }),
        ),
        10,
      ) + ROW_PADDING * 2;

    this.ensureSpace(doc, rowHeight);

    const startY = doc.y;
    let x = PAGE_MARGIN;

    if (isHeader) {
      doc
        .rect(PAGE_MARGIN, startY, widths.reduce((sum, width) => sum + width, 0), rowHeight)
        .fillColor('#EEEEEE')
        .fill()
        .fillColor('#000000');
      doc.font('Helvetica-Bold').fontSize(9);
    }

    cells.forEach((cell, index) => {
      doc.text(cell || '-', x + ROW_PADDING, startY + ROW_PADDING, {
        width: widths[index] - ROW_PADDING * 2,
      });
      x += widths[index];
    });

    doc
      .moveTo(PAGE_MARGIN, startY + rowHeight)
      .lineTo(PAGE_MARGIN + widths.reduce((sum, width) => sum + width, 0), startY + rowHeight)
      .strokeColor('#CCCCCC')
      .lineWidth(0.5)
      .stroke()
      .strokeColor('#000000');

    doc.x = PAGE_MARGIN;
    doc.y = startY + rowHeight;
  }

  private ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
    const bottom = doc.page.height - PAGE_MARGIN;
    if (doc.y + needed > bottom) {
      doc.addPage();
    }
  }
}
