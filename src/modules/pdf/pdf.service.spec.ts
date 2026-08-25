import { PdfService } from './pdf.service';

// PNG 1x1 válido (menor imagem possível) — exercita o caminho do brasão
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

describe('PdfService (brasão e assinaturas — Onda 3)', () => {
  const service = new PdfService();

  it('lista da turma com brasão e bloco de assinaturas gera PDF válido', async () => {
    const buffer = await service.renderTableDocument({
      logo: PNG_1X1,
      signatureLines: ['Catequista', 'Coordenação da Catequese'],
      title: 'Lista da turma — Teste',
      subtitle: 'Etapa · Comunidade',
      sections: [{ columns: ['Nome', 'Telefone'], rows: [['Maria', '(42) 9'], ['José', '—']] }],
      footer: 'Emitido em teste',
    });
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(buffer.length).toBeGreaterThan(500);
  });

  it('certificado com brasão gera PDF válido (retrato e paisagem)', async () => {
    for (const orientation of ['portrait', 'landscape'] as const) {
      const buffer = await service.renderCertificateDocument({
        logo: PNG_1X1,
        orientation,
        title: 'Certificado',
        organization: 'Paróquia Teste',
        pages: [{ recipientName: 'Maria', bodyParagraphs: ['Concluiu.'], signatureLines: ['Pároco'] }],
      });
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    }
  });

  it('brasão corrompido não derruba o documento (fallback silencioso)', async () => {
    const buffer = await service.renderCertificateDocument({
      logo: Buffer.from('isto não é uma imagem'),
      title: 'Declaração',
      organization: 'Paróquia Teste',
      pages: [{ recipientName: 'José', bodyParagraphs: ['Está matriculado.'] }],
    });
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('sem brasão e sem assinaturas mantém o comportamento anterior', async () => {
    const buffer = await service.renderTableDocument({
      title: 'Lista',
      sections: [{ columns: ['A'], rows: [['1']] }],
    });
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
