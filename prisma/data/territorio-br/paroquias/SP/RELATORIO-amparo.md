# Relatório de pesquisa — Diocese de Amparo (SP)

- **Arquivo**: `paroquias/SP/amparo.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: pesquisa de território BR — lote centro-leste paulista

## Fonte principal

O site oficial **diocesedeamparo.org.br** é um WordPress com tipo de conteúdo próprio
`paroquia`, exposto na **REST API** (`/wp-json/wp/v2/paroquia?per_page=100`). O cabeçalho
`X-WP-Total: 34` deu o total canônico sem precisar raspar as 3 páginas do arquivo público.

Cada página de paróquia (Elementor + ACF) traz ano de criação, telefone, e-mail, horários de
atendimento, endereço, história e uma **tabela de horários de missas** montada com um repetidor
ACF de quatro campos: `tipo_paroquia` (Missa / Celebração da Palavra), `dia_da_semana_paroquia`,
`horario` e `observacoes` (o local — matriz, comunidade ou capela). Foi essa estrutura que
permitiu extrair local + dia + hora com precisão.

| Fonte | URL | Uso |
|---|---|---|
| Paróquias (WP REST) | `https://diocesedeamparo.org.br/wp-json/wp/v2/paroquia?per_page=100` | lista canônica, 34 registros (`X-WP-Total`) |
| Arquivo público de paróquias | `https://diocesedeamparo.org.br/paroquias/` (+ `/page/2/`, `/page/3/`) | corroboração da lista |
| Taxonomia de foranias | `https://diocesedeamparo.org.br/wp-json/wp/v2/local_paroquia?per_page=100` | 5 foranias e a contagem por forania |
| Áreas pastorais (WP REST) | `https://diocesedeamparo.org.br/wp-json/wp/v2/area-pastoral?per_page=100` | 2 registros não paroquiais |
| Página de cada paróquia | `https://diocesedeamparo.org.br/paroquia/<slug>/` | todos os dados e horários |
| Catholic-Hierarchy | `https://www.catholic-hierarchy.org/diocese/dampa.html` | **34 paróquias** (estatística de 2022), bispo |
| Wikipédia — Diocese de Amparo | `https://pt.wikipedia.org/wiki/Diocese_de_Amparo` | municípios do território |

> **Nota técnica**: e-mails ofuscados pelo Cloudflare (`data-cfemail`) foram decodificados.

## Cobertura

| Métrica | Valor |
|---|---|
| Paróquias | **34** |
| Esperado | **34** (WP REST do site oficial **e** Catholic-Hierarchy) → **100%** |
| Registros no arquivo | **36** = 34 paróquias + 2 Áreas Pastorais (`status: "nao-paroquial"`) |
| Confiança das paróquias | 36 `alta` |
| Comunidades/capelas | **187** |
| Horários fixos | **360** (280 `alta`, 80 `baixa`) |
| Tipos | 360 `MASS` (a diocese não publica confissão/adoração/terço nessa tabela) |
| Paróquias sem nenhum horário | **0** |

Distribuição por município: Itapira 8, Mogi Mirim 6, Amparo 6, Pedreira 3, Jaguariúna 3,
Santo Antônio de Posse 2, Holambra 2, Serra Negra 2, Águas de Lindóia 2, Lindóia 1,
Monte Alegre do Sul 1.

Foranias (campo extra `forania`, ignorado pelo importador): Sant'Ana 8, Nossa Senhora da Penha 7,
São José 7, Jesus Bom Pastor 6, Nossa Senhora do Rosário 6.

Campos preenchidos: e-mail 36/36, telefone 36/36, ano de criação 36/36, pároco 31/36.
**Melhor cobertura de contato deste lote.**

## Decisões de modelagem

- **`Paróquia Catedral Nossa Senhora do Amparo`** normalizada para
  **`Catedral Nossa Senhora do Amparo`** (regra de prefixo do README).
- O site desambigua paróquias homônimas colocando a cidade no título
  ("Paróquia Santo Antônio – Itapira", "Paróquia São Benedito – Mogi Mirim"). A cidade foi
  **retirada do `name`** e gravada em `city`, conforme a regra do README.
- **2 Áreas Pastorais** (Nossa Senhora de Guadalupe / Santo Antônio de Posse e Santa Edwiges /
  Jaguariúna, ambas criadas no fim de 2025) entraram com `"status": "nao-paroquial"` e
  `jurisdictionNote` — a própria diocese as publica num tipo de conteúdo separado, distinto de
  "Paróquias". Elas trazem 22 horários de missa reais, que ficam registrados mas não são
  carregados.
- **1 linha "Celebração da Palavra"** foi descartada (não é missa), conforme a regra.
- `foundedYear` veio de "Ano de Criação: dd/mm/aaaa" — datas variadas e plausíveis (1839 a 2020s).
- `Paróquia Santuário do Senhor Bom Jesus` (Monte Alegre do Sul) é paróquia **e** santuário no
  site; entrou como paróquia normal.

## Pontos para validação humana

1. **80 horários com `confidence: "baixa"` = recorrência mensal.** A diocese usa muito o campo
   de dia da semana para regras mensais: *"1ª Sexta-feira do Mês"*, *"2º e 4º Sexta-feira do
   mês"*, *"1º e 3º domingo do mês"*, *"Última Quinta-Feira do mês"*, e até
   *"2ª sábado do mês - um mês sim e outro não"*. A regra literal está copiada em `notes`.
2. **1 linha perdida**: um registro com dia *"Uma vez ao mês"* não tem dia da semana algum e foi
   descartado (não há como modelar).
3. **Áreas Pastorais**: se a diocese elevá-las a paróquia (é o caminho natural), o `status` precisa
   mudar de `nao-paroquial` para nulo. Vale reconferir num próximo ciclo.
4. **Pároco ausente em 5 registros** — o bloco "Clero" está vazio nessas páginas.
5. **Sem CEP**: o site raramente publica CEP no endereço; `zipCode` ficou `null` na maioria.
6. **Telefone com formato livre** em alguns registros: por exemplo
   *"Fone: (19)3896-1326 / WhatsApp: (19) 9.96206457"* (Área Pastoral Nossa Senhora de Guadalupe)
   foi gravado como veio. Precisa de normalização antes da carga.
7. **Observações que não são local**: o campo `observacoes` às vezes mistura local e evento
   ("Santuário | Novena Perpétua do Senhor Bom Jesus"). Foi usada só a parte antes do `|` como
   nome de comunidade; o texto integral não foi preservado nesses casos.
8. **Nomes de comunidade abreviados** na fonte ("Comunidade N. Sra. de Lourdes",
   "Comunidade N. Sra. de Guadalupe") convivem com a forma extensa em outras paróquias — a
   deduplicação é por paróquia, então não houve conflito, mas a grafia merece revisão.
9. O território da diocese na Wikipédia lista 11 municípios e todos aparecem no dataset.
