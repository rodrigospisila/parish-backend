import { Test, TestingModule } from '@nestjs/testing';
import { PdfService } from './pdf.service';

describe('PdfService', () => {
  let service: PdfService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfService],
    }).compile();

    service = module.get<PdfService>(PdfService);
  });

  it('gera um Buffer PDF valido com titulo e secoes', async () => {
    const buffer = await service.renderTableDocument({
      title: 'Escala de Serviço',
      subtitle: 'Comunidade São José — Julho/2026',
      sections: [
        {
          heading: '12/07/2026 às 19:00 — Missa Dominical',
          subheading: 'Igreja Matriz',
          columns: ['Função', 'Membro', 'Situação'],
          widths: [2, 4, 2],
          rows: [
            ['Leitor', 'João Silva', 'Confirmado'],
            ['Ministro', 'Maria Souza', 'Aguardando'],
          ],
        },
      ],
      footer: 'Emitido em 07/07/2026',
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('gera documento mesmo com secao sem linhas', async () => {
    const buffer = await service.renderTableDocument({
      title: 'Escala de Serviço',
      sections: [
        {
          heading: 'Nenhuma escala no período informado',
          columns: ['Função', 'Membro', 'Situação'],
          rows: [],
        },
      ],
    });

    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('pagina automaticamente quando ha muitas linhas', async () => {
    const rows = Array.from({ length: 120 }, (_, index) => [
      `Função ${index}`,
      `Membro ${index}`,
      'Confirmado',
    ]);

    const buffer = await service.renderTableDocument({
      title: 'Escala Longa',
      sections: [{ columns: ['Função', 'Membro', 'Situação'], rows }],
    });

    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    // Mais de uma página gera múltiplos objetos /Page
    expect(buffer.toString('latin1')).toContain('/Type /Pages');
  });
});
