# Arquidiocese de São Sebastião do Rio de Janeiro (RJ) — relatório de pesquisa

- **Slug**: `sao-sebastiao-do-rio-de-janeiro` · **Sede**: Rio de Janeiro/RJ
- **Arcebispo**: Cardeal Orani João Tempesta, O.Cist. · **Cúria**: Rua Benjamin Constant, 23, 7º andar — Glória, 20241-150
- **Data da coleta**: 2026-09-11
- **Território**: só o município do Rio de Janeiro — todas as 300 paróquias têm `city = "Rio de Janeiro"`.

## Resultado

| | Total | alta | media | baixa |
|---|---|---|---|---|
| Paróquias (entram na carga) | 300 | 300 | 0 | 0 |
| Entradas fora da lista da arquidiocese | 4 | 0 | 4 | 0 |
| Comunidades / locais de culto | 1.129 | 1.129 | 0 | 0 |
| Horários fixos | 4.065 | 1.810 | 0 | 2.255 |

Horários por tipo: **MASS** 2.978 (1.405 alta) · **CONFESSION** 643 (todas baixa) · **ROSARY** 277 (262 alta) · **ADORATION** 167 (143 alta).

Cobertura de horário: **277 das 304 entradas têm algum horário**; **152 paróquias têm horário `alta`** (o que de fato carrega hoje); 27 não têm horário nenhum em fonte alguma.

## Fontes

### 1. Diretório oficial da Cúria Metropolitana — `arqrio.com.br/curia` (fonte principal, `alta`)

O portal institucional é `arqrio.org.br` (WordPress de notícias, **sem** lista de paróquias). O diretório está no
domínio irmão `arqrio.com.br/curia`, em PHP antigo, paginado e com detalhes carregados por AJAX. Endpoints usados:

- `paroquias.php?pagina=1..6` — as 300 paróquias, com o `id` de cada uma no `onclick` do acordeão.
- `ajaxParoquiasRecuperarDetalhes.php?id=N` — ficha completa: **nome, vicariato/forania, data de ereção canônica,
  código, endereço, CEP, telefones, e-mail, clero (pároco, vigários, diáconos) e a lista de locais de culto**
  com endereço, CEP, telefone, e-mail e **latitude/longitude** de cada um.
- `ajaxExibeAtividadesLocal.php?id=N` — grade de atividades por local: **Missa, Terço, Adoração Eucarística**
  (e Grupo de Oração / Curso de Batismo / Curso de Noivos, descartados). 362 locais publicam atividades.
- `locaisCulto.php` (23 páginas), `santuarios.php`, `basilicas.php`, `arqrioEmNumeros.php`.

**Prova de completude**: a página *ArqRio em números* declara **300 paróquias e 1.129 locais de culto**. O dataset
tem exatamente **300 e 1.129**, e o cruzamento com a listagem geral de `locaisCulto.php` fechou em **zero faltando,
zero sobrando**.

**Sinal de atualidade**: o diretório traz uma paróquia erigida em **2026** (N. Sra. Aparecida, Freguesia/Jacarepaguá)
e seis em 2025, com pároco nomeado — por isso os dados de paróquia e os horários oficiais são `alta`.

### 2. horariodemissa.com.br (agregador, suplementar, `baixa`)

320 igrejas do município (305 com horário). Serviu para cobrir paróquias que a Cúria não publica. Casamento
automático com os locais da arquidiocese por **geolocalização + logradouro/número + similaridade de nome**:
**315 das 320 casadas**, 2 casamentos feitos à mão após conferência, 5 restantes tratadas abaixo.

### 3. Wikipédia — usada só para conferência, **não** para carga

O artigo *Paróquias da arquidiocese de São Sebastião do Rio de Janeiro* está marcado como **`{{Desatualizado}}`**,
fala em **296** paróquias (número de 2025) e a **coluna "Vicariato" está deslocada** (põe N. Sra. da Conceição de
Santa Cruz no vicariato Sul, Sant'Ana da Cidade Nova em Campo Grande etc.). Também não lista o Vicariato Suburbano,
que existe. Todo vicariato/forania do dataset veio da ficha oficial de cada paróquia.

## Estrutura: 13 vicariatos episcopais

| Vicariato | Paróquias | Com horário `alta` |
|---|---|---|
| Leopoldina | 44 | 26 |
| Campo Grande | 34 | 17 |
| Oeste | 28 | 15 |
| Sul | 28 | 12 |
| Tijuca | 22 | 7 |
| Urbano | 22 | 17 |
| Cascadura | 20 | 11 |
| Norte | 19 | 10 |
| Anchieta | 18 | 11 |
| Santa Cruz | 18 | 7 |
| Suburbano | 18 | 4 |
| Barra | 15 | 7 |
| Jacarepaguá | 14 | 8 |

Cada paróquia leva também `vicariate` e `forania` (ex.: `"2ª Forania"`), fora do formato mínimo do README.
Foranias: 52 no total.

## Santuários, basílicas e igrejas históricas

A regra do README foi aplicada, mas quase não foi necessária: **a Cúria já lista essas igrejas como *locais de
culto* de alguma paróquia**, então elas entram como comunidade (com o horário no lugar certo), não como paróquia
avulsa. Conferidos um a um os 26 santuários e as 8 basílicas do site:

- 20 santuários e 7 basílicas são a **própria igreja-matriz** de uma paróquia (o nome traz o rótulo entre
  parênteses, ex.: `Igreja Matriz São Sebastião (Santuário e Basílica)`).
- 6 são **comunidade não-matriz** de uma paróquia: Cristo Redentor do Corcovado (P. São Judas Tadeu/Cosme Velho),
  Schoenstatt de Vargem Pequena (P. N. Sra. do Montserrat), N. Sra. da Penha (P. Bom Jesus da Penha),
  N. Sra. das Graças da Medalha Milagrosa (P. São Sebastião/Tijuca), N. Sra. de Fátima do Recreio
  (P. Imaculada Conceição) e São Jorge e São Gonçalo Garcia (P. Santíssimo Sacramento da Antiga Sé).
- Igrejas célebres do Centro também já estão como comunidade: **Mosteiro de São Bento** (`Nossa Senhora do
  Monserrate`, P. Santa Rita), **N. Sra. da Lampadosa (Confraria)**, **N. Sra. da Conceição e Boa Morte**,
  **São Francisco de Paula**, **N. Sra. do Monte do Carmo**, **Santo Antônio** (convento, na paróquia da Catedral),
  **Santo Inácio** (Gávea e Botafogo), **Santuário São Camilo de Lellis**.

### As 4 entradas acrescentadas fora da lista da arquidiocese

| Entrada | Marcador | Motivo |
|---|---|---|
| Concatedral de São Basílio e N. Sra. do Perpétuo Socorro (Rua República do Líbano, 17 — Centro) | `status: "outra-jurisdicao"` | Eparquia Greco-Melquita N. Sra. do Paraíso |
| Paróquia Nossa Senhora do Líbano (Rua Conde de Bonfim, 638 — Tijuca) | `status: "outra-jurisdicao"` | Eparquia Maronita N. Sra. do Líbano |
| Capelania Militar São Sebastião (Av. Duque de Caxias, 760 — Vila Militar/Deodoro) | `status: "outra-jurisdicao"` | Ordinariado Militar do Brasil |
| Igreja da Comunidade Católica Shalom (Rua Bento Lisboa, 112 — Catete) | `status: "nao-paroquial"` + `loadAsParish: true` | Não é paróquia e não está entre os 1.129 locais, mas **publica missa fixa** — entra pela exceção do README |

As três primeiras têm `loadAsParish` **ausente** de propósito: são de outra jurisdição e não devem carregar.
A Cúria lista outros **cinco** oratórios da Comunidade Shalom (Recreio, Curicica, Guaratiba, Tijuca, Barra) como
locais de culto de paróquias — o do Catete é o único fora.

## Critério de confiança aplicado

- **Paróquias e comunidades → `alta`**: tudo veio da ficha oficial da Cúria, com sinal de atualidade.
- **Horários da Cúria, semanais → `alta`** (1.810).
- **Horários da Cúria com recorrência mensal → `baixa`** (133): "1ª Quinta-feira do mês", "3º sábado do mês",
  "Missa pelas Almas". É a pendência de modelagem já registrada no README (`MassSchedule` só tem dia da semana).
- **Horários do agregador → `baixa`** (2.122): fonte única não oficial. Entram só em locais em que a Cúria **não**
  publica aquele tipo de atividade, para não contradizer a fonte oficial.

**Medida de discordância entre as duas fontes**: nos 119 locais em que as duas publicam missa, o índice de Jaccard
entre os conjuntos de horários é **0,55** — ou seja, quase metade dos horários do agregador diverge do oficial.
É a justificativa quantitativa para o `baixa`; sem ela a tentação seria promover a `media`.

## Precisa de validação humana (em ordem de prioridade)

1. **Os 2.122 horários do agregador (`baixa`)** — cobrem 121 paróquias cujo horário a Cúria não publica e hoje entrariam
   no app sem nenhum horário. É o maior ganho possível: confirmar por site/Instagram da paróquia promove cada um
   a `alta`/`media`. A discordância medida de 45% contra a fonte oficial mostra que **não dá para promovê-los em bloco**.
2. **As 643 confissões**, todas do agregador — a Cúria não publica confissão para nenhum local.
3. **Os 133 horários mensais da Cúria** — dependem da decisão de produto sobre recorrência mensal.
4. **As 27 paróquias sem horário em fonte alguma**:
   Bom Jesus (Manguariba-Paciência) · Bom Pastor (Bangu) · N. Sra. Aparecida (Penha) · N. Sra. Aparecida (Rocinha) ·
   N. Sra. das Dores (Campo Grande) · N. Sra. das Graças (Curicica) · N. Sra. das Graças (Muzema-Jacarepaguá) ·
   N. Sra. de Fátima (Guaratiba) · N. Sra. do Monte Claro – língua polonesa (Flamengo) ·
   N. Sra. do Perpétuo Socorro (Jesuítas-Santa Cruz) · N. Sra. Rainha dos Apóstolos (Ilha do Fundão) ·
   Sagrada Família (Lote 14-Santa Cruz) · Sagrado Coração de Jesus (Santa Cruz) ·
   Santo Antônio (Condomínio Península-Barra) · Santo Expedito (Campo Grande) ·
   São Benedito (Morro dos Cabritos-Copacabana) · São José (Conjunto Miécimo-Santa Cruz) · São José (Inhoaíba) ·
   São José (Ramos) · São José – língua chinesa (Tijuca) · São José Artesão (Nova Cidade-Inhoaíba) ·
   São José Operário (Vila do Pinheiro-Maré) · São Miguel Arcanjo (Magalhães Bastos) ·
   São Miguel Arcanjo (Mandela-Benfica) · São Pio de Pietrelcina (Rio Comprido) · São Sebastião (Santa Cruz) ·
   Senhor do Bonfim (Cidade Alta-Cordovil).
   Quase todas são paróquias novas ou de periferia; muitas só publicam no Instagram.
5. **Paróquia São José (para os fiéis de língua chinesa)** — a Cúria dá Rua São Francisco Xavier, 75 (Tijuca);
   o agregador ainda registra Rua Benjamin Constant, 42 (Glória), endereço antigo. Confirmar o local atual.
6. **Paróquia São Bonifácio (Botafogo)** — paróquia pessoal de língua alemã, **sem nenhum clérigo listado** na
   Cúria (único caso em 300). Único horário publicado é mensal, na capela do Colégio N. Sra. de Lourdes.
7. **Paróquia São Pio de Pietrelcina (Rio Comprido)** — única sem local marcado como "Igreja Matriz" pela Cúria.
   A matriz foi **inferida** pela coincidência de endereço com a sede da paróquia (comunidade N. Sra. Aparecida,
   Estrada do Sumaré, 818). Conferir.
8. **8 paróquias sem telefone**: N. Sra. Aparecida (Penha) · N. Sra. Aparecida (Freguesia-Jacarepaguá) ·
   N. Sra. das Dores (Campo Grande) · N. Sra. de Fátima (Sepetiba) · Sagrada Família (Lote 14-Santa Cruz) ·
   Santo Agostinho e Santa Rita de Cássia (Barra) · Santo Expedito (Campo Grande) · São José Artesão (Inhoaíba).
9. **3 comunidades sem endereço**: São Pedro (P. Santa Rita dos Impossíveis/Ramos) ·
   N. Sra. das Mercês (P. Santo Antônio/Pavuna) · São Sebastião (P. São Camilo de Lellis/Usina).
   **187 comunidades sem geolocalização** (as outras 942 têm latitude/longitude da Cúria).
10. **Duas fichas do agregador descartadas por duplicidade** (mesmo local, registro repetido):
    "Paróquia N. Sra. Aparecida" (Av. Bagaxá, Campo Grande) e "Sagrada Famíia" (sic, Nova Holanda-Maré).

## Decisões de nome e slug

- Nome oficial da Cúria mantido, sempre com o prefixo "Paróquia …". Única alteração: a Cúria escreve
  *"Paróquia Catedral Metropolitana de São Sebastião do Rio de Janeiro"*; o dataset grava
  **"Catedral Metropolitana de São Sebastião do Rio de Janeiro"**, conforme o prefixo previsto no README.
- Há **muita homonímia** num só município: 10 paróquias "São Sebastião", 10 "N. Sra. da Conceição",
  10 "N. Sra. de Fátima", 9 "São José", 9 "N. Sra. Aparecida", 7 "Sagrada Família". O slug segue o padrão de
  Campo Limpo/SP: `<nome-sem-prefixo>-rio-de-janeiro` quando único, `<nome-sem-prefixo>-rio-de-janeiro-<bairro>`
  quando repetido. Todos os 304 slugs são únicos.
- O `neighborhood` reproduz a cadeia publicada pela Cúria, que às vezes tem dois níveis
  (`"Manguariba - Paciência"`, `"Jardim Batan - Realengo"`): localidade seguida de bairro oficial.
- `foundedYear` é a **data de ereção canônica** publicada pela Cúria (1634 na Candelária, 2026 na mais nova) —
  não é data de cadastro em CMS. As repetições (22 paróquias em 01/01/1945, 8 em 14/03/1984) são ereções em
  bloco reais, não artefato.

## Validação de formato

`node prisma/data/territorio-br/validate.cjs RJ` passa **sem problemas de formato**:
`304 paróquias · 1129 comunidades · 4065 horários · cobertura 300/300`.

O validador imprime duas notas informativas de "unidade não paroquial" (Capelania Militar São Sebastião e
Igreja da Comunidade Católica Shalom) porque o aviso é só heurística de nome. No importador
(`import-territorio.ts`, linhas 166 e 171) o `loadAsParish: true` vence tanto o filtro de nome quanto o status
`nao-paroquial`, então a igreja da Shalom **carrega**; a Capelania Militar fica de fora por
`status: "outra-jurisdicao"`, como deve.

## Nota técnica de coleta

- `arqrio.com.br/curia` serve **encodings misturados**: as páginas `.php` são ISO-8859-1 e as respostas AJAX são
  UTF-8. Decodificar tudo igual gera mojibake silencioso ("TerÇo" deixa de casar com "Terço" e o horário some).
- O bloco "Locais de culto" tem **`<ul>` aninhado** quando o santuário tem reitor próprio. Cortar no primeiro
  `</ul>` trunca a lista de capelas — o corte certo é no `<div id="DIVTEMP{id}">` que fecha cada local.
- O que fechou o número em 1.129 exatos foi conferir contra `locaisCulto.php` e `arqrioEmNumeros.php`.

## O que ficou de fora (orçamento)

Segui a ordem de prioridade do prompt: (1) lista completa, (2) horários, (3) comunidades. Como a fonte oficial
entregou (1) e (3) completas e verificadas de uma vez, o orçamento sobrou para (2). Ainda assim ficou sem:

- **Horário oficial de 148 das 300 paróquias** — a Cúria só publica atividades de 362 dos 1.129 locais. Não há
  outra fonte oficial: o portal `arqrio.org.br` não tem página de paróquia, e não há anuário/catálogo em PDF.
- **Site próprio de 243 paróquias** — só 57 têm `website`, todos vindos do agregador. A Cúria não publica site
  de paróquia (publica e-mail `@arqrio.org.br` de todas as 300).
- **Redes sociais** — não coletadas; a Cúria traz Facebook/Instagram no campo livre de só 2 paróquias.
- **Conferência individual** dos 2.122 horários do agregador contra site/Instagram de cada paróquia.
