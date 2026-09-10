# Relatório de pesquisa — Diocese de Santos (SP)

- **Arquivo gerado:** `paroquias/SP/santos.json`
- **Data da pesquisa:** 2026-09-10
- **Agente:** enxame de pesquisa do território (`PROMPT-pesquisa.md`)

## Resumo

| Métrica | Valor |
|---|---|
| Entradas no arquivo | **53** (50 paróquias + 3 igrejas não paroquiais) |
| Paróquias | **50** (50 alta / 0 media / 0 baixa) |
| Comunidades / capelas | **262** (todas alta), em 46 das 53 entradas |
| Horários fixos | **815** (763 alta / 0 media / 52 baixa) — 739 MASS, 52 CONFESSION, 12 ADORATION, 12 ROSARY |
| Cobertura | **50 / 50 (100 %)** |

Municípios cobertos: Santos (20 paróquias), São Vicente (9), Guarujá (6), Praia Grande (5),
Cubatão (3), Itanhaém (3), Peruíbe (2), Bertioga (1) e Mongaguá (1) — exatamente os nove
municípios do litoral que a diocese declara.

## Fontes principais

Tudo veio do **site oficial da diocese** (`https://www.diocesedesantos.org.br`), que publica
uma página por igreja, organizada por município, com abas de Atendimento, Clero, Horários de
Missa, Histórico e **Capelas** (com endereço e horário de cada comunidade):

| Fonte | Uso |
|---|---|
| `…/paroquias/<municipio>` (9 páginas) | lista canônica das igrejas de cada município |
| `…/paroquias/<municipio>/<slug>` (55 páginas) | endereço, CEP, telefone, pároco, data de criação, comunidades e horários |
| `…/diocese/curia-diocesana` | Cúria: Av. Conselheiro Rodrigues Alves, 254 — Macuco — 11015-200 |
| `…/diocese/bispos/bispo-diocesano` | Dom Joaquim Giovani Mol Guimarães |
| `https://www.catholic-hierarchy.org/diocese/dsnts.html` | 56 paróquias (número anterior às mudanças de 2023–2024 — ver Cobertura) |
| `https://pt.wikipedia.org/wiki/Paróquias_da_diocese_de_Santos` | conferência da lista e das 8 regiões pastorais |

**Observação técnica:** o site responde **403 ao leitor automático padrão**; a coleta foi feita
com `User-Agent` de navegador. O mesmo vale para o site da Diocese de Taubaté.

## Cobertura

A seção "Paróquias" do site tem **55 páginas**, que renderam **53 entradas** neste arquivo.
O número de paróquias — **50** — fecha por três caminhos:

1. Ao criar a **Paróquia Cristo Rei** do Guarujá em 10/02/2023, a própria diocese a chamou de
   *"a quinquagésima paróquia da Diocese de Santos"*;
2. depois vieram **São Gaspar Bertoni** (Praia Grande, 08/01/2024, **+1**) e a **unificação**
   de São Jorge Mártir com São Benedito, em Santos, em 07/10/2023 (**−1**) — saldo zero;
3. a contagem por município no site bate exatamente com 50.

O **catholic-hierarchy.org registra 56**, número anterior a essas mudanças e não confirmado
por nenhuma fonte oficial atual. A Wikipédia diz "53" no texto, mas a sua própria tabela soma
51 e não inclui Bertioga.

### Três entradas que NÃO são paróquias (mantidas no dataset com o prefixo no nome)

Seguem o padrão que o agente de Santo André usou para os oratórios: ficam no arquivo pelo
valor dos horários, mas **não devem virar paróquia no import**.

| Entrada | Por quê |
|---|---|
| **Convento Nossa Senhora do Carmo** (Santos) | igreja conventual dos Carmelitas; o clero listado é um **Reitor**, não pároco, e não há data de criação nem capelas |
| **Reitoria Bom Jesus dos Navegantes** (São Vicente) | criada em 02/03/2014 como **Reitoria**, desmembrada da Paróquia São João Evangelista |
| **Reitoria Nossa Senhora do Amparo** (São Vicente) | a própria página diz *"Paróquia: São Vicente Mártir"*, e a página de São Vicente Mártir a lista entre as suas capelas |

⚠️ A Wikipédia lista **Nossa Senhora do Amparo (1969)** e **Bom Jesus dos Navegantes (2014)**
como *paróquias* de São Vicente. **Contradição a validar** — foi adotada a classificação do
site oficial (Reitoria).

### Duas páginas absorvidas como comunidades

Não viraram entrada própria porque a própria fonte as vincula a uma paróquia:

- **Santuário Santo Antônio do Valongo** → comunidade da **Paróquia Nossa Senhora da Assunção**
  (a página do Santuário diz "Paróquia: Nossa Senhora da Assunção" e a página da paróquia o
  lista em Capelas). Os seus 9 horários de missa e 10 de confissão foram para lá.
- **Capela Santa Edwiges – Stella Maris** → comunidade da **Paróquia Nossa Senhora dos
  Navegantes** (a página diz "Paróquia: Nossa Senhora dos Navegantes").

## Pontos para o enxame de validação

### 1. Nenhum e-mail de paróquia foi recuperado — 0 de 53 (maior lacuna)

O site é Joomla com **anti-spam por JavaScript**: onde deveria haver o e-mail, o HTML traz
literalmente *"Este endereço de email está sendo protegido de spambots. Você precisa do
JavaScript ativado para vê-lo."* O endereço **não está no HTML** (foi verificado: nem em
atributos, nem em variáveis `addy…`, nem em texto cifrado recuperável). Todos os `email`
ficaram `null` — inclusive o da própria **Cúria Diocesana**.

**Sugestão para a validação:** renderizar as páginas com um navegador real (JS ligado), ou
buscar os e-mails nas redes sociais de cada paróquia.

### 2. Missas de recorrência mensal — 52 registros `baixa`

Mesmo problema de modelagem já registrado no README. Concentração muito maior em uma paróquia:

| Paróquia | `baixa` / total | Situação |
|---|---|---|
| **Nossa Senhora das Graças (Guarujá)** | **14 / 22** | **9 das 10 comunidades só têm missa mensal** ("2º e 4º domingo", "1ª e 3ª terça", "2ª Segunda"…). Só a matriz tem grade semanal |
| São João Batista (Bertioga) | 4 / 26 | 3 das 16 comunidades + a 1ª sexta da matriz |
| Imaculado Coração de Maria (Santos) | 4 / 23 | devoções mensais da matriz |
| Nossa Senhora da Lapa (Cubatão) | 3 / 22 | Ecopátio, Posto Locatelli e a capela do Hotel Lopes |

Quando a mesma comunidade aparecia em duas linhas mensais que caem no **mesmo slot semanal**
(p. ex. "1º e 3º Sábado" + "2º e 4º Sábado" no mesmo horário), os registros foram **fundidos**,
com as frases originais preservadas no `notes`.

**Descartados por não terem dia da semana** (recorrência por dia do mês):

| Entrada | Texto na fonte |
|---|---|
| Santuário São Judas Tadeu (Santos) | "TODO DIA 28 MISSA DEVOCIONAL A SÃO JUDAS TADEU" |
| Capela Santa Edwiges – Stella Maris (Santos) | "Todo dia 16: 15h00 e 19h30" |
| Comunidade Nossa Senhora de Fátima – Santo Antônio (Praia Grande) | "Todo dia 13, missa às 19h30" |
| Comunidade São Judas Tadeu – Santo Antônio (Praia Grande) | "Todo dia 28, missa às 17h" |
| Comunidade N. S. de Fátima – Santa Margarida Maria (Santos) | "Missa votiva todos os meses, dia 13, às 18h" |
| Comunidade N. S. de Fátima – Cristo Rei (São Vicente) | "Todo dia 13, missa votiva de Nossa Senhora de Fátima" |

### 3. "Missa/Celebração da Palavra" — 9 registros ambíguos

A **Paróquia São Francisco de Assis (Cubatão)** rotula *todos* os horários das suas 7
comunidades como **"Missa/Celebração da Palavra"** — pode ser missa ou celebração da Palavra
(sem padre). Foram gravados como `MASS` **com aviso no `notes`**, porque o schema não tem tipo
para celebração da Palavra.

Pelo mesmo motivo, **foram descartadas** as linhas explicitamente rotuladas só como
"Celebração da Palavra", sem missa — a **Paróquia São Judas Tadeu (Cubatão)** tem 6 delas
(terça 18h na matriz e nas comunidades São Pedro e São Paulo, N. S. Aparecida, N. S. Mãe da
Igreja e Jesus Ressuscitado). **Se o Parish quiser exibi-las, precisa de um tipo novo.**

### 4. Horários com sinal de desatualização

- **Comunidade Santo Inácio de Loyola (Santuário Sagrado Coração de Jesus, Santos):**
  "Domingo às 10h **(Fechada, no momento, em função da pandemia)**" — texto de 2020/2021 ainda
  no ar em 2026. Gravado com aviso no `notes`.
- **Capela Nossa Senhora Rosa Mística (Cristo Rei, Guarujá):**
  "Domingo: 20h30 **(Até o final de abril)**" — horário sazonal, sem ano.
- **Igreja Matriz de Sant'Anna (N. S. da Conceição, Itanhaém):** *"As atividades litúrgicas
  estão temporariamente suspensas devido às obras."* Gravada como comunidade **sem horário**.
- **Paróquia Nossa Senhora de Fátima e Santo Amaro (Guarujá):** a comunidade N. S. Auxiliadora
  tem só "**Sexta do mês** às 19h30" — a fonte omite qual sexta. Gravado `baixa`.

### 5. Contradição na data de criação de uma paróquia

**Nossa Senhora de Fátima e Santo Amaro (Guarujá):** o campo diz "Data da Criação:
**30 de novembro de 1957**", mas o texto logo abaixo diz "Desmembrada da Paróquia do Valongo
por Decreto de **24/09/1934**". Adotado 1957 (é o campo estruturado, e bate com a Wikipédia),
mas **precisa de checagem**. Note que 30/11/1957 é exatamente a mesma data da criação da
Paróquia Nossa Senhora das Graças do Guarujá — pode ser erro de cópia no site.

### 6. Cinco entradas sem `foundedYear` (aba Histórico vazia na origem)

Nossa Senhora da Lapa e São Francisco de Assis (Cubatão), Nossa Senhora da Conceição
(Itanhaém), Nossa Senhora do Carmo (Santos) e o Convento do Carmo. **Nunca inventadas.**
A Wikipédia traz anos para três delas — **N. S. da Lapa 1937, N. S. da Conceição de Itanhaém
1853, N. S. do Carmo de Santos 1960** — que ficaram de fora por não estarem na fonte oficial;
são um bom ponto de partida para a validação.

### 7. Detalhes menores

- **Sem CEP (2):** Nossa Senhora da Conceição (Itanhaém) e Nossa Senhora dos Navegantes
  (Santos) — a fonte não publica.
- **Sem telefone (1):** Reitoria Bom Jesus dos Navegantes (São Vicente).
- **CEP corrigido:** a Paróquia Santo Antônio (Praia Grande) traz "CEP: 1701-750" na fonte
  (7 dígitos). Gravado **11701-750**, que é o CEP real da Av. Castelo Branco no Boqueirão —
  vale confirmar.
- **Sete entradas sem comunidades listadas:** Imaculado Coração de Maria, N. S. Aparecida e
  N. S. do Carmo (Santos), São Pedro "O Pescador" (São Vicente) e as três não paroquiais.
- **Confissão em apenas 8 das 53 entradas** (52 registros): a maioria das páginas não publica
  horário de confissão. Não é omissão da coleta.
- **Comunidade Santa Catarina de Alexandria** está listada sob a Paróquia São João Batista de
  **Bertioga**, mas o seu endereço é *"Av. Andrade Soares, 15, Caruara, **Santos** - SP"*.
  Caruara é bairro continental de Santos, na divisa — pode ser correto (atendimento pastoral
  por Bertioga) ou erro da fonte.
- **Paróquia São José Operário (Santos)** aparece nos horários como "Paróquia São José Operário
  **e Nossa Senhora do Terço**" — outra unificação, registrada no nome da comunidade-matriz.
- As janelas de confissão ("das 9h às 11h30") viraram **um** registro no horário de início, com
  o intervalo completo preservado no `notes`; janelas de manhã e de tarde no mesmo dia geraram
  dois registros.
- O **e-mail e o telefone da Cúria** foram tirados do rodapé do site, presente em todas as
  páginas; o e-mail está ofuscado e ficou `null`.
