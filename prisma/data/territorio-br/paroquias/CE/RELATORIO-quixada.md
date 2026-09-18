# Diocese de Quixadá (CE) — relatório de pesquisa

- **Agente**: pesquisa de território, 2026-09-18
- **Arquivo**: `paroquias/CE/quixada.json`
- **Cobertura**: **21 / 21 paróquias (100%)**, todas `alta`, + **3 áreas pastorais** e **2 unidades
  não paroquiais com missa publicada** (`status: nao-paroquial` + `loadAsParish: true`, fora de
  `parishesFound`)
- **Comunidades**: **26** — só a igreja-sede de cada unidade. **A diocese não publica capelas.**
- **Horários fixos**: **115 — todos `baixa`**, em 14 unidades (94 missas, 12 confissões, 7 adorações,
  2 terços). A diocese não publica horário; tudo veio do agregador Lírio Católico.

## Fontes principais

| Fonte | URL | O que deu |
|---|---|---|
| Paróquias | `https://diocesedequixada.org.br/paroquias/` | as **24 fichas** numa única página, agrupadas por município: data de fundação, 1º pároco, festa do padroeiro, pároco, vigários, endereço, CEP, telefone e e-mail |
| Sitemap do CPT `paroquias` | `/wp-sitemap-posts-paroquias-1.xml` | listagem canônica — **24 URLs**, exatamente as 24 fichas da página |
| Foranias | `/a-diocese/foranias/` | o decreto que constitui as **4 foranias** (Quixadá, Quixeramobim, Itapiúna, Madalena) e distribui 23 das 24 unidades |
| Padres Diocesanos | `/clero/padres-diocesanos/` (alterada em 18/08/2026) | ofício e lotação de **45 presbíteros** — conferiu pároco e vigário de todas as unidades e revelou a **Capelania São João Calábria** |
| catholic-hierarchy | `/diocese/dquix.html` | erigida em 13/03/1971 (desmembrada de Fortaleza, com Boa Viagem, Capistrano, Itapiúna, Itatira, Quixadá e Quixeramobim); **21 paróquias** na estatística de 2022 |
| ViaCEP | `https://viacep.com.br/ws/<cep>/json/` | validação dos 17 CEPs publicados — 2 reprovados |
| Lírio Católico | `/horario_missa/dados/uf/CE.json` | 19 fichas nos 10 municípios; única fonte de horário |

### Truque de coleta

O tipo de conteúdo `paroquias` **não aparece** em `/wp-json/wp/v2/types` (`show_in_rest` desligado) e
`/wp-json/wp/v2/paroquias` devolve 404 — mas o **`wp-sitemap-index.xml` mostra
`wp-sitemap-posts-paroquias-1.xml`**, com as 24 URLs. E há uma armadilha: **as 24 URLs individuais
devolvem byte a byte a mesma página** (100.686 bytes, a listagem completa). Ou seja, baixar as 24
fichas é redundante — tudo está em `/paroquias/`. Quem contar bytes diferentes para validar a
raspagem vai achar que falhou.

### Atualidade

A página de paróquias já traz as **duas unidades criadas em janeiro de 2026** (Paróquia Imaculada
Conceição de Quixeramobim, 21/01/2026, e Área Pastoral Senhora Sant'Ana, 03/01/2026) e o rodapé é de
2026 — portanto está viva e atualizada: todas as 24 unidades ficaram `alta`. A página de clero foi
alterada em **18/08/2026**.

O texto de abertura da própria página, porém, **está desatualizado**: diz "vinte paróquias e duas
áreas pastorais", número anterior às duas criações de 2026. Prevaleceu a contagem das fichas.

## Estrutura encontrada

| Forania | Unidades |
|---|---|
| 1 – Quixadá | N. Sra. Auxiliadora (Ibaretama), São Francisco, Catedral Jesus Maria e José, Santa Teresinha, São João Batista e Santa Edwiges (Quixadá), São Sebastião (Choró), N. Sra. de Fátima (Banabuiú), A.P. São José (Custódio), A.P. Sant'Ana (Dom Maurício) |
| 2 – Quixeramobim | Santo Antônio, São Francisco (Maravilha), N. Sra. do Perpétuo Socorro (Nenelândia), São Miguel Arcanjo, **+ Imaculada Conceição (2026, fora do decreto)** |
| 3 – Itapiúna | N. Sra. da Conceição, São José (Caio Prado), A.P. São Félix (Palmatória), N. Sra. de Nazaré (Capistrano) |
| 4 – Madalena | Imaculada Conceição (Madalena), N. Sra. da Guia, N. Sra. da Boa Viagem, N. Sra. de Fátima (Boa Viagem), N. Sra. do Carmo (Lagoa do Mato) e Menino Deus (Itatira) |

A mais antiga é **Santo Antônio de Quixeramobim (15/11/1755)**; a Catedral (Paróquia Jesus, Maria e
José, 19/01/1870) foi elevada a catedral com a criação da diocese em 1971 — é a primeira do Brasil
dedicada a Jesus, Maria e José.

## Horários

Nenhuma fonte oficial: o site não tem página de horários e as fichas não trazem grade. Os 115
horários vêm das **13 fichas do Lírio Católico** com horário nos municípios da diocese, mais as duas
unidades não paroquiais. Todos em **`baixa`** — o `ultima_atualizacao` do agregador é a data de
regeneração da base (2026-09-02), idêntica nas 757 fichas do Ceará, e não há segunda fonte atual.

Sem nenhum horário: N. Sra. da Guia (Boa Viagem), N. Sra. Auxiliadora (Ibaretama), as 3 unidades de
Itapiúna, Santa Teresinha e São João Batista e Santa Edwiges (Quixadá), Imaculada Conceição,
N. Sra. do Perpétuo Socorro e São Miguel Arcanjo (Quixeramobim) e as 3 áreas pastorais —
**10 unidades**.

Dois horários de terço em Itatira (Menino Deus) ficaram como `ROSARY` com a regra em `notes`:
Terço dos Homens, terça 19h; Terço das Mulheres, quarta 19h.

## Unidades não paroquiais que entraram

- **Santuário Nossa Senhora Rainha do Sertão** (Monte Alegre, Serra do Estêvão, Quixadá) — a própria
  diocese o lista no rodapé, entre as instituições diocesanas, e ele publica missa **todos os dias**
  (17 horários, incluindo 7 blocos de confissão). Instagram `@santuario_rainhadosertao`.
- **Capelania São João Calábria** (Rua A, 95 – Remanso da Paz, Quixadá) — a página do clero lota o
  Pe. José Maria Loiola como "Capelão — Capelania São João Calábria – Remanso da Paz / Quixadá".
  5 horários.

## Fora do JSON (missa publicada, vínculo não confirmado)

Quatro igrejas de Quixadá aparecem no Lírio Católico com missa fixa, mas **nenhuma fonte oficial da
diocese as liga a uma paróquia**, e nenhuma é descrita como paróquia. Ficaram de fora, conforme a
regra do dataset, e são o primeiro alvo de quem for validar:

| Igreja | Endereço | Missas publicadas |
|---|---|---|
| Capela Dom Virgem Maria | Rua Juvêncio Alves, 660 – Centro | seg. a qui., 17:15 |
| Capela Nossa Senhora do Desterro | Comunidade Santa Paz | dom. 10:00; adoração qui. 18:30 |
| Capela de Nossa Senhora Imaculada Conceição | Rua José Acioly de Vasconcelos, s/n – Combate | dom. 17:00 |
| Comunidade Católica Shalom Quixadá | Rua José Enéas Monteiro Lessa, 392 – Planalto Universitário | seg., qui. e sex., 18:15 |

("Dom Virgem Maria" provavelmente é a casa/capela ligada à Paróquia N. Sra. da Boa Viagem, cujo
e-mail é `vvirgomaria@yahoo.com.br` — mas isso é conjectura e não entrou.)

## Precisa de validação humana

1. **CEP de Horizonte publicado para Boa Viagem** — a ficha da Paróquia Nossa Senhora da Guia
   (distrito de Guia, Boa Viagem) publica **62.885-000**, que o ViaCEP devolve como
   **Horizonte/CE**, outro município. Gravado `null`. É o mesmo tipo de erro que apareceu em
   Floresta/PE.
2. **CEP inexistente em Quixeramobim** — a ficha da Paróquia N. Sra. do Perpétuo Socorro
   (Nenelândia) publica **63 414-000**, que **não existe** no ViaCEP (Quixeramobim usa a faixa
   63800). Gravado `null`.
3. **Festa do padroeiro errada** — a ficha da Paróquia São Francisco de Assis (Maravilha,
   Quixeramobim) diz "São Francisco – **12 de Outubro**"; a festa de São Francisco de Assis é em
   **4 de outubro** (é o que a ficha da homônima de Quixadá diz). Provável erro de digitação.
4. **Nome do vigário divergente em Ibaretama** — a ficha da paróquia diz "Pe. José Idalício de
   Oliveira Neto"; a página do clero traz "Pe. **Jonas** Idalicio de Oliveira Neto", lotado em
   Quixadá como ecônomo e vice-reitor do Seminário Maior, sem citar Ibaretama. Uma das duas está
   errada.
5. **Três endereços divergentes entre o site e o Lírio Católico** (prevaleceu sempre o do site):
   Capistrano (Praça da Matriz × Rua Cel. Francisco Nunes Cavalcante, 3), São Francisco de Assis /
   Quixadá (Rua Juscelino Kubitschek, 194 × Rua Benjamin Constant, 972) e São Francisco de Assis /
   Quixeramobim (Rua Luiz Gomes Coutinho, 272 × R. Ramiro Barbosa, 257). Também N. Sra. do Carmo /
   Lagoa do Mato (Av. N. Sra. do Carmo × Av. Trajano Honorato).
6. **Bairro divergente** — a ficha de São João Batista e Santa Edwiges diz bairro "São João"; o
   ViaCEP devolve "Planalto Universitário" para o CEP publicado (63902-055). Gravado o do ViaCEP.
   Idem Santa Teresinha: ficha sem bairro, ViaCEP diz "Campo Novo".
7. **Ficha duplicada no agregador** — o Lírio Católico tem **duas** fichas para o mesmo endereço da
   catedral ("Catedral Jesus, Maria, José" e "Paróquia de Jesus, Maria e José"), com grades
   diferentes. As duas foram unidas na catedral, sem repetir dia/hora/tipo; são 17 horários. Uma
   das duas grades pode estar velha.
8. **Duas unidades sem contato nenhum**: Área Pastoral Senhora Sant'Ana (Dom Maurício) e Paróquia
   Imaculada Conceição (Quixeramobim) — ambas de 2026, publicadas só com endereço e responsável.
9. **Ano de fundação = data de criação canônica**, publicada dia/mês/ano ficha a ficha (não é data de
   cadastro em CMS): as datas são coerentes entre si e com a história da diocese, e nenhuma se
   repete em bloco. Gravado o ano.
10. **115 horários `baixa`** — nenhum entra em produção. Caminho para subir: os 12 Instagram
    publicados pelo Lírio (`matrizdefatima`, `pnsfatimabvce`, `pnsbv_`, `paroquiadecapistrano`,
    `paroquia_saosebastiaochoro`, `paroquiameninodeusitatira`, `paroquiansdocarmo_`,
    `paroquiamadalena`, `paroquiadesaofrancisco`, `santoantonioquixeramobim`, `paroquia_sfa_qxb`,
    `santuario_rainhadosertao`) e o Facebook da catedral (`facebook.com/CatedralJMJ`) — nenhum lido
    nesta rodada, por orçamento.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- `address`: está `"Curia Diocesana, Rua Basilio Pinto 1149, Bairro Combate, C.P. 34"` — o CEP
  63903-415 confere com Quixadá; sem correção material, só a grafia ("Basílio").
- `bishopName`, `email`, `website`, `foundedYear` (1971): **conferem** com o site oficial e o
  catholic-hierarchy. Nenhuma correção necessária.
