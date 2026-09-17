# Relatório — Arquidiocese da Paraíba (`paraiba`, PB)

Pesquisa em 11/09/2026.

## Fontes

| Fonte | Papel |
|---|---|
| **Anuário Digital 2026 da Arquidiocese** — `http://162.241.101.195/~lumenpastoral/anuario/paroquias` (link publicado em https://arquidiocesepb.org.br/paroquias/) | **Fonte principal.** Diretório oficial, marcado "Anuário 2026", mantido pela Assessoria de TI da Arquidiocese. Lista as 9 foranias com nome, ano de criação, endereço completo, CEP, telefone, e-mail e clero atuante (com função) de cada paróquia. |
| https://arquidiocesepb.org.br/paroquias/ | Página institucional; só traz o texto de apresentação e o link do Anuário. |
| https://www.horariodemissa.com.br (busca por cidade) | Única fonte de horários encontrada. |
| catholic-hierarchy.org, notícias (paraibaonline, politicaetc) | Arcebispo. |

**Truque útil:** o site da Arquidiocese é um WordPress sem lista de paróquias; a lista inteira estava
atrás do link "Anuário Digital" para um IP cru (`162.241.101.195/~lumenpastoral`). As páginas do
Anuário vêm com **encoding misto** (template em latin-1, conteúdo do banco em UTF-8) — foi preciso um
decodificador que tenta UTF-8 byte a byte e cai para latin-1 quando falha. O mesmo vale para o
horariodemissa.com.br.

## Cobertura

| Métrica | Valor |
|---|---|
| Entradas no arquivo | 116 |
| Paróquias (sem `status`) | **103**, em **35 municípios** |
| Não paroquiais (`status: "nao-paroquial"`) | 13 — 2 capelanias, 1 santuário sem missa publicada, 9 igrejas/comunidades com missa publicada (`loadAsParish: true`) |
| Confiança das paróquias | **107 alta**, 0 media, **9 baixa** (as 9 igrejas não paroquiais que só existem no agregador) |
| Comunidades/capelas | **0** — o Anuário não publica capelas; `communities: []` em todas |
| Horários fixos | **241** (194 missas + 47 confissões) em 33 igrejas — **todos `baixa`** |

O site institucional ainda diz "93 Paróquias em 37 municípios"; o texto está **desatualizado** — o
Anuário 2026 lista 103 unidades territoriais (paróquias + 1 área pastoral), incluindo criações de
2024 (Riachão do Bacamarte, N. Sra. da Esperança, N. Sra. da Conceição/Jardim Oceania), 2025 (Capim)
e 2026 (N. Sra. do Rosário de Fátima). Registrei `parishesExpected: 93` para preservar o número
publicado, mas **o encontrado é maior e mais confiável**.

## Decisões tomadas

- **Catedral**: o Anuário chama "Paróquia Nossa Senhora das Neves"; renomeei para
  `Catedral Nossa Senhora das Neves` (é a sé metropolitana, e-mail `catedralnsdasneves@outlook.com`).
- **"Paróquia Santuário X"**: mantido o nome como a Arquidiocese publica (6 casos). O slug usa
  `santuario-...` para não colidir com a paróquia homônima do mesmo município (o caso de
  N. Sra. da Conceição, que existe em João Pessoa como paróquia-santuário no Varadouro e como
  paróquia comum no Jardim Oceania).
- **`Paróquia Imaculada Conceição de Bayeux`** → gravada como `Paróquia Imaculada Conceição`
  (cidade fora do nome, conforme regra do README). Nome oficial no Anuário inclui "de Bayeux".
- **`Área Pastoral São Gonçalo`** (João Pessoa/Torre, 2023) entra como paróquia — é unidade
  territorial com igreja e vigário; anotado em `notes`.
- **Capelanias** (Militar Santo Expedito e N. Sra. da Misericórdia) → `status: "nao-paroquial"`,
  não carregam.
- **Santuário N. Sra. da Penha** (reitoria, sem horário publicado) → `nao-paroquial` sem
  `loadAsParish`. **Santuário Imaculada Conceição** (Tambauzinho, reitoria dos frades) tem grade
  publicada → `loadAsParish: true`.
- **9 igrejas não paroquiais com missa publicada** entram com `loadAsParish: true`: Mosteiro de São
  Bento, Igreja de N. Sra. do Carmo, Capela de Santo André, Comunidade Doce Mãe de Deus, Casa de
  Evangelização Mons. Aloísio Catão e as duas casas da Comunidade Shalom (João Pessoa), Santuário dos
  Sagrados Corações de Jesus e Maria (Conde/Caxitu) e Igreja Senhor do Bonfim (Pitimbu).
- **Confissão com faixa de horário** ("09:00 às 13:00") entra pelo horário de início, com a faixa
  completa em `notes`.
- A "Casa de Evangelização Monsenhor Aloísio Catão" foi gravada como
  **`Capela da Casa de Evangelização Monsenhor Aloísio Catão`** para caber na regra de prefixo do
  `validate.cjs`; o nome publicado pela fonte está registrado em `notes`.

## O que ficou faltando

1. **Horários — o buraco principal.** A Arquidiocese **não publica grade de missas** em lugar nenhum
   (nem site, nem Anuário). O horariodemissa.com.br cobre só **25 igrejas de João Pessoa** e
   9 fora dela; o **missas.com.br não tem nenhuma paróquia da Paraíba cadastrada** (a página
   `missas.com.br/paraiba/joao-pessoa/` responde "Nenhum horário cadastrado"). Sem segunda fonte,
   **os 241 horários ficaram todos `baixa` e não entram em produção**. São ~70 paróquias sem
   nenhum horário.
2. **Comunidades/capelas: zero.** Nenhuma fonte oficial as publica. O importador criará só a matriz.
3. **Data de atualização do agregador**: horariodemissa.com.br não estampa data de verificação —
   outro motivo para `baixa`.

## Para o enxame de validação (ordem de prioridade)

1. **Horários de João Pessoa.** 25 grades do horariodemissa aguardam corroboração. Várias paróquias
   têm site/Facebook próprio já registrado em `website` e podem ser conferidas direto:
   `paroquiasaojosepb.com.br`, `igrejadorosario.com.br`, `paroquiajesuscristorei.org`,
   `sites.google.com/view/paroquiasaopedropescador`, `facebook.com/pnsfmiramar`,
   `facebook.com/SaoSebastiaoby`, `facebook.com/paroquiammd`, `docemaededeus.org`,
   `casamonscatao.com.br`, `comshalom.org/joao-pessoa`, `comunidadesmcj.org.br`.
2. **Divergências de endereço entre Anuário e agregador** (mesma paróquia, bairro diferente):
   - `nossa-senhora-auxiliadora-joao-pessoa` — Anuário diz Jardim Oceania, agregador diz Bessa
     (mesma Rua Valdemar Chianca, 330). O agregador também a chama "N. Sra. Auxílio dos Cristãos".
   - `sagrado-coracao-de-jesus-cabedelo` — Anuário: Rua Aderbal Piragibe, 05 / Centro;
     agregador: Rua Presidente João Pessoa, 129 / Ponta de Matos.
   - `sant-ana-joao-pessoa` — nº 310 (Anuário) x 262 (agregador).
   - `sao-francisco-de-assis-jardim-sao-paulo-joao-pessoa` — o agregador a chama
     "Paróquia Imaculada Conceição e São Francisco".
3. **Telefones malformados no Anuário oficial** (copiar como estão, mas conferir):
   - `santo-inacio-de-loyola-joao-pessoa`: `(83) 98327-542` — falta um dígito.
   - `sagrado-coracao-de-jesus-santa-rita`: `(83) 30335-119` — formato inválido.
   - `sao-joao-batista-itapororoca`: `(83) 8727-6670` — celular no formato antigo de 8 dígitos.
4. **`Paróquia Nossa Senhora da Conceição Aparecida`** aparece duas vezes em João Pessoa (Gramame,
   2010, e Valentina de Figueiredo, 2012). Slugs desambiguados pelo bairro — confirmar que são
   mesmo duas paróquias distintas.
5. **Administradores diáconos**: `nossa-senhora-da-conceicao-aparecida-gramame-joao-pessoa` e
   `imaculada-conceicao-cuite-de-mamanguape` têm diácono como "Administrador Paroquial" no Anuário;
   `priestName` recebeu o nome do diácono. Conferir se é isso mesmo.
6. **`foundedYear` 2026** em duas entradas (Capelania Militar Santo Expedito e Paróquia N. Sra. do
   Rosário de Fátima). Os anos do Anuário vão de 1586 a 2026 de forma orgânica (não é data de
   cadastro em CMS), mas vale confirmar essas duas.
