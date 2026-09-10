# Diocese de Jales (SP) — relatório de pesquisa

- **Arquivo**: `paroquias/SP/jales.json`
- **Data da coleta**: 2026-09-10
- **Resultado**: 54 registros de paróquia/quase-paróquia (54 `alta`), 280 comunidades
  (280 `alta`), 221 horários fixos (110 `alta`, 111 `baixa`) em 45 municípios.
- `validate.cjs` roda limpo para este arquivo.

## Fontes principais

| Fonte | Uso |
|---|---|
| https://diocesedejales.org.br/paroquias-app/ | Índice das 54 paróquias e quase-paróquias, por setor |
| Página de cada paróquia (54 páginas, CPT `paroquias`) | Horários da matriz e das comunidades, listas "Comunidades Urbanas/Rurais", quadro INFORMAÇÕES (setor, telefone, e-mail, endereço, clero) e histórico |
| https://www.catholic-hierarchy.org/diocese/djale.html | Criação em 12/12/1959; 29 paróquias (2023); bispo José Reginaldo Andrietta |
| https://pt.wikipedia.org/wiki/Diocese_de_Jales | Bula *Ecclesia Sancta*; 45 municípios |
| Rodapé do portal | Mitra Diocesana: Rua Vinte, 3036, Centro, Jales/SP, 15700-118, (17) 3632-1370, curia@diocesedejales.org.br |

O portal bloqueia leitores automáticos por *User-Agent* (HTTP 403 para WebFetch); a coleta foi
feita com um agente de navegador. Os e-mails estão protegidos pelo ofuscador do Cloudflare e
foram decodificados a partir do atributo `data-cfemail` — **apenas** o que aparece antes do
rodapé, para não capturar o e-mail da cúria que se repete em todas as páginas.

## Cobertura

- **54 encontradas** × **29 esperadas**. Não é divergência: o catholic-hierarchy conta só as
  paróquias plenas (29, dado de 2023), enquanto o próprio site publica **54 paróquias e
  quase-paróquias**. O JSON traz 30 "Paróquia …", 23 "Quase-paróquia …" e a
  **Catedral Nossa Senhora da Assunção** (o site a chama "Paróquia Nossa Senhora da Assunção -
  Catedral"; foi normalizada para o prefixo "Catedral").
- Preenchimento: e-mail 51/54, endereço 51/54, CEP 49/54, pároco 49/54, telefone 46/54,
  bairro 22/54.
- Melhor cobertura de comunidades das quatro circunscrições: **280 comunidades**, com casos como
  Ilha Solteira (19), Santa Fé do Sul/São João Batista (16), Auriflama (15) e
  São João das Duas Pontes (14). Só 11 paróquias ficaram apenas com a matriz.
- **5 sem nenhum horário publicado**: Nossa Senhora Aparecida (Auriflama), São Luiz Gonzaga
  (Fernandópolis), **Catedral Nossa Senhora da Assunção (Jales)**, Santa Terezinha (Rubinéia) e
  Senhor Bom Jesus (Turmalina) — verificado página a página, o bloco não existe na origem.

## Decisões de normalização

- **Grafia dos municípios**: o site alterna "Aparecida d' Oeste", "Estrela D' Oeste",
  "Santa Clara d'oeste", "Guarani D'Oeste", "Macedonia", "Rubineia". Normalizados para a grafia
  do IBGE (`Aparecida d'Oeste`, `Estrela d'Oeste`, `Santa Clara d'Oeste`, `Guarani d'Oeste`,
  `Macedônia`, `Rubinéia`).
- **"Paróquia Senhor Bom Jesus – Brasitânia (Fernandópolis)"**: Brasitânia é distrito de
  Fernandópolis; `city` = Fernandópolis.
- **Ordinais por extenso** ("Segunda sexta-feira do mês" = 2ª sexta-feira) tratados como
  recorrência mensal, não como dois dias da semana.
- **Missas mensais** ficaram `baixa` com a linha original em `notes` — são 111 dos 221 horários,
  a maior proporção das quatro circunscrições, porque a diocese é de comunidades rurais atendidas
  uma vez por mês.
- O texto histórico fica na mesma coluna das listas de comunidade; linhas com mais de 70
  caracteres, com pontuação de frase, URLs ou CNPJ foram descartadas.

## Pontos para o enxame de validação

1. **E-mails repetidos entre paróquias** (parecem escritórios compartilhados, mas conferir):
   - `saobenedito.urania@diocesedejales.org.br` em 3 registros (Urânia, Aspásia e mais um)
   - `nsdasdores.generalsalgado@…` em 3
   - `nsaparecida.pontalinda@…`, `cristoluzdomundo.ilhasolteira@…`, `saojose.meridiano@…` e
     `saofranciscoxavier.pereirabarreto@…` em 2 cada
2. **Catedral Nossa Senhora da Assunção sem horário de missa** — improvável na prática; o site
   simplesmente não publica. A catedral tem site próprio (catedraldejales.org.br) que não foi
   raspado.
3. Comunidades com nome composto que talvez devessem ser várias:
   "Comunidade Chácara Jerusalém, Lar Madre Paulina, Vicentinos".
4. **23 quase-paróquias** entram como paróquia no importador — confirmar se é o comportamento
   desejado (o prefixo "Quase-paróquia" foi preservado no `name`).
5. **8 paróquias sem telefone e 3 sem endereço** — completar por contato direto.
6. Muitas comunidades vêm sem endereço e sem bairro: o site lista apenas o nome, às vezes com o
   bairro depois de um travessão (capturado em `neighborhood` quando existia).
