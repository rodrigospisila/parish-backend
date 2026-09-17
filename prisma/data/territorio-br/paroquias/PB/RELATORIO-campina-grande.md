# Relatório — Diocese de Campina Grande (`campina-grande`, PB)

Pesquisa em 11/09/2026.

## Fontes

| Fonte | Papel |
|---|---|
| **https://diocesecg.org/pagina/paroquias-e-areas-pastorais** | Índice das 11 foranias com a lista completa de paróquias e áreas pastorais. |
| **11 páginas de forania** — `/pagina/forania-cidade-leste`, `-cidade-norte`, `-cidade-oeste`, `-cidade-sul`, `-agreste-i`, `-agreste-ii`, `-brejo`, `-cariri-i`, `-cariri-ii`, `-curimatau`, `-sericar` | **Fonte principal:** por paróquia trazem ano de criação, pároco/administrador, vigários, diáconos, endereço, CEP, telefone, e-mail, site e (às vezes) os municípios atendidos. |
| https://diocesecg.org/pagina/curia-diocesana | Endereço/telefone da Cúria e o bispo diocesano (Dom Dulcênio Fontes de Matos). |
| https://www.horariodemissa.com.br | Única fonte de horários encontrada. |

**Truque:** o menu do site não linka as foranias — só 4 delas apareciam na busca. As outras 7 foram
achadas por tentativa de slug (`forania-agreste-i`, `forania-cariri-ii`, `forania-curimatau`,
`forania-sericar`…; numeral romano em minúsculas, sem acento em "curimatau"). URL errada devolve
HTTP 500, não 404.

## Cobertura

| Métrica | Valor |
|---|---|
| Paróquias/áreas pastorais | **78**, em **50 municípios** |
| Confiança | **78 alta** (todas de fonte oficial) |
| Com ano de fundação | 67 de 78 |
| Com pároco/administrador nomeado | 78 de 78 |
| Comunidades/capelas | **0** — a Diocese não as publica |
| Horários fixos | **95**, em 14 paróquias — **todos `baixa`** |

Entre as 78 entradas há **4 áreas pastorais** (N. Sra. da Conceição/Caturité, Santa Ana/Congo,
Sagrado Coração de Jesus e Santo André/Santo André, São Sebastião/Matinhas) e **1 santuário
diocesano** (Divina Misericórdia, bairro Cuités, Campina Grande) — mantive todos como paróquia
porque a própria Diocese os lista na relação de "Paróquias e Áreas Pastorais" e todos têm
administrador paroquial nomeado.

A `Paróquia Nossa Senhora da Conceição` de 1769 do bairro Centro foi renomeada para
**`Catedral Nossa Senhora da Conceição`** (é a sé diocesana; e-mail `catedralcg@gmail.com`).

## O que ficou faltando

1. **Horários.** A Diocese **não publica grade de missas**. O horariodemissa.com.br tem 50 fichas da
   diocese, mas **só 14 delas têm horário cadastrado** — as outras 36 são fichas vazias. Sem segunda
   fonte, os 95 horários ficaram `baixa` e não entram em produção. **64 das 78 paróquias ficam sem
   nenhum horário.**
2. **Comunidades/capelas: zero.** Nenhuma fonte oficial as publica. Única exceção registrada em
   `notes`: a Paróquia N. Sra. das Dores e São Lucas (Estreito) tem as comunidades "Estreito, Lucas,
   Catolé de Zé Ferreira, Jardim Verdejante" citadas no texto da Diocese — não viraram `communities`
   por falta de endereço.
3. A página **"Atendimento nas Paróquias"** (`/pagina/atendimento-nas-paroquias`) publica os horários
   de **atendimento dos padres** por paróquia. **Não foi importada**: o texto não diz se é confissão
   ou secretaria/aconselhamento, e registrar como `CONFESSION` seria inventar. É um bom candidato
   para o enxame de validação confirmar com as paróquias.

## Precisa de validação humana

1. **9 paróquias sem CEP** (a Diocese não publicou): `sao-joao-paulo-ii-e-nossa-senhora-de-fatima-campina-grande`,
   `sao-francisco-de-assis-cruzeiro-campina-grande`, `nossa-senhora-da-guia-queimadas`,
   `area-pastoral-nossa-senhora-da-conceicao-caturite`, `sao-pedro-e-sao-paulo-queimadas`,
   `area-pastoral-santa-ana-congo`, `nossa-senhora-de-fatima-damiao`, `sao-sebastiao-olivedos`,
   `sao-vicente-ferrer-e-santo-antonio-sao-vicente-do-serido`.
2. **Paróquias recém-criadas sem endereço completo** (só o município aparece na página da Diocese):
   São Pedro e São Paulo (Queimadas, 2023), São João Paulo II e N. Sra. de Fátima (Aluízio Campos,
   Campina Grande), São Francisco de Assis (Cruzeiro, Campina Grande), N. Sra. de Fátima (Damião,
   2026), São Sebastião (Olivedos, 2023), São Vicente Ferrer e Santo Antônio (São Vicente do Seridó,
   2024), Área Pastoral N. Sra. da Conceição (Caturité).
3. **`sao-jose-gado-bravo`** aparece na Forania Agreste II com criação em **2025** mas **não consta**
   da página-índice "Paróquias e Áreas Pastorais" (que ainda lista o estado anterior). Idem para
   `sao-jose-montadas` (2018) e `senhor-do-bonfim-puxinana` (2024), que estão no índice.
4. **Divergência de nome entre a página-índice e a página da forania** em alguns casos: o índice diz
   "Paróquia e Santuário de Nossa Senhora do Perpétuo Socorro (Bodocongó)" e "Paróquia e Santuário do
   Sagrado Coração de Jesus (Catolé)"; a página da forania diz apenas "Paróquia…". Gravei o nome da
   página da forania (mais detalhada). Confirmar se são santuários diocesanos.
5. **E-mail com acento** na fonte oficial: `sao-sebastiao-sao-sebastiao-de-lagoa-de-roca` →
   `comunicaçaoparoquiasaosebastiao@gmail.com` (endereço inválido como está).
6. **`Paróquia do Santíssimo Salvador` (Campina Grande / Santa Cruz)** aparece no
   horariodemissa.com.br mas **não existe na lista da Diocese** — não foi incluída (ficha sem
   horário). Verificar se é paróquia extinta, renomeada ou de outra jurisdição.
7. Dois telefones vieram malformados na fonte e foram normalizados à mão: Juazeirinho
   ("Tel.: (83) 993 317 588" → `(83) 99331-7588`) e São João Paulo II ("(83) 9 9622.0904" →
   `(83) 99622-0904`).
