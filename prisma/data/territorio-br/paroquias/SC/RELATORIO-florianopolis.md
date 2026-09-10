# Relatório — Arquidiocese de Florianópolis (SC)

Pesquisa executada em **2026-09-10**. Arquivo de dados: `florianopolis.json`.
Todas as estatísticas abaixo foram computadas do próprio JSON gravado.

## Resumo

| Item | Quantidade |
|---|---|
| Registros de paróquia/igreja | **82** (82 `alta` / 0 `media` / 0 `baixa`) |
| Comunidades/capelas | **642** (todas `alta`) — **76 das 82** com lista nominal |
| Horários fixos | **307** (286 `alta` / 0 `media` / 21 `baixa`) em **19** paróquias |
| Cobertura de paróquias | 82 / 74 esperadas (catholic-hierarchy 2023) — **100 % da lista oficial** |
| Municípios cobertos | **28** |

> **A grande vitória desta circunscrição:** as fichas individuais de `arquifln.org.br/igrejas/<slug>/`
> trazem, num widget dinâmico (JetEngine) fora do corpo do texto, **endereço + CEP + expediente +
> telefone + e-mail** de *todas* as 82 unidades, e no corpo do texto a **lista nominal completa de
> comunidades** com padroeiro, localidade e ano de criação. Por isso endereço/telefone/e-mail/pároco
> ficaram praticamente 100 % preenchidos com confiança `alta`, sem recorrer a agregador algum.

> **A lacuna:** a Arquidiocese **não publica horários de missa** de forma centralizada
> (`arquifln.org.br/home/horarios-de-missa` é, apesar do slug, a página de *expediente da Cúria*).
> Horários só existem onde a paróquia tem site próprio ativo — **23 de 82 têm site listado e só 21
> responderam**. Resultado: **63 paróquias sem nenhum horário** (lista completa no fim).

## Fontes principais

**91 URLs distintas**, todas acessadas em **2026-09-10**.

### 1. Site oficial da Arquidiocese — `arquifln.org.br` (86 URLs)

- `https://arquifln.org.br/paroquias` — **lista oficial completa**, agrupada por município, com link
  para a ficha de cada igreja. 82 entradas em 28 municípios.
- `https://arquifln.org.br/organizacao/1070-2` — 2 regiões episcopais e **13 foranias** (Biguaçu,
  Brusque, Camboriú, Florianópolis Centro-Sul, Florianópolis Continente, Florianópolis Norte, Itajaí,
  Itapema, Palhoça, Santo Amaro, São José, São José–Barreiros, Tijucas). As páginas de forania listam
  as paróquias, mas **sem endereço/telefone** — não acrescentaram dado novo além da divisão territorial
  (que o schema atual não armazena).
- `https://arquifln.org.br/igrejas/<slug>/` — **82 fichas individuais**, a fonte de praticamente todo o
  dataset: nome oficial, data de criação, CNPJ, pároco/vigários/diáconos/secretários, redes sociais,
  site, endereço, CEP, telefone, e-mail e a **tabela de comunidades** (padroeiro / localidade / ano).
- `https://arquifln.org.br/home/horarios-de-missa` — expediente e contato da Cúria Metropolitana
  (Rua Esteves Júnior, 447, Centro, 88015-130; (48) 3224-4799; `arquifln@arquifln.org.br`, e-mail
  recuperado do ofuscamento Cloudflare).

### 2. Sites próprios das paróquias (21 domínios que responderam)

Usados **exclusivamente para horários** (endereços e telefones vieram do site arquidiocesano):
`boaviagem.org.br`, `pnsg.org.br`, `paroquiadecanasvieiras.org.br`, `paroquiadecoqueiros.org.br`,
`catedralflorianopolis.org.br`, `paroquiadocampeche.org.br`, `paroquiaingleses.com.br`,
`sagradoscoracoes.org.br`, `paroquiasantacatarina.com`, `paroquiasantainesbc.com.br`,
`paroquiadatrindade.com`, `franciscanos.org.br`, `paroquiasantoantonio.net`,
`paroquiasaocristovao.com`, `paroquiadecapoeiras.org.br`, `psje.org.br`, `psjgaropaba.com.br`,
`saojudastadeubarreiros.org.br`, `paroquiaponte.com.br`, `paroquiasaoluisgonzaga.com`,
`paroquiasaovirgilio.com.br`, `santuariosantapaulina.org.br`.

### 3. Fontes secundárias (corroboração de cobertura e do bloco `diocese`)

- `https://www.catholic-hierarchy.org/diocese/dflor.html` — **74 paróquias**, 1.248.126 católicos,
  209 padres (dados de 2023); erigida diocese em 19/03/1908, elevada a arquidiocese em 17/01/1927;
  Dom Wilson Tadeu Jönck, S.C.I. nomeado em 28/09/2011.
- `https://gcatholic.org/churches/local/flor0` — 81 igrejas listadas (atualizado 01/01/2026), com a
  divisão em 13 foranias e — importante — separando as **duas paróquias militares** num bloco
  *"Other Churches Within the Diocesan Territory"*.
- `https://pt.wikipedia.org/wiki/Arquidiocese_de_Florianópolis` — 2 regiões episcopais, 13 foranias,
  30 municípios, 74 paróquias.

## Cobertura

`coverage`: `parishesFound` **82**, `parishesExpected` **74**.

A lista oficial traz 82 registros. Deles, **76 são paróquias da Arquidiocese** e 6 são de outra
natureza (detalhe na seção "Registros que precisam de validação humana"). Catholic-Hierarchy conta
**74 paróquias no anuário de 2023** — a diferença de 2 corresponde exatamente às paróquias criadas
depois: **Nossa Senhora de Fátima (Itajaí, 04/02/2024)** e **Nossa Senhora do Bom Sucesso
(Camboriú, 25/01/2025)**. Ou seja, **a cobertura de paróquias é de 100 %** e o dataset está mais
atualizado que as duas fontes secundárias (GCatholic também não tem as duas novas, nem a Paróquia
São João Batista de Biguaçu (2022), nem Nossa Senhora do Sagrado Coração/Campeche (2022), nem
São Sebastião/Palhoça (2022)).

### Preenchimento por campo (de 82 registros)

| Campo | Preenchido | Nulo |
|---|---|---|
| `neighborhood` | 82 (100 %) | 0 |
| `priestName` | 82 (100 %) | 0 |
| `address` | 81 (99 %) | 1 |
| `zipCode` | 81 (99 %) | 1 |
| `phone` | 81 (99 %) | 1 |
| `foundedYear` | 81 (99 %) | 1 |
| `email` | 79 (96 %) | 3 |
| `website` | 23 (28 %) | 59 |

Confiança: **82 `alta`** — nenhum registro fica fora da carga por confiança.

Nulos, um a um:
- `address`/`zipCode`/`email` — **Paróquia Nossa Senhora do Bom Sucesso (Camboriú)**: a ficha oficial
  só publica expediente e telefone.
- `phone`/`email` — **Paróquia Nossa Senhora de Fátima (Itajaí)**: ficha recém-criada, só com endereço.
- `email` — **Paróquia São João Batista (Biguaçu)**: o campo de e-mail da ficha repete o endereço.
- `foundedYear` — **Paróquia Nossa Senhora da Imaculada Conceição (Angelina)**: a ficha não traz a data
  de criação da paróquia (só a da igreja-matriz, 1921).

## Comunidades

- **642 comunidades**, todas `alta`, todas com fonte na ficha oficial da respectiva paróquia.
  **641 têm `neighborhood`** (localidade publicada pela própria Arquidiocese).
- **76 das 82** unidades têm lista nominal e **matriz identificada** (`isMatriz: true`); nenhuma
  paróquia tem mais de uma matriz.
- **6 sem lista** (`communities: []`, o importador criará só a igreja-matriz): Capelania Militar
  Cristo Rei, Capelania Militar Santa Catarina, Paróquia Militar Nossa Senhora de Loreto, Reitoria
  Santa Catarina de Alexandria, Capelania Spiritus Veritatis e Santuário Santa Paulina — todas são
  unidades **sem comunidades** por natureza (capelanias, reitoria e santuário).
- Maiores listas: São Virgílio/Nova Trento (30), São Joaquim/Garopaba (23), Santo Amaro (23),
  Nossa Senhora do Rosário/Palhoça (19), Angelina, São João Evangelista/Biguaçu, São Cristóvão/Itajaí
  e São Sebastião/Tijucas (18 cada).

## Horários

- **307 horários** em **19 paróquias**: 261 `MASS`, 25 `CONFESSION`, 11 `ROSARY`, 10 `ADORATION`.
- **286 `alta`** (site oficial da paróquia com sinal de atualidade — agenda/posts de 2026) e
  **21 `baixa`**, todos por **recorrência não representável no schema**: "1ª sexta-feira do mês",
  "3ª quinta-feira do mês", "1º e 3º domingo", "2º e 4º sábado", "apenas no 3º domingo". O motivo está
  escrito no `notes` de cada um.
- Paróquias com horários (nº de registros): Catedral (29), Sagrado Coração de Jesus/Ingleses (27),
  Santíssima Trindade (27), São João Evangelista/Biguaçu (26), São Luís Gonzaga/Brusque (25),
  Santa Inês/Bal. Camboriú (24), Nossa Senhora de Guadalupe/Canasvieiras (15), Santuário Santa Paulina
  (15), São Judas Tadeu e São João Batista/Ponte do Imaruim (15), Angelina (14), Santo Antônio/Campinas
  (14), Santa Catarina/Brusque (13), São Virgílio/Nova Trento (13), Sagrados Corações/Barreiros (13),
  Nossa Senhora do Sagrado Coração/Campeche (12), Nossa Senhora da Boa Viagem (10),
  São João Batista e Santa Luzia/Capoeiras (6), São Judas Tadeu/Barreiros (6),
  Nossa Senhora da Glória (3).
- **Nenhum horário aponta para nome de comunidade ambíguo** dentro da sua paróquia (verificado).
- **Não foram incluídas** "Celebrações da Palavra" (sem sacerdote) — o enum `type` não as comporta e
  registrá-las como `MASS` seria dado errado. Elas existem, sobretudo em Santa Catarina/Brusque,
  Ponte do Imaruim e São Virgílio, e estão descritas nas fontes citadas.
- **Não foram incluídos** horários de festas, tríduos, Semana Santa e novenas de data fixa
  ("dia 12 de cada mês", "todo dia 22"), conforme a regra do prompt.

## Registros que precisam de validação humana

### 1. Seis registros que **não são paróquias da Arquidiocese** (decidir se entram na carga)

| Registro | Cidade | Natureza |
|---|---|---|
| `militar-nossa-senhora-de-loreto-florianopolis` | Florianópolis | **Ordinariado Militar do Brasil** (Aeronáutica). CNPJ 37.174.174/0024-77 (do Ordinariado). GCatholic a lista fora da Arquidiocese. |
| `militar-cristo-rei-florianopolis` | Florianópolis | **Ordinariado Militar do Brasil** (Polícia Militar). CNPJ 37.174.174/0029-81. GCatholic idem. |
| `militar-santa-catarina-florianopolis` | Florianópolis | Capelania do **Exército** (14º BIMtz). |
| `spiritus-veritatis-itajai` | Itajaí | Capelania universitária *ad titulum personae* da UNIVALI (criada 30/10/2003). |
| `santa-catarina-de-alexandria-florianopolis` | Florianópolis | **Reitoria** da igreja do Colégio Catarinense (criada 31/03/1985). ⚠️ A lista de `arquifln.org.br/paroquias` a chama de "Paróquia Santa Catarina de Alexandria" e o GCatholic também a marca como *Parish*, mas **a própria ficha se intitula "Reitoria da Igreja Santa Catarina de Alexandria"** — adotei "Reitoria". **Divergência a confirmar.** |
| `santa-paulina-nova-trento` | Nova Trento | Santuário nacional (não paroquial); o GCatholic marca como *Parish, Shrine*. Território pastoral é da Paróquia São Virgílio. **Divergência a confirmar.** |

Os 76 registros restantes são paróquias plenas da Arquidiocese.

### 2. Nome da Catedral

Adotei **"Catedral Metropolitana Nossa Senhora do Desterro e Santa Catarina"** (prefixo `Catedral …`
previsto no README e usado no dataset do PR). A ficha oficial a chama de *"Paróquia Nossa Senhora do
Desterro e Santa Catarina"* e o site próprio, de *"Catedral Metropolitana de Florianópolis"*.

### 3. E-mail malformado (publicado assim na fonte oficial)

- **Paróquia Nossa Senhora do Sagrado Coração (Campeche)**: `secretária@paroquiadocampeche.org.br` —
  **com acento no local-part**, provável erro de digitação da própria paróquia (deveria ser
  `secretaria@…`). Mantido literalmente conforme publicado; **não corrigir sem confirmar**, mas
  atenção se o importador validar formato de e-mail.

### 4. Telefones com formatação irregular (copiados literalmente da fonte)

- Angelina: `48 3274-1185` (sem parênteses).
- Senhor Bom Jesus de Nazaré (Palhoça): `(48) 32421106 | Whatsapp: (48) 988317637` (sem hífen).
- Vários com dois ou três números no mesmo campo separados por `/`, `e` ou `|`
  (ex.: Boa Viagem, Divino Espírito Santo/Camboriú, Santíssimo Sacramento/Itajaí, São Cristóvão).
- Paróquia Militar Nossa Senhora de Loreto: `(48) 3229-5142 – Igreja / 4009-3607 – Base Aérea`
  (o segundo número está sem DDD na fonte).

### 5. Comunidades homônimas dentro da mesma paróquia (**não são duplicatas**)

Distinguem-se pela localidade (`neighborhood`). Se o importador desduplicar comunidade por nome
dentro da paróquia, **vai perder registros**. Casos:

- **Imaculada Conceição da Lagoa (Florianópolis)**: 4 × "Santa Cruz" (Fortaleza da Lagoa, Costa da
  Lagoa, Retiro da Lagoa, Porto da Lagoa).
- **São Joaquim (Garopaba)**: 2 × "Senhor Bom Jesus", 2 × "Cristo Rei", 2 × "São Francisco",
  2 × "São Sebastião", 2 × "Sagrado Coração de Jesus".
- **Nossa Senhora do Rosário (Palhoça)**: 2 × "Nossa Senhora dos Navegantes", 2 × "São Sebastião",
  2 × "Nossa Senhora Aparecida".
- Também: Nossa Senhora dos Navegantes/Gov. Celso Ramos (2 × "Senhor Bom Jesus"), Senhor Bom
  Jesus/Major Gercino (2 × "Santa Luzia"), Senhor Bom Jesus de Nazaré/Palhoça e Nossa Senhora do
  Rosário/São José e São João Batista/São João Batista (2 × "Nossa Senhora Aparecida" cada),
  Sagrado Coração de Jesus/Paulo Lopes (2 × "São Sebastião"), Santo Amaro (2 × "Nossa Senhora de
  Lourdes" — as duas grutas, Varginha e Velacho).

### 6. Sites listados pela Arquidiocese que estão **fora do ar** (por isso `website: null`)

DNS não resolve (verificado em 10/09/2026): `paroquiadalagoa.org`, `santuarioangelina.com.br`,
`nossasenhoradalapa.org.br`, `paroquiascjmeiapraia.com.br`, `pscruz.org.br`,
`santoantonioparoquia.com`. Redirecionam para a própria ficha do site arquidiocesano:
`azambuja.org.br`, `paroquiadaagronomica.org.br`. Vale reportar à Arquidiocese.

Observação: para a Paróquia Santo Antônio (Centro, Florianópolis) o site publicado é
`franciscanos.org.br` — **é o portal da Província Franciscana, não da paróquia**. Mantido porque é o
que a fonte oficial informa, mas é candidato a `null`.

### 7. Divergências de fonte pontuais

- **Sagrado Coração de Jesus (Ingleses)**: a matriz é **Nossa Senhora dos Navegantes, no Santinho**
  (1839), e o **Santuário Sagrado Coração de Jesus (Ingleses, 1998)** é outra comunidade — a ficha
  oficial confirma. O site da paróquia usa outras localidades para duas comunidades: "Santa Rita de
  Cássia" aparece como *Costa do Moçambique* (ficha: *Travessão*) e "Santos Arcanjos" como *Engenho*
  (ficha: *Capivari de Cima*). Mantive o `neighborhood` da ficha e registrei a localidade do site no
  `notes` do horário.
- **São Virgílio (Nova Trento)**: a ficha lista os vigários "Pe. Flávio Feller; Pe. Saymon Alves
  Mayer"; o site da paróquia lista "Pe. Flávio Feler; Pe. José Jacob Archer". `priestName` (pároco
  Pe. Pedro Schlichting) coincide nas duas.
- **Sagrados Corações (Barreiros)**: a ficha lista a comunidade "Santo Antônio — Major Durval"; o site
  a chama de "Comunidade Santo Antônio | Ipiranga". Mesma comunidade.
- **São Vicente de Paulo (Itajaí)**: a numeração das comunidades na ficha oficial pula (1, 4, 6, 7) —
  a lista publicada está **incompleta**; ficaram 4 comunidades no dataset.
- **Nossa Senhora de Azambuja (Brusque)**: paróquia (07/03/2009) *e* santuário (desde 1905). Nome
  mantido como "Paróquia Nossa Senhora de Azambuja".
- **Angelina**: paróquia *e* santuário (GCatholic: *Parish, Shrine* — "Santuário de Nossa Senhora de
  Angelina"). Nome mantido como "Paróquia …".

## O que ficou sem horário (63 registros)

Não há fonte oficial com horários para estas unidades — nem o site arquidiocesano nem site próprio
ativo. Ficaram com `schedules: []`. Candidatas naturais ao enxame de validação (Instagram/Facebook
oficiais, que a ficha de cada uma informa, ou agregadores):

Anitápolis (São Sebastião) · Antônio Carlos (Sagrado Coração de Jesus) · Bal. Camboriú (N. Sra.
Aparecida; São Sebastião) · Biguaçu (São João Batista) · Bombinhas (Imaculada Conceição) · Botuverá
(São José) · Brusque (Azambuja; Santa Teresinha; São Judas Tadeu) · Camboriú (Divino Espírito Santo;
N. Sra. do Bom Sucesso; Senhor Bom Jesus) · Canelinha (Sant'Ana) · Florianópolis (Capelania Militar
Cristo Rei; Capelania Militar Santa Catarina; Par. Militar N. Sra. de Loreto; Imaculada Conceição da
Lagoa; N. Sra. da Lapa; N. Sra. das Necessidades; N. Sra. de Fátima e Sta. Teresinha/Estreito; N. Sra.
de Lourdes e São Luiz/Agronômica; N. Sra. do Carmo/Coqueiros; Santa Teresinha do Menino Jesus/Prainha;
Santo Antônio/Centro; Santo Antônio e Sta. Maria Goretti/Coloninha; São Francisco Xavier/Monte Verde;
São José e Sta. Rita de Cássia/Jd. Atlântico; Reitoria Sta. Catarina de Alexandria) · Garopaba (São
Joaquim) · Gov. Celso Ramos (N. Sra. dos Navegantes) · Guabiruba (N. Sra. do Perpétuo Socorro) ·
Itajaí (Capelania Spiritus Veritatis; N. Sra. de Fátima; N. Sra. de Lourdes; Santíssimo Sacramento;
São Cristóvão; São João Batista; São João Bosco; São Pedro Apóstolo; São Vicente de Paulo) · Itapema
(Sagrado Coração de Jesus; Santo Antônio) · Leoberto Leal (Sagrado Coração de Jesus) · Major Gercino
(Senhor Bom Jesus) · Palhoça (N. Sra. do Rosário/Enseada de Brito; Senhor Bom Jesus de Nazaré; São
Francisco de Assis/Aririú; São Sebastião) · Paulo Lopes (Sagrado Coração de Jesus) · Porto Belo
(Senhor Bom Jesus dos Aflitos) · Santo Amaro da Imperatriz (Santo Amaro) · São Bonifácio (São
Bonifácio) · São José (N. Sra. Aparecida/Procasa; N. Sra. do Rosário; N. Sra. dos Navegantes e São
Pedro/Serraria; Sant'Ana/Colônia Santana; Santa Cruz/Areias; São Francisco de Assis/Forquilhinhas;
São José/Centro Histórico) · São João Batista (São João Batista) · São Pedro de Alcântara (São Pedro
de Alcântara) · Tijucas (São Sebastião).

Casos particulares: **São Cristóvão (Itajaí)** tem site ativo, mas a página "Horários de Missa" só
exibe avisos antigos (2021-2022) sem tabela; **São Joaquim (Garopaba)** e **Santo Antônio (Centro,
Florianópolis)** têm site que não publica horários.

## Nota metodológica

O widget dinâmico das fichas (`div.jet-listing-dynamic-field__content`) fica **fora** do bloco de
conteúdo do post, então uma leitura só do texto principal perde endereço, telefone e e-mail de todas
as 82 unidades — foi preciso extrair o widget separadamente. E-mails do site vêm ofuscados pelo
Cloudflare (`data-cfemail`); foram decodificados. Ambos os detalhes valem para quem reprocessar esta
arquidiocese ou outra que use o mesmo tema WordPress/Elementor + JetEngine.
