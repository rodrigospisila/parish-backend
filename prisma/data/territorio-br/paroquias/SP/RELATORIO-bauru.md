# Relatório de pesquisa — Diocese de Bauru (SP)

- **Arquivo gerado:** `paroquias/SP/bauru.json`
- **Data da pesquisa:** 2026-09-10
- **Agente:** enxame de pesquisa do território (`PROMPT-pesquisa.md`)

## Resumo

| Métrica | Valor |
|---|---|
| Paróquias (registros) | **43** (42 alta / 1 media / 0 baixa) |
| Comunidades / capelas | **179** |
| Horários fixos | **469** (361 alta / 2 media / 106 baixa) |
| Cobertura | **43 / 43 da lista oficial (100 %)** — esperado no catholic-hierarchy: 42 |

Municípios cobertos (13): Bauru (27), Agudos (3), Pederneiras (3), Arealva, Avaí, Boracéia,
Cabrália Paulista, Duartina, Gália, Iacanga, Lucianópolis, Paulistânia e Piratininga (1 cada).

Tipos de horário: 429 `MASS`, 23 `ROSARY`, 17 `ADORATION`. Nenhuma paróquia publica horário de
confissão (0 `CONFESSION`).

## Fontes principais

O endereço fornecido na tarefa (`http://www.bispadobauru.org.br`) **não abre**: o certificado
TLS está expirado. O domínio `bispadobauru.org.br` continua vivo só como **servidor de e-mail** —
a maioria das paróquias usa `<nome>@bispadobauru.org.br`. O site institucional atual é
`https://diocesedebauru.com.br`, e é dele que vieram **100 %** dos dados.

A página `/paroquias/` é uma listagem paginada (10 por página) e `/paroquias-diocese/` mostra só
16 registros. A lista canônica foi obtida pela API REST do WordPress do próprio site:

| Fonte | Uso |
|---|---|
| `https://diocesedebauru.com.br/wp-json/wp/v2/paroquias?per_page=100` | lista canônica — cabeçalho `X-WP-Total: 43` |
| `https://diocesedebauru.com.br/wp-json/wp/v2/cidades` e `/-regiao-pastoral` | taxonomias de cidade e região pastoral (RP1–RP7) |
| `https://diocesedebauru.com.br/paroquias/<slug>/` | uma página por paróquia: endereço, CEP, telefone, WhatsApp, e-mail, site, Facebook, Instagram, YouTube, data de criação, festa e dedicação do padroeiro, pároco, vigário, diácono, coordenador do CPP, tesoureiro, atendente, **horário de missas por capela com endereço** e bloco "Orações" (terços, adorações, missas votivas) |
| `https://diocesedebauru.com.br/curia-diocesana/` | Cúria: Rua Doutor Fernando Costa, 3-30, Vila Nova Santa Clara, 17014-130; (14) 3879-8706 / 3227-7796; Dom Rubens Sevilha, OCD; CNPJ 44.454.312/0001-40 |
| `https://www.catholic-hierarchy.org/diocese/dbaur.html` | ereção em 15/02/1964 (desmembrada de Botucatu e Lins); 42 paróquias (2023); sufragânea de Botucatu |

O site cadastra **o endereço de cada capela**, o que é raro — por isso 179 comunidades têm
`address` preenchido na maioria dos casos. Nenhum agregador foi necessário.

## Cobertura

A API devolve **43 registros** e todos foram coletados. O catholic-hierarchy.org registra **42
paróquias** (2023). A diferença de 1 é a **Paróquia Maronita Nossa Senhora do Líbano (Bauru)**,
que o próprio site da diocese identifica como pertencente à **Eparquia Maronita do Brasil** —
outra jurisdição (rito maronita). Foi gravada com `confidence: "media"` e é o único registro
`media` do arquivo. **Decidir se entra na carga da Diocese de Bauru** — o caso é análogo ao das
paróquias de rito ucraniano listadas por dioceses latinas do Paraná.

Detalhe do caso: o pároco, Mons. Rubens Miraglia Zani, é do **clero diocesano de Bauru** e
recebeu autorização da Santa Sé para celebrar no rito maronita (birritualidade) — daí a paróquia
aparecer no site de Bauru.

## Pontos para o enxame de validação

### 1. Cento e seis horários `baixa` — recorrência mensal (o maior bloco fora do banco)

É o maior percentual das três circunscrições desta rodada (23 % dos horários). Todos são o
problema de modelagem já registrado no README. Dois padrões dominam:

**(a) O bloco "Orações"** — quase toda paróquia publica "Missa do Sagrado Coração de Jesus: toda
primeira sexta-feira do mês", "Missa em reparação ao Imaculado Coração de Maria: todo primeiro
sábado", "Missa Carismática: toda terceira quarta-feira" etc. São ~40 registros.

**(b) Capelas rurais em rodízio** — casos extremos:

- **Paróquia Santa Catarina de Alexandria (Arealva)** — 16 capelas/comunidades, **15 delas
  mensais** ("3ª quinta-feira", "2º sábado", "1º, 3º e 4º domingo"). É a paróquia com mais
  comunidades do dataset e a que mais perde horários na carga.
- **Paróquia São Sebastião (Avaí)** — 8 capelas, **todas mensais**, incluindo três em aldeias
  indígenas (Aldeia Tereguá, Aldeia Ekeruá e Aldeia Kopenoty, esta com duas capelas).
- **Paróquia Santa Maria (Piratininga)** — as 4 capelas rurais se revezam ("1º e 3º sábado",
  "2º e 4º sábado", "1º e 3º domingo", "4º domingo"), todas às 16h.
- **Paróquia São José (Gália)** — 7 comunidades, 6 mensais.

**Horários descartados por não terem dia da semana:**

- Paróquia Nossa Senhora Aparecida (Pederneiras), Capela Santa Luzia: *"Dia 13/12: às 7h"* — é
  data fixa anual, não recorrência semanal;
- Paróquia Santa Luzia (Bauru): *"Missa da Luz: todo dia 13 de cada mês, às 20h"* e *"Missa
  Votiva de São José: todo dia 19 de cada mês, às 19h30"*;
- Paróquia São Judas Tadeu (Pederneiras): *"Missa Votiva à Santa Águeda: todo dia 5 do mês"* e
  *"Missa Votiva a Santa Filomena: todo dia 10 do mês"*;
- Paróquia São Paulo Apóstolo (Agudos), Capelas São Sebastião e São Roque: publicam **só "18h30"
  sem dia nenhum** — as capelas foram criadas, sem horário;
- Paróquia Santa Luzia (Duartina), Capela São José: *"1º e 3º domingo: Santa Missa / 2º e 4º
  domingo: Celebração da Palavra"* — **sem hora**; só a missa de quarta-feira às 20h dessa capela
  entrou;
- Paróquia Santa Luzia (Duartina), Capela São Judas Tadeu: idem — a missa do 1º e 3º domingo às
  17h entrou (`baixa`), mas a "Celebração da Palavra" do 2º e 4º domingo não é missa e foi
  descartada.

### 2. Missas universitárias com calendário por data (descartadas)

A **Paróquia Universitária do Sagrado Coração de Jesus (Bauru)** publica missas em três campi
por **data específica do ano letivo**, não por dia da semana:

- UNESP: 05/03, 23/04, 21/05, 25/06, 27/08, 24/09, 29/10, 26/11 às 18h10 (sala 8);
- USP: 24/02, 24/03, 14/04, 26/05, 23/06, 18/08, 22/09, 27/10, 24/11 às 13h (Capela do Centrinho);
- FIB: 14/05, 11/06, 13/08, 10/09, 08/10, 12/11, 10/12 às 18h (sala D022).

**Nada disso entrou** — não cabe em `MassSchedule` e as datas são do calendário de um ano
específico (provavelmente 2025), sem indicação de qual. Só a grade do UNISAGRADO (segunda a
sexta) e a da matriz foram gravadas. **Se o Parish quiser exibir capelania universitária, isto
precisa de modelagem própria e de reconferência anual.**

### 3. Paróquia com dois templos onde o segundo é um santuário

**Paróquia São Judas Tadeu e São Dimas (Bauru)** tem, como comunidade, o **Santuário Nossa
Senhora de Fátima** (Jardim Estoril), que concentra mais missas que a própria matriz (segunda a
sexta 6h30; domingo 10h30, 17h30 e 19h30; novena perpétua às quartas). Gravado como comunidade
`Santuário Nossa Senhora de Fátima`, mas **vale conferir se não é um santuário diocesano com
estatuto próprio**, que mereceria registro separado.

Situação parecida, menor: **Paróquia Senhor Bom Jesus (Bauru)** lista uma capela **sem nome** —
só o endereço "Rua Chiyo Otake, 6-70, Vila Santista". Gravei como `Capela da Vila Santista`;
**o nome real precisa ser confirmado.**

### 4. Divergência de endereço na Catedral

O rodapé/cabeçalho de todas as páginas do site traz "R. Fernando Costa, 3-30 – Vila Nova Santa
Clara" (que é o endereço da **Cúria**), enquanto o bloco "Informativo" da página da Catedral traz
**"Praça Rui Barbosa, 3-30, Centro, Bauru – SP. CEP: 17010-200"**. Usei o segundo (específico da
paróquia). Note que a **Paróquia São Judas Tadeu e São Dimas** fica de fato na Rua Fernando
Costa, 3-10 — quase colada à Cúria.

### 5. Telefones e campos vazios na origem

- **Sem CEP (1):** Paróquia São João Batista e Nossa Senhora de Lourdes (Bauru) — a página traz
  só "Rua Pedro Fernandes, nº 13-84, Bauru – SP".
- **Sem e-mail (1):** Paróquia Maronita Nossa Senhora do Líbano.
- **Telefone preenchido só com o DDD "(14)"** em Santa Luzia (Bauru) e Santa Teresinha do Menino
  Jesus e da Sagrada Face (Paulistânia); **campo vazio** em São Brás (Bauru) e São Sebastião
  (Avaí); e **literalmente "Não tem"** em Nossa Senhora Aparecida (Pederneiras). Nesses cinco
  casos gravei o **WhatsApp** publicado logo abaixo, que é um número válido. **Sinalizar:** o
  número gravado pode ser celular pessoal, não o fixo da secretaria.
- O inverso também ocorre — **WhatsApp só com "(14)"** em São Pedro Apóstolo (Lucianópolis),
  Senhor Bom Jesus do Mirante (Cabrália Paulista) e Nossa Senhora das Graças (Bauru); nesses o
  telefone fixo está correto e foi o gravado.
- O WhatsApp de Paulistânia, **(14) 92000-8501**, tem formato atípico (9 + 2000-8501) e pode
  estar digitado errado na origem.

### 6. Erros de digitação da fonte corrigidos silenciosamente

- `Pe. Mário Alves Banderia, RCJ` → **Bandeira** (N. S. das Graças, Bauru);
- `Pe Valdecir fa Silva Godi` (vigário de Iacanga) — não gravado, só o pároco entra em
  `priestName`;
- URLs com `htpps://` em São Cristóvão (Bauru) → normalizadas para `https://`;
- `https://` e `https://ParoquiaCoracaoJesusBauru` truncados no campo Facebook de várias páginas
  → ignorados (o dataset não tem campo de rede social).

### 7. Nomes: prefixo adicionado pelo agente

O site publica os títulos **sem o prefixo** ("Santa Rita de Cássia", "São Brás", "Imaculada
Conceição") e, quando há homônimas, **com a cidade colada no fim** ("Santa Luzia Duartina",
"Santa Luzia Bauru", "São Paulo Apóstolo Agudos", "Santo Antônio Agudos", "Santa Maria –
Piratininga/Sp"). Conforme o README, gravei "Paróquia " + padroeiro e movi a cidade para `city`.
Exceções mantidas literais: `Catedral do Divino Espírito Santo`, `Santuário Nossa Senhora
Aparecida`, `Paróquia Universitária do Sagrado Coração de Jesus` e `Paróquia Maronita Nossa
Senhora do Líbano`.

### 8. Detalhes menores

- **Cinco paróquias só com a matriz** (sem capelas): Catedral, Santa Rita de Cássia, Santa
  Teresinha do Menino Jesus, São Sebastião e a Maronita — todas urbanas no centro de Bauru, o que
  é plausível.
- O **Distrito de Tibiriçá** (Bauru) aparece apenas como capela da Paróquia São Brás (Capela
  Nossa Senhora Aparecida), não como paróquia própria — confere com a listagem oficial.
- A **Paróquia Nossa Senhora das Graças (Bauru)** é a única servida por religiosos rogacionistas
  (RCJ) e hospeda o **Seminário Propedêutico** (missa de quinta às 19h30 gravada com essa nota).
- A Diocese de Bauru se autodenomina, no rodapé do site, **"Diocese do Divino Espírito Santo –
  Bauru"**. Mantive `Diocese de Bauru`, que é o nome canônico (*Dioecesis Bauruensis*) e o usado
  em `dioceses.json`.
