# Diocese de Ponta Grossa (PR) — relatório

**Origem diferente das demais.** Esta diocese foi carregada em 23/07/2026 pelo seed antigo
(`prisma/seed-diocese-ponta-grossa.ts` e `prisma/seed-horarios-ponta-grossa.ts`), antes de
existir o dataset do território. O arquivo `ponta-grossa.json` foi **exportado da produção em
17/09/2026**, com os nomes exatamente como estão no banco, para que o enxame de validação
tenha a diocese no mesmo formato das outras.

- **Fonte:** páginas das paróquias em <https://www.diocesepontagrossa.org.br/> (coleta de
  23/07/2026).
- **Conteúdo:** 54 paróquias da diocese, 700 comunidades e 421 horários fixos.
- **Confiança:** lista de paróquias `alta` (site oficial, coleta recente); comunidades e
  horários `media` — o seed não registrou sinal de atualidade página a página.

## Não reimportar

A diocese tem paróquias com usuários reais (Imbituva é a primeira). O dry-run do importador
dá `paróquias +0`, mas não há motivo para rodar a carga: tudo o que está no arquivo já está
no banco. Correções vindas da validação devem ser aplicadas pontualmente.

## Entradas de outra jurisdição

O site da diocese lista por cortesia cinco paróquias que não são dela. Estão no arquivo com
`status: "outra-jurisdicao"` e, em produção, ainda penduradas na Diocese de Ponta Grossa:

| Paróquia | Cidade | Jurisdição correta |
|---|---|---|
| Paróquia Católica Ucraniana Transfiguração de Nosso Senhor | Ponta Grossa | eparquia ucraniana |
| Paróquia Católica Ucraniana Imaculado Coração de Maria | Irati | eparquia ucraniana |
| Paróquia Católica Ucraniana Nossa Senhora do Perpétuo Socorro | Reserva | eparquia ucraniana |
| Paróquia Católica Ucraniana Sagrado Coração de Jesus | Ivaí | eparquia ucraniana |
| Paróquia São João Batista - Prelazia de Lábrea | Canutama/AM | Prelazia de Lábrea (missão de igreja-irmã) |

Nenhuma tem membro, evento ou usuário vinculado. Devem ser movidas para a circunscrição
correta quando os arquivos das eparquias ucranianas e da Prelazia de Lábrea entrarem.

## Para a validação

1. Horários: conferir página a página no site da diocese — dois meses de idade, sem data.
2. Nomes com a cidade entre parênteses, como "Paróquia São Judas Tadeu (Castro)", são do seed
   antigo, que desambiguava homônimas pela cidade. O dataset novo usa o bairro.
