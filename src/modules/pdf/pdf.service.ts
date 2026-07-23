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

const PAGE_MARGIN = 40;
const ROW_PADDING = 4;

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
