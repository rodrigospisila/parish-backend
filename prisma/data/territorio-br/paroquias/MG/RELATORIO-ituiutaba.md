# Diocese de Ituiutaba (MG) — relatório de pesquisa

- **Arquivo**: `paroquias/MG/ituiutaba.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: pesquisa do território — Triângulo Mineiro (Uberaba / Uberlândia / Ituiutaba)

## Resumo

| | |
|---|---|
| Paróquias no arquivo | **38** (31 paróquias, 6 santuários, 1 catedral) |
| Confiança das paróquias | 38 alta, 0 media, 0 baixa |
| Municípios | 15 |
| Foranias | 5 |
| Comunidades/capelas | **142** (todas `alta`) |
| Horários fixos | **316** — 240 alta, 1 media, 75 baixa |
| Tipos de horário | 315 MASS, 1 ADORATION |
| Paróquias sem nenhum horário | 0 |

Cobertura: **38 encontradas / 37 declaradas** pela diocese ("5 foranias com 37 paróquias em 15
cidades e 5 distritos") e **36** no catholic-hierarchy.org (Anuário Pontifício 2024, dado de
2023). Todas as 38 vêm de links nas 5 páginas de forania do site oficial — nenhuma foi inferida.

## Fontes principais

| Fonte | Uso |
|---|---|
| https://diocesedeituiutaba.com.br/paroquias | índice das 5 foranias; declara "37 paróquias em 15 cidades e 5 Distritos" |
| https://diocesedeituiutaba.com.br/forania-sao-jose (e as outras 4) | os 38 links de paróquia, por forania |
| https://diocesedeituiutaba.com.br/&lt;slug-da-paroquia&gt; (38 páginas) | horários de missa, telefone, endereço, bairro, cidade, pároco/vigário, capelas e comunidades |
| https://diocesedeituiutaba.com.br/sobre | composição das 5 foranias, quais localidades são **distritos**, histórico, 44 padres |
| https://diocesedeituiutaba.com.br/contatos | endereço, CEP, telefone, WhatsApp e e-mail da Cúria |
| https://www.catholic-hierarchy.org/diocese/ditui.html | nº esperado de paróquias; bispo Dom Valter Magno de Carvalho (nomeado 22/05/2025) |

**Nota de método**: o site (Agência Cattos, não-WordPress) apresenta certificado que o leitor
automático rejeita — foi lido com `curl -k` e User-Agent de Chrome. Os links de paróquia nas
páginas de forania são `http://` e redirecionam: sem `-L` a primeira rodada baixou 38 arquivos
vazios. Não há API nem sitemap; a extração foi feita sobre o HTML renderizado, que é bastante
regular (`Horários de Missas` / `Informações` / `Capelas` / `Comunidades` / `Pároco`).

## Como os horários foram lidos

O site quebra rótulo e horário em linhas separadas (`Quarta-feira:` numa linha, `19h` na
seguinte) — as duas são recombinadas antes de interpretar. Regras:

- Linhas com dois pares dia+hora são divididas por dia (sem produto cartesiano).
- `Sábado: 18h | 19h (Creche Canaã)` mantém o texto original em `notes`.
- Recorrência **mensal** (`1ª sexta-feira`, `Missa no 4º sábado`, `Missas nas 2ª quintas-feira`,
  `Toda 1ª sexta-feira do mês`, `Quinzenalmente segunda-feira`) → `confidence: "baixa"` com a
  regra literal em `notes`. São **75 de 316** — proporcionalmente o maior bloco mensal das três
  circunscrições do Triângulo, porque a diocese é muito rural: quase toda comunidade de fazenda
  tem missa uma vez por mês. Isso **não cabe** no `MassSchedule` (só dia da semana).
- `Todo dia 22: 19h` e afins não geram registro (não há `dayOfWeek`).

## Cidades: distritos normalizados

A página `/sobre` declara explicitamente quais localidades são **distritos**. Como a fonte
oficial faz a distinção, gravei município em `city` e o distrito em `neighborhood`:

| Rótulo no site | `city` | `neighborhood` |
|---|---|---|
| Honorópolis | Campina Verde | Honorópolis |
| Alexandrita | Iturama | Alexandrita |
| Estrela da Barra | Carneirinho | Estrela da Barra |
| São Sebastião do Pontal | Carneirinho | São Sebastião do Pontal |
| Chaveslândia – Distrito de Santa Vitória | Santa Vitória | Chaveslândia |
| Distrito de Santa Vitória | Santa Vitória | (bairro publicado) |
| Cachoeira Dourada/MG | Cachoeira Dourada | — |

Resultado: 15 municípios, exatamente os 15 declarados pela diocese.

| Município | Paróquias |
|---|---|
| Ituiutaba | 12 |
| Iturama | 6 |
| Campina Verde, Carneirinho, Santa Vitória | 3 cada |
| Capinópolis | 2 |
| Cachoeira Dourada, Canápolis, Centralina, Gurinhatã, Ipiaçu, Itapagipe, Limeira do Oeste, São Francisco de Sales, União de Minas | 1 cada |

## Precisa de validação humana

1. **38 registros × 37 declaradas × 36 no Anuário.** Sobra 1 ou 2. O candidato mais provável é
   um dos santuários de Iturama não ser circunscrição paroquial autônoma:
   - `Santuário de Adoração Perpétua e Santuário de Santa Teresinha do Menino Jesus e da Sagrada
     Face` — a página `/comunidade` do próprio site descreve esse santuário como obra da
     **Comunidade Católica Mar a Dentro** (Fazenda Santa Rosa), não como paróquia;
   - `Santuário Santa Rita de Cássia` (Alexandrita) convive com a `Paróquia Santa Rita de Cássia`
     (Iturama, bairro Newton Cardoso) — pode ser a mesma circunscrição em dois endereços.
   Decidir se um deles deve virar comunidade ou sair.
2. **Nenhum e-mail e nenhum ano de criação** — o site não publica esses campos para paróquia
   alguma. Os 38 registros têm `email: null` e `foundedYear: null` (só a Catedral tem a data no
   texto histórico: paróquia criada em 07/11/1866, elevada a catedral em 16/10/1982 — não
   gravado, para não misturar prosa com campo estruturado).
3. **Nenhum CEP** de paróquia (`zipCode: null` nos 38).
4. **Telefones repetidos entre paróquias** — provável erro de digitação do site:
   - `(34) 3263-1093` aparece na **Catedral São José** (Ituiutaba) e na **Paróquia São Pedro e
     São Paulo** (Capinópolis);
   - `(34) 3454-1281` aparece na **Paróquia N. Sra. Aparecida e São Sebastião** e na
     **Paróquia N. Sra. da Conceição**, ambas em Carneirinho.
   Alguns números vieram com espaço não-quebrável e ponto como separador
   (`34 3263.1093`) — normalizados para `(DD) NNNN-NNNN` onde o formato era reconhecível.
   **Dois telefones truncados** (7 dígitos, como o site publica, sem corroboração):
   `34 3424-135` (Paróquia Santo Antônio, Itapagipe) e `34 3411-645` (Paróquia Santa Rosa de
   Lima, Iturama). Um terceiro caso, `34 3411-572` da Paróquia Sagrado Coração de Jesus
   (Iturama), foi corrigido para `(34) 3411-5722` porque o link de WhatsApp da própria página
   (`wa.me/553434115722`) confirma o número completo.
5. **Comunidade genérica `Capela`** no Santuário Diocesano Nossa Senhora Aparecida (Ituiutaba):
   o site publica só o endereço (`Rua 20 nº 379, Santa Maria`, CEP 38304-226) e o horário
   (sábados 17h), sem nome. Registrada como "Capela" — precisa do nome real.
6. **Paróquia São Sebastião (Ituiutaba)** lista 4 capelas com um rodízio de missa por domingo
   (`1° domingo — Capela Nossa Senhora Aparecida`, `2° domingo — Capela Santa Rita de Cássia`,
   `3° domingo — Capela Santa Maria Madalena`, `4° domingo — Capela São Lourenço`) **sem
   informar a hora**. As 4 capelas estão no dataset, mas sem horário — não há como gravar.
7. **8 paróquias só com a matriz** (nenhuma capela/comunidade publicada): São João Batista
   (Cachoeira Dourada), N. Sra. Aparecida (Campina Verde/Honorópolis), N. Sra. de Fátima e São
   Sebastião (Canápolis), N. Sra. das Dores e São Benedito (Ituiutaba), Santuário N. Sra. da
   Abadia (Ituiutaba), Sagrado Coração de Jesus (Iturama) e o Santuário de Adoração Perpétua
   (Iturama).
8. **Nomes de comunidade com pontuação da fonte** foram limpos (`Comunidade São José.` →
   `Comunidade São José`), mas alguns endereços de comunidade seguem em formato local
   (`Av: 25, Bairro Operário`, `Rua: 22 esquina 31`) — mantidos verbatim.
9. **`website` sempre `null`** — o site diocesano não publica site próprio de paróquia, só as
   redes sociais da diocese.
10. **Comunidades de vida** (`/comunidade`): a Comunidade Católica Vida Missão e a Comunidade
    Católica Mar a Dentro estão no site e têm missa pública, mas **não são paróquias** e não
    foram registradas como tal — só o santuário que a Mar a Dentro administra, porque a própria
    diocese o lista entre as circunscrições da Forania Nossa Senhora de Fátima (ver item 1).
