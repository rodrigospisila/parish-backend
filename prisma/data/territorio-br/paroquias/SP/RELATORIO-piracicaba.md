# Relatório de pesquisa — Diocese de Piracicaba (SP)

- **Arquivo**: `paroquias/SP/piracicaba.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: pesquisa de território BR — lote centro-leste paulista

## Fonte principal

O site oficial **diocesedepiracicaba.org.br** publica as paróquias agrupadas por município
(`capa.asp?p=318` → 15 páginas de cidade → 68 páginas de paróquia). Cada página de paróquia traz
endereço com CEP, telefones, site, e-mail, data de criação, região pastoral, pároco, **lista de
capelas com endereço** e um bloco estruturado de **HORÁRIOS DE MISSAS** com subtítulos por
comunidade, além de blocos separados de terço, adoração e confissões.

| Fonte | URL | Uso |
|---|---|---|
| Paróquias (índice por município) | `https://diocesedepiracicaba.org.br/capa.asp?p=318` | lista canônica de 15 municípios |
| Página de cada município | `https://diocesedepiracicaba.org.br/capa.asp?paroquia=<N>` | links das 68 paróquias |
| Página de cada paróquia | `https://diocesedepiracicaba.org.br/capa.asp?paroquia=<N>` | todos os dados |
| Regiões pastorais | `https://diocesedepiracicaba.org.br/capa.asp?p=354` | corroboração das 7 regiões |
| Wikipédia — Diocese de Piracicaba | `https://pt.wikipedia.org/wiki/Diocese_de_Piracicaba` | criação 26/02/1944, 15 municípios, 68 paróquias |

> **Nota técnica**: as páginas são servidas em **ISO-8859-1/CP1252** (não UTF-8) — foi preciso
> decodificar explicitamente, senão todos os acentos viram lixo.

## Cobertura

| Métrica | Valor |
|---|---|
| Paróquias | **68** |
| Esperado | **68** (número declarado pela própria diocese e pela Wikipédia) → **100%** |
| Confiança das paróquias | 68 `alta` |
| Comunidades/capelas | **341** |
| Horários fixos | **777** (666 `alta`, 111 `baixa`) |
| Tipos | 722 `MASS`, 30 `ADORATION`, 20 `CONFESSION`, 5 `ROSARY` |
| Paróquias sem nenhum horário | 2 |

Distribuição por município: Piracicaba 28, Rio Claro 12, Santa Bárbara d'Oeste 12, Capivari 3,
Rio das Pedras 2, São Pedro 2, e 1 cada em Águas de São Pedro, Charqueada, Corumbataí, Ipeúna,
Mombuca, Rafard, Saltinho, Santa Gertrudes e Santa Maria da Serra.

Regiões pastorais (gravadas no campo extra `pastoralRegion`, que o importador ignora):
Rio Claro 15, Santa Bárbara 12, Piracicaba III 11, Piracicaba II 10, Piracicaba I 8,
Capivari 7, São Pedro 5.

Campos preenchidos: e-mail 67/68, telefone 66/68, ano de criação 65/68, pároco 53/68,
site próprio em várias paróquias.

## Decisões de modelagem

- **`Santo Antônio - Sé Catedral`** (nome literal do site) foi normalizada para
  **`Catedral Santo Antônio`**, seguindo a regra de prefixo do README.
- As demais 67 vêm sem prefixo no site (só "São José", "Imaculada Conceição"…); foi acrescentado
  o prefixo **`Paróquia `**.
- **`Paróquia Santo Antônio (Distrito de Ajapi)`** (Rio Claro) preserva o parêntese porque é
  assim que a diocese distingue a paróquia do distrito; o `slug` ignora o parêntese.
- Capelas com bairro entre parênteses ("São Benedito (Centro)") tiveram o bairro copiado para
  `neighborhood` da comunidade, mantendo o nome como publicado.
- Os blocos "TERÇO", "ADORAÇÃO" e "ATENDIMENTO E CONFISSÕES" viraram horários de tipo
  `ROSARY`/`ADORATION`/`CONFESSION`; os blocos de batismo, catequese e expediente de secretaria
  foram descartados.
- `foundedYear` veio de "Criação: dd/mm/aaaa" do site — datas plausíveis e variadas (1774 a
  anos 2000), **não** é data de cadastro no CMS.

## Pontos para validação humana

1. **111 horários com `confidence: "baixa"` = recorrência mensal.** Exemplos da própria fonte:
   *"Todo dia 13 de cada mês – Missa Votiva de Santo Antônio"* (Catedral),
   *"1ª terça-feira do mês: 19h30"*. Não cabem em `MassSchedule`; a regra literal está em `notes`.
2. **2 paróquias sem horário publicado**: Nossa Senhora da Conceição (Ipeúna) e São José
   (São Pedro).
3. **Missa ou Celebração da Palavra**: a Catedral publica "Sexta-feira: 19h30 (missa **ou**
   celebração da Palavra)" na Capela Nossa Senhora Aparecida. Como a fonte cita missa, o registro
   entrou como `MASS`, mas é ambíguo. Outras ocorrências do mesmo padrão existem em paróquias do
   interior.
4. **Pároco ausente em 15 paróquias** — campo em branco na fonte.
5. **Telefones múltiplos**: o site frequentemente publica dois números ("Fones: (19) 3422-3941 e
   3422-8489"); só o primeiro foi gravado em `phone`.
6. **"Horto (Centro)"** aparece como capela da Catedral — é a capela do Horto Florestal, sem
   orago no nome; nome preservado como publicado.
7. A diocese não publica o nome do bispo em página de fácil leitura automática; `bishopName`
   ficou `null` (o dado está em `dioceses.json`, que não foi tocado).
