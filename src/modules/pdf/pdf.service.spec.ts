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

  it('certidão (retrato, campos, aviso, fecho e assinaturas) cabe em uma página', async () => {
    const buffer = await service.renderCertificateDocument({
      orientation: 'portrait',
      bodyAlign: 'justify',
      titleSize: 20,
      title: 'Declaração para conferência — Primeira Eucaristia',
      organization: 'Paróquia Nossa Senhora de Fátima\nDiocese de Ponta Grossa',
      subtitle: 'Rua das Flores, 1234 — Ponta Grossa/PR — CEP 84000-000\n(42) 3222-0000 · secretaria@paroquia.org\nComunidade: Capela São Sebastião',
      pages: [
        {
          recipientName: 'Maria Eduarda dos Santos Oliveira',
          notice: 'Este documento não substitui a certidão assinada pelo pároco.',
          bodyParagraphs: ['Declaramos, para conferência, que no cadastro paroquial consta o seguinte registro de Primeira Eucaristia de:'],
          fields: [
            { label: 'Nascimento', value: '04/03/2010' },
            { label: 'Filiação', value: 'José Carlos dos Santos Oliveira e Ana Paula dos Santos Oliveira' },
            { label: 'Data da celebração', value: '01/05/2021' },
            { label: 'Local', value: 'Capela São Sebastião' },
            { label: 'Ministro', value: 'Pe. João Batista' },
            { label: 'Padrinhos', value: 'Carlos Souza e Rita de Cássia Souza' },
            { label: 'Registro', value: 'Livro 3, folha 12' },
          ],
          closingParagraphs: ['Finalidade: ' + 'x'.repeat(120) + '.', 'Ponta Grossa/PR, 19 de outubro de 2026.'],
          signatureLines: ['Pe. João Batista\nPároco', 'Secretaria Paroquial'],
        },
      ],
      footer: 'Emitido em 19/10/2026 10:00:00',
    });
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    const pages = buffer.toString('latin1').match(/\/Type \/Page\b/g) ?? [];
    expect(pages).toHaveLength(1);
  });

  it('sem brasão e sem assinaturas mantém o comportamento anterior', async () => {
    const buffer = await service.renderTableDocument({
      title: 'Lista',
      sections: [{ columns: ['A'], rows: [['1']] }],
    });
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
