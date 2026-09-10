# Relatório de pesquisa — Arquidiocese de São Paulo (SP)

- **Arquivo de dados**: `paroquias/SP/sao-paulo.json`
- **Data da coleta**: 2026-09-10
- **Circunscrição**: Arquidiocese de São Paulo — `sao-paulo` — sede São Paulo/SP
- **Arcebispo**: Dom Odilo Pedro Scherer (Cardeal)

## Resultado em números

| Item | Quantidade |
|---|---|
| Paróquias no dataset | **312** (todas com `confidence: alta`) |
| Paróquias com endereço | 312 (100%) |
| Paróquias com bairro | 312 (100%) |
| Paróquias com telefone | 310 (99,4%) |
| Paróquias com e-mail | 298 (95,5%) |
| Paróquias com site próprio | 161 (51,6%) |
| Paróquias com nome do pároco | 213 (68,3%) |
| Paróquias com ano de fundação | 302 (96,8%) |
| Comunidades | 92 (72 matrizes + 20 comunidades/capelas nomeadas); 240 paróquias ficam com `communities: []` |
| Horários fixos | **735** (678 alta, 39 media, 18 baixa) em **70 paróquias** (22,4%) |
| Horários por tipo | 679 MASS, 47 CONFESSION, 5 ROSARY, 4 ADORATION |

## Fontes principais

1. **`https://arquisp.org.br/mapa/` — "Mapa de Paróquias" (fonte primária).** A página embute um
   vetor JSON oficial (`parishData`) com **312 registros**: nome, URL da ficha, latitude/longitude,
   endereço, telefone e região episcopal de cada paróquia. Foi a espinha dorsal da lista.
2. **Ficha individual de cada uma das 312 paróquias** em `https://arquisp.org.br/<regiao>/<paroquia>/`
   (todas as 312 baixadas e lidas). Cada ficha traz um bloco estruturado idêntico com os campos
   **Pároco, Data de Fundação, Decanato, Endereço, Contato e Expediente**. Daí saíram pároco,
   ano de fundação, endereço, e-mail, site e os horários publicados oficialmente.
3. **Sites próprios das paróquias** (33 paróquias): usados só para horários, com transcrição
   conferida à mão bloco a bloco (ver "Horários" abaixo).
4. **`https://arquisp.org.br/curia-metropolitana/`**: telefone (11) 3660-3700 e e-mail
   `chancelaria@arquisp.org.br` da Cúria.
5. **`catholic-hierarchy.org/diocese/dsapa.html`**: 307 paróquias em 2023 (Anuário Pontifício 2024),
   confirmação do arcebispo e dos bispos auxiliares — usado como aferição independente de cobertura.
6. **Wikipédia, "Paróquias da arquidiocese de São Paulo"** (wikitexto bruto): tabela com 301 linhas
   de paróquia (região episcopal, decanato, nome, ano de ereção) e uma segunda tabela com 24
   unidades não paroquiais — usada como conferência cruzada de ano de fundação e como mapa das
   áreas pastorais.

## Cobertura

`parishesFound: 312` / `parishesExpected: 312`.

A lista de paróquias está **completa** em relação ao diretório oficial: os 312 registros do mapa
foram enumerados um a um e cada um teve a ficha própria lida. As aferições independentes batem:

- catholic-hierarchy (Anuário Pontifício 2024): **307** paróquias em 2023;
- Wikipédia (dados de 2019): **308** paróquias (298 territoriais + 10 pessoais).

A diferença é explicada pelas paróquias erigidas depois desses recenseamentos — três delas em 2026,
todas presentes no dataset: **São João Paulo II** (26/07/2026), **Santo Antônio de Pádua – Parque
Nações Unidas** (15/08/2026) e **Nossa Senhora do Carmo – Jardim Roseli** (16/08/2026).

### Distribuição por região episcopal

| Região episcopal | Paróquias | Com horários | Com comunidades listadas |
|---|---:|---:|---:|
| Belém | 67 | 27 | 3 |
| Sé | 61 | 18 | 0 |
| Santana | 60 | 3 | 1 |
| Brasilândia | 42 | 6 | 2 |
| Ipiranga | 41 | 12 | 0 |
| Lapa | 40 | 3 | 0 |
| Catedral da Sé (categoria "igrejas") | 1 | 1 | 0 |
| **Total** | **312** | **70** | **6** |

> A região episcopal e o **decanato** de cada paróquia foram coletados (o decanato está em toda ficha
> oficial), mas **não há campo para eles no formato do `README.md`** e por isso não entraram no JSON.
> Se o Parish for modelar decanatos/regiões, o dado é recuperável relendo as fichas.

## Comunidades

O site da Arquidiocese **não publica lista de comunidades/capelas por paróquia** — não há campo para
isso na ficha. Só entraram comunidades quando o texto da própria ficha enumera explicitamente a
composição atual da paróquia:

| Paróquia | Comunidades | Confiança |
|---|---|---|
| Nossa Senhora do Carmo – Jardim Roseli | São José Operário, São João Evangelista, Nossa Senhora Aparecida, São Francisco de Assis, Nossa Senhora de Guadalupe, Aliança Nova Siloé | alta (matéria de 08/2026) |
| Santo Antônio de Pádua – Parque Nações Unidas | Nossa Senhora da Paz, São José, São Paulo Apóstolo, Sagrado Coração de Jesus | alta (matéria de 08/2026) |
| São João Paulo II | São Judas Tadeu, Santa Dulce dos Pobres, Nossa Senhora Aparecida | alta (matéria de 07/2026) |
| Nossa Senhora da Luz | São Tarcisio, São Francisco, São Paulo, Santa Edwiges | media (texto oficial sem data) |
| Cristo Libertador | Maria Libertadora, Nossa Senhora de Guadalupe | media (texto histórico oficial) |
| Nossa Senhora de Fátima e São Roque | Capela da Ressurreição | alta (site da paróquia, com missa própria) |

Nas demais 306 paróquias, 66 têm só a matriz nomeada (porque têm horário preso a ela) e **240 ficam
com `communities: []`** — nesses casos o importador cria a igreja-matriz automaticamente.

### Listas de comunidades **descartadas** de propósito

- **Paróquia Jesus Ressuscitado** — a ficha cita "10 comunidades: Jesus Ressuscitado, São João
  Batista, São José Operário, Sagrado Coração de Jesus, Natividade de Maria, Imaculada, São Miguel,
  Santa Rita, Espírito Santo e Nossa Senhora de Lourdes", mas o próprio texto diz que era a situação
  **antes do desmembramento de 1993** (que originou a Paróquia Santo André Apóstolo). Não é a
  composição atual.
- **Paróquia Imaculado Coração de Maria – Jd. Princesa** — a ficha lista comunidades da antiga *Área
  Pastoral do Elisa Maria* (1984) e afirma que hoje são "onze comunidades", sem enumerá-las. Lista
  atual não determinável pela fonte.

## Horários fixos

Duas origens, ambas oficiais:

1. **Ficha oficial da Arquidiocese (37 paróquias).** O campo "Expediente" quase sempre traz só o
   horário da secretaria; **apenas 37 das 312 fichas publicam missas/confissões/adoração/terço**.
   A extração foi automatizada e conferida contra o texto de origem.
2. **Site próprio da paróquia (33 paróquias).** Os 147 sites de paróquias sem horário na ficha foram
   baixados (104 responderam); 33 tinham bloco de horário de missas identificável. **Cada um desses
   33 blocos foi lido e transcrito à mão** — a varredura automática só serviu para localizar o bloco,
   porque ela misturava horário de secretaria com horário de missa em vários sites.

**Regras aplicadas**

- Intervalo de atendimento ("Confissões: das 14h às 16h30") vira **um** registro no horário de
  início, com o intervalo completo em `notes` — não dois registros.
- Missa de **recorrência mensal** com dia da semana conhecido ("1ª sexta-feira do mês") entra como
  `baixa` com a recorrência em `notes`.
- Missa de **dia fixo do mês** (sem dia da semana) **não entra**, por não caber em `MassSchedule`:
  - Paróquia Santa Rita de Cássia – Mirandópolis: "Todo o dia 22, dia devocional à Santa Rita: 7h,
    15h e 19h";
  - Paróquia Divino Espírito Santo – COHAB Teotônio Vilela: "Todo dia 19 do mês: 20h";
  - Santuário Nossa Senhora da Salette: bloco "Dia 19 de cada mês" (7h/15h/19h30 em dia útil,
    7h/17h no sábado, 7h/9h/11h/18h30 no domingo).
- Datas especiais (festas, tríduos, novenas) foram ignoradas, conforme o prompt.

### Os 18 horários `baixa` (recorrência mensal — aguardam a decisão de modelagem)

Bom Jesus dos Passos – N. Sra. do Ó (terço, 2ª terça do mês) · Coração Eucarístico de Jesus e Santa
Marina (2) · Divino Espírito Santo – COHAB Teotônio Vilela · Nossa Senhora da Consolação (missa só
no 1º sábado) · Nossa Senhora da Saúde (1ª sexta) · Nossa Senhora das Flores · Nossa Senhora das
Graças – Vila dos Andrades · Nossa Senhora do Carmo – Jardim Roseli (4, missas quinzenais em
comunidades) · Santa Rita de Cássia – Mirandópolis (2) · Santa Rosa de Lima/Perus (2) · Santo
Alberto Magno · São Gaspar Bertoni (adoração na 1ª quinta).

### Os 3 conjuntos `media`

- **Nossa Senhora de Fátima e São Roque** — apenas a missa de domingo às 18h: o site publica
  `18sh00` (erro de digitação), lido como 18h00. As demais missas dessa paróquia são `alta`.
- **Santo Antônio do Pari** e **São Francisco de Assis – Lg. São Francisco** — horários publicados
  em `franciscanos.org.br` (site oficial da Província Franciscana da Imaculada Conceição, página da
  fraternidade), e não em site da própria paróquia.

## O que ficou sem (para uma próxima rodada)

- **242 paróquias (77,6%) sem nenhum horário.** É o maior buraco. Caminhos possíveis, em ordem de
  qualidade: (a) as ~110 paróquias com site próprio cujo horário está em subpágina (`/horarios`,
  `/missas`) ou é renderizado por JavaScript — a coleta feita só leu a home; (b) Instagram/Facebook
  oficial, que é onde boa parte das paróquias de São Paulo publica horário; (c) agregadores
  (horariodemissa.com.br, missas.com.br, Google Maps) — que, sozinhos, dariam `baixa` e não entram
  em produção, e por isso não foram usados nesta rodada.
- **Comunidades/capelas de 306 paróquias.** Nenhuma fonte oficial da Arquidiocese lista comunidades
  por paróquia; só os sites/redes das próprias paróquias têm isso.
- **43 sites de paróquia não responderam** (timeout, host fora do ar ou bloqueio a leitor
  automático) e não foram investigados um a um.
- **99 paróquias sem nome de pároco** e **14 sem e-mail** — o campo simplesmente está vazio na ficha
  oficial. O `Clero` (`https://arquisp.org.br/clero/`) pode fechar essa lacuna.
- **CEP**: só 1 das 312 fichas publica CEP; `zipCode` é `null` em 311 registros. As coordenadas
  (lat/lon) de todas as 312 estão no `parishData` do mapa oficial e permitiriam geocodificação
  reversa, mas não há campo para elas no formato atual.

## Pontos para o enxame de validação humana

1. **Catedral da Sé × Paróquia Nossa Senhora da Assunção e São Paulo — checar se são um registro ou
   dois.** O site publica as duas: a *Catedral da Sé* (Praça da Sé s/nº, tel. (11) 3107-6832,
   `catedraldasesp@gmail.com`, Pe. Luiz Eduardo Pinheiro Baronto, "fundação" 1954 = ano da dedicação
   do templo) está na categoria **"igrejas"**, fora das seis regiões episcopais; a *Paróquia Nossa
   Senhora da Assunção e São Paulo* (fundada em 1591, a paróquia catedralícia) está na Região Sé
   com sede na **igreja de São Gonçalo**, Praça Dr. João Mendes, 108, tel. (11) 3106-8119.
   Foram mantidas como **dois registros** porque têm endereço, telefone, e-mail, clero e horários
   distintos — mas canonicamente a catedral é a igreja daquela paróquia. **Decisão de produto.**
2. **Igreja de São Gonçalo abriga duas paróquias** no dataset: a catedralícia (item 1) e a *Paróquia
   Pessoal Nipo-Brasileira São Gonçalo* (1966). Confirmar que ambas seguem ativas.
3. **15 áreas pastorais e 9 igrejas/capelas não paroquiais** aparecem na Wikipédia mas **não** no
   diretório oficial, e portanto **não estão no JSON**. Vale checar se alguma já virou paróquia ou
   se devem ser cadastradas como comunidades:
   - Áreas pastorais: São Francisco de Assis e N. Sra. Aparecida (Belém/Conquista), N. Sra. do Carmo
     e Santa Teresa de Calcutá (Belém/São Mateus), Regina Mundi (Belém/Tatuapé), N. Sra. dos Espinhos
     e Santa Cruz (Belém/Vila Alpina), São José Operário (Belém/Vila Prudente), Santo Antônio
     (Brasilândia/Jaraguá), Santo Agostinho e São Mateus (Brasilândia/Perus), N. Sra. e Sant'Ana
     (Brasilândia/São José Operário), São Paulo Apóstolo (Ipiranga/Anchieta), São Domingos de Gusmão
     e Santo Estêvão Mártir (Ipiranga/Cursino), São João Batista (Lapa/Butantã).
   - Igrejas/capelas históricas do Decanato Catedral: Santa Cruz das Almas dos Enforcados, Santo
     Antônio, N. Sra. do Carmo, N. Sra. da Boa Morte, N. Sra. do Rosário dos Homens Pretos, Chagas do
     Seráfico Pai São Francisco, Capela Menino Jesus e Santa Luzia, Basílica Menor Abadicial N. Sra.
     da Assunção (Mosteiro de São Bento) e a Capelania Militar Santo Expedito (Bom Retiro).
4. **E-mail da Cúria**: o `dioceses.json` já carregado em produção registra `portal@arquisp.org.br`;
   a página oficial da Cúria publica **`chancelaria@arquisp.org.br`**, que é o usado neste arquivo.
   Conferir qual deve prevalecer.
5. **Paróquia Nossa Senhora do Carmo – Jardim Roseli**: a ficha oficial mistura contatos — o
   Instagram publicado é `@nsciguatemi` e o e-mail `secretaria.pns@gmail.com`, que não conferem com
   o nome da paróquia. Provável erro de digitação da própria Arquidiocese; o telefone
   (11) 2707-8495 bate com o do mapa.
6. **Duas paróquias sem telefone**: Imaculado Coração de Maria – Jd. Princesa e São Francisco de
   Sales – Vila Gumercindo.
7. **10 paróquias sem ano de fundação** na ficha e sem correspondência única na Wikipédia:
   N. Sra. da Paz; N. Sra. das Graças – Jd. Anhanguera; N. Sra. Mãe Rainha; Santa Cruz – Jd. Santa
   Cruz; Santa Cruz de Itaberaba; Santa Luzia – Jd. Primavera; São José – Perus; São José Operário –
   Jd. Damasceno; São Judas Tadeu – Morada do Sol; São Sebastião – Mascarenhas de Moraes.
8. **Paróquia São Paulo da Cruz – Calvário**: o site publica dois conjuntos de horário (um com
   missas 11h/19h30 em dia útil, outro com "Terça a Sábado às 18h30" e "Domingo às 8h"), sem dizer a
   que igreja cada um pertence. Só o primeiro entrou (matriz); o segundo precisa de conferência.
9. **Nomes com sufixo de bairro**: 157 paróquias têm o nome publicado no formato
   "Paróquia São José – Vila Zelina". O sufixo foi **mantido** no `name` porque é a forma oficial e
   porque garante unicidade (há, p. ex., várias "Paróquia São José" na mesma cidade); o bairro
   também está em `neighborhood`. Confirmar se o Parish prefere exibir sem o sufixo.
