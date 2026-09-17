# Diocese de Itabuna — relatório de pesquisa

- **Slug**: `itabuna` · **UF**: BA · **Sede**: Itabuna
- **Pesquisa**: 11/09/2026
- **Bispo**: Dom Jailton de Oliveira Lino, P.S.D.P. · **Site**: https://diocesedeitabuna.com.br

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **35** — 23 `alta` (ficha no site) + 12 `media` (reconstruídas por cruzamento) |
| Santuário não paroquial (`status: "nao-paroquial"`) | 1 (Santuário Diocesano Santo Antônio, Itabuna) |
| Municípios cobertos | 20 (16 paróquias em Itabuna, contando Ferradas e Nova Itabuna) |
| Comunidades/capelas | **84** |
| Horários fixos | **150** (143 MASS · 5 ADORATION · 1 CONFESSION · 1 ROSARY) — 127 `alta`, 9 `media`, 14 `baixa` |
| Paróquias com horário publicado | 21 de 35 |

**Cobertura: 35 de 35.** O número bate com as três fontes independentes (ver abaixo).

## O problema central: o site publica menos da metade das paróquias

A API WordPress do site (`/wp-json/wp/v2/paroquia`) devolve **`X-WP-Total: 23`** — e a página
`/paroquias/` mostra exatamente esses 23 itens. Mas o `catholic-hierarchy.org` registra **33**
paróquias em 2023. A lista foi fechada cruzando **três fontes independentes**:

1. **Receita Federal — filiais do CNPJ 14.615.249 (Diocese de Itabuna)**, varridas em
   `minhareceita.org` de `/0001` a `/0055`. Existem **39 filiais** (0001–0039) e **nada a partir de
   0040** — isso é a prova de completude do truque do README. Cada filial dá razão social/nome
   fantasia, endereço, bairro, CEP, telefone e situação cadastral.
2. **GCatholic** (`/churches/local/itab1`) — 35 igrejas listadas por cidade, atualizado em 01/01/2026.
3. **Blog oficial da diocese** (`dioceseitabuna.blogspot.com`, post "Paróquias", 2012) — lista os
   **33** com endereço, telefone e pároco, organizados em Vicariato Centro/Sul/Norte.

Resultado: **35 paróquias**. As 12 que faltam no site novo são, todas confirmadas pelas três fontes
(ou por duas, no caso de São João do Paraíso, que não apareceu na varredura de CNPJ):

| Paróquia | Cidade/bairro | Filial CNPJ |
|---|---|---|
| **Catedral São José** | Itabuna, Centro | 0002 |
| Paróquia São Judas Tadeu | Itabuna, Centro | 0007 |
| Paróquia Nossa Senhora Aparecida | Itabuna, Califórnia | 0024 |
| Paróquia Santo Antônio | Itabuna, Santo Antônio | 0025 |
| Paróquia Nossa Senhora das Vitórias | Itabuna, Jardim Vitória | 0027 |
| Paróquia Santa Inês | Itabuna, Santa Inês | 0029 |
| Paróquia São Boaventura | Canavieiras | 0011 |
| Paróquia São Sebastião | Camacan | 0012 |
| Paróquia Santa Luzia | Pau Brasil | 0019 |
| Paróquia Nossa Senhora da Conceição | Arataca | 0020 |
| Paróquia São Sebastião | Mascote | 0034 |
| Paróquia São João Batista | São João do Paraíso | — |

**A catedral da diocese não está no site.** É o dado mais chamativo desta circunscrição.

Essas 12 entraram com `confidence: "media"`, sem horário, com endereço/CEP/telefone das fontes
cruzadas, e com `notes` explicando a origem.

**Excluídas da carga**, também pela varredura de CNPJ:
- **Belmonte — N. Sra. do Carmo** (filial 0013, ATIVA): o município hoje pertence à **Diocese de
  Eunápolis**; o CNPJ é resíduo do desmembramento de 1996. Não entrou.
- **Itapebi — N. Sra. da Conceição** (filial 0016): situação **BAIXADA**. Não entrou.
- **Livraria Católica São José** (0023, SUSPENSA) e **Seminário Diocesano São José** (0038): não são
  paróquias e não têm missa publicada.

## Horários — texto livre, um bloco por dia da semana

As 23 fichas do site trazem `Telefone`, `E-mail`, endereço, foto e nome do **pároco** (com data de
nascimento e de ordenação) e um quadro de 7 colunas (DOMINGO…SÁBADO) com parágrafos livres:
`"8h20 – Missa comunidade Santa Luzia"`, `"MATRIZ: Domingos: 07:00 da manhã e 18:00"`,
`"Comunidade São Benedito em Itaiá: Domingo às 17h."`.

O parser: divide por `<p>` e por `•`; acha as horas; usa como **local** o texto *antes* da primeira
hora e, se vazio, o texto *depois* da última; limpa nome de dia, "Missa/Celebração/Adoração/
Confissões", preposições soltas e marcadores de recorrência. Tipo por palavra-chave
(confissões → CONFESSION, terço → ROSARY, missa/celebração → MASS, adoração → ADORATION).

- **9 horários `media`**: a linha não dizia o local e ele foi **herdado da linha anterior do mesmo
  dia** (caso clássico: `"Comunidade Santa Teresinha (Distrito Coquinhos)"` numa linha e
  `"18h Adoração"` / `"19h Missa da Misericórdia"` nas seguintes). O campo `notes` registra isso.
- **14 horários `baixa`**: recorrência mensal/quinzenal ("1ª e 3ª quartas-feiras do mês",
  "3º Sábado", "Quinzenalmente", "Sexta-feira (1º do mês)"). Texto original preservado em `notes`.
- **Linhas descartadas**: "FOLGA", "FOLGA DO PADRE", "Atendimento na comunidade … 9h" (atendimento
  de secretaria, não missa) e "Programa A Voz que clama em seu Lar, pela Rádio Itapuy 105,3" (programa
  de rádio). A linha de atendimento foi usada só como **contexto de local** para a linha seguinte.

**As comunidades foram derivadas dos próprios horários**, porque apenas 3 das 23 fichas publicam
lista de comunidades (Santa Maria Madalena, com endereço de cada uma; Senhora Santana de Floresta
Azul; Santo Antônio de Itororó). Toda comunidade do dataset é, portanto, um lugar de missa citado
pela diocese — o que é fonte oficial, mas **não é a lista completa de capelas de cada paróquia**.

## Pontos que precisam de validação humana

1. **Cobrar da diocese as 12 paróquias que faltam no site**, a começar pela **Catedral São José**.
   Sem ficha, elas entram sem horário, sem e-mail e sem pároco.
2. **14 paróquias sem nenhum horário**: as 12 acima + Santo Antônio (Itajú do Colônia) e
   N. Sra. da Conceição (Ferradas) — estas duas *têm* ficha, mas o quadro de horários só contém
   "." ou "-".
3. **São João do Paraíso (BA)** — a única das 12 que não apareceu na varredura de CNPJ (deve ter
   registro próprio, fora da raiz 14.615.249). Fonte: GCatholic + blog diocesano (que escreve, com
   erro de digitação, "Paróquia São João do Paraíso | São José do Paraíso"). O padroeiro **São João
   Batista** vem do GCatholic. **Confirmar nome e existência.**
4. **N. Sra. das Graças (Jaçanã, Itabuna)** existe no site e na Receita (filial 0037) mas **não** no
   GCatholic; **N. Sra. das Vitórias (Jardim Vitória, Itabuna)** existe na Receita e no GCatholic mas
   **não** no site. Não são a mesma coisa — são bairros diferentes e filiais de CNPJ diferentes
   (0037 e 0027) — mas vale conferir.
5. **Comunidades quase duplicadas** dentro da mesma paróquia, por diferença de grafia entre a lista
   publicada e o quadro de horários: em Santo Antônio/Itororó ficaram "Comunidade Nossa Senhora de
   Fátima Itororó" (lista) e "Comunidade Nossa Senhora de Fátima" (horário). São a mesma.
6. **"Santuário"** aparece como comunidade da Paróquia Senhora Sant'Anna (Buerarema) — é o nome
   exato publicado na grade ("TERÇA - 18:00 | SANTUÁRIO") e o slug da ficha é
   `paroquia-senhora-santana-santuario`. Provavelmente é o santuário de Senhora Sant'Ana; **o nome
   próprio não foi publicado** e não inventei.
7. **Nomes normalizados por mim**: o site escreve tudo em caixa alta e com a cidade no título
   ("PARÓQUIA SANTO ANTONIO - Itororó (Ba)"). Gravei "Paróquia Santo Antônio" com a cidade em `city`.
   Nomes de comunidade que vinham inteiramente em caixa alta foram convertidos para caixa de título.
   "PARÓQUIA NOSSA SENHORA DA PIEDADE" virou **"Santuário Nossa Senhora da Piedade"** porque tanto a
   Receita ("PAROQUIA SANTUARIO DE NOSSA SENHORA DA PIEDADE") quanto o GCatholic ("Parish, Shrine")
   a registram como santuário.
8. **Armadilhas de slug no CMS da diocese**, que confundem quem for conferir: a ficha da
   **Paróquia Senhor Deus Menino (Ibicaraí)** tem slug `paroquia-nossa-senhora-da-conceicao-ferradas`
   e a de **N. Sra. de Fátima (Itabuna)** tem slug `teste-2`. Os títulos é que estão certos.
9. **Telefones sem padronização** na fonte: "32121735" (sem DDD), "73 982132831", "7399856-9704",
   "+55 73 99937-3769", e dois campos com "-". Copiados como publicados; `-` virou `null`.
10. **Um endereço com erro de digitação da fonte**: Buerarema está como "RuaRua Antônio Batista, 719".
    Mantido como publicado.
11. **Comunidades derivadas de horário** (ver acima) — não confundir com a lista completa de capelas.
    Só 3 paróquias publicam a lista de verdade.
