# Relatório — Diocese de São Gabriel da Cachoeira (AM)

Pesquisa: 2026-09-18. Arquivo: `paroquias/AM/sao-gabriel-da-cachoeira.json`.

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **11** |
| Confiança das entradas | 4 `alta`, 7 `media` |
| Comunidades/capelas | 15 (11 matrizes + 4 comunidades nomeadas) |
| Horários fixos | **9** — 6 `alta`, 3 `media`; **todos da catedral** |
| Cobertura | 11/11 conforme o ISA; 10 pela Wikipédia, 12+2 pelo gcatholic |

## A diocese não tem site — e a lista veio de uma frase citada, não de um portal

Testei quatro domínios plausíveis (`diocesesgc.org.br`, `diocesesaogabriel.org.br`,
`igrejadorionegro.org.br`, `diocesedesaogabrieldacachoeira.org.br`): **nenhum resolve em DNS**. Há
só redes sociais, e nenhuma entrega conteúdo a leitor automático além do cabeçalho:

- Facebook `/DioceseDeSaoGabrielDaCachoiera` — 7.325 seguidores; o HTML servido ao Googlebot é casca
  de JS (busca por "Paróquia" no arquivo de 3,4 MB: **zero ocorrências**).
- Instagram `@igrejadorionegro` — 228 posts, 1.235 seguidores; só a linha de perfil é legível.

**A lista saiu de uma frase LITERAL do Instituto Socioambiental** (29/02/2024, matéria da posse de
Dom Raimundo Vanthuy Neto), aberta e conferida no documento — não de resumo de buscador:

> "A Diocese é formada por 11 paróquias: três na cidade de São Gabriel da Cachoeira (Catedral, Dom
> Bosco e Aparecida), e seis no território indígena, sendo Taracuá, Iauaretê e Pari-Cachoeira
> (Triângulo Tukano), Assunção do Içana, Cucuí e Maturacá. Há ainda as paróquias de Santa Isabel do
> Rio Negro e Barcelos."

### Prova independente: a Receita confirma 8 dos 11 lugares

CNPJ da diocese **04.641.106** (obtido pelo Mapa das OSC/IPEA, fichas 399894/399895/860406).
Varredura de filiais em `minhareceita.org`: **10 estabelecimentos ativos, 0001 a 0010; 0011 a 0030
são 404.**

| Filial | Município registrado | Endereço |
|---|---|---|
| 0001 (sede) | São Gabriel da Cachoeira | Rua Sete de Setembro, 205 – Centro – 69750-000 |
| 0002 | **Manaus** | Rua Sete de Setembro, 2165 – Centro – 69020-120 (procuradoria, não é paróquia) |
| 0003 | São Gabriel da Cachoeira | 7 de Setembro, s/n – Centro |
| 0004 | Barcelos | Rua Ajuricaba, s/n – Centro – 69700-000 |
| 0005 | Santa Isabel do Rio Negro | Rua Rio Negro, s/n – Centro – 69740-000 |
| 0006 | São Gabriel da Cachoeira | Rio Uaupés, s/n – **Taracuá** |
| 0007 | São Gabriel da Cachoeira | Rio Tiquié, s/n – **Pari-Cachoeira** |
| 0008 | São Gabriel da Cachoeira | Rio Uaupés, s/n – **Iauaretê** – 69790-000 |
| 0009 | São Gabriel da Cachoeira | Rio Içana, s/n – **Içana** |
| 0010 | **Santa Isabel do Rio Negro** ⚠️ | Rio Maturacá, s/n – **Maturacá** |

⚠️ **A filial 0010 está com o município errado na Receita**: Maturacá fica em **São Gabriel da
Cachoeira**, aos pés do Pico da Neblina, não em Santa Isabel do Rio Negro. É exatamente a armadilha
que o README avisa. Gravei Maturacá em São Gabriel da Cachoeira.

Terceira confirmação: o documentário **"100 Anos da Diocese do Rio Negro"** (Rádio Rio Mar,
16/08/2025) "percorre as cidades e comunidades de **Barcelos, Santa Isabel do Rio Negro, Pari
Cachoeira, Maturacá, Cucuí, Içana, Taracuá e Iauaretê**" — e é ele que sustenta **Cucuí**, o único
lugar da lista sem estabelecimento próprio na Receita.

## Quatro paróquias ficaram SEM orago — de propósito

**Taracuá, Pari-Cachoeira, Assunção do Içana e Cucuí** não têm a invocação publicada em nenhuma fonte
aberta. Gravei o nome com o **topônimo** ("Paróquia de Taracuá") em vez de inventar um santo.

Resumos de buscador ofereceram "São Francisco" para Taracuá e "São Pedro de Alcântara" para
Pari-Cachoeira. **Fui atrás e os dois vêm do cadastro das MISSÕES FRANCISCANAS de 1870–1889**
(`riefbr.net.br`), registro histórico do século XIX que não diz nada sobre a paróquia de hoje —
salesiana desde 1923 (Taracuá) e 1946 (Pari-Cachoeira). Não usei. O topônimo "Assunção do Içana"
sugere Nossa Senhora da Assunção, mas isso é inferência e também ficou de fora do nome.

## As que têm orago confirmado

| Paróquia | Confiança | Fonte do nome |
|---|---|---|
| **Catedral São Gabriel Arcanjo** (SGC, Centro) | `alta` | o próprio perfil oficial se identifica como "Paróquia São Gabriel Arcanjo - Catedral"; gcatholic registra "Catedral São Gabriel" |
| **Paróquia São Miguel Arcanjo** (Iauaretê) | `alta` | Boletim Salesiano: "a Paróquia de São Miguel Arcanjo e mais 11 capelas"; ISMA confirma padroeiro São Miguel e a fundação em 1929 |
| **Paróquia Nossa Senhora de Lourdes** (Maturacá) | `alta` | ISMA: missão de 24/05/1956 "elevada a Paróquia em 1999", padroeira N. Sra. de Lourdes |
| **Paróquia Santa Isabel** (Santa Isabel do Rio Negro) | `alta` | página oficial no Facebook + ISMA (presença salesiana desde 1947) |
| **Paróquia Nossa Senhora da Conceição** (Barcelos) | `media` | a matriz de Barcelos é a Igreja Matriz N. Sra. da Conceição, herdeira da missão carmelita de "N. Sra. da Conceição de Mariuá" (1728) |
| Paróquia Dom Bosco, Paróquia N. Sra. Aparecida (SGC) | `media` | só o ISA, que as chama de "Dom Bosco" e "Aparecida"; sem endereço nem contato |

## Horários — só a catedral, e o Instagram salvou

A bio do Instagram oficial **@catedralsgc** (perfil **ATIVO**: posts em 16, 15, 13, 12, 11, 9 e 5 de
setembro de 2026) publica a grade:

> "🕊TER: 18h30 – Terço | 19h – Novena e Missa 🕊QUA e SEX | Missa 19h 🕊QUI | 6h15 Missa | 19h Adoração
> 🕊SAB | Missa nas…"

E **confirma palavra por palavra** a ficha 1339 do `liriocatolico.com.br` (mesmos telefone e
Instagram; missas TER/QUA/SEX 19:00, QUI 06:15; adoração QUI 19:00–20:00; observação "Terço: Terça
18:30 às 19:00 Novena e Missa"). Por isso:

- **6 horários `alta`** (terça a sexta) — bio oficial de perfil ativo + agregador coincidente.
- **3 horários `media`** — as missas de domingo (07:00, 09:00 e 19:30) só existem no `liriocatolico`,
  porque **o leitor automático trunca a bio a partir do sábado**. Não sobem a `alta`, mas também não
  caem a `baixa`: as 6 linhas de dias úteis da mesma ficha foram confirmadas pela bio, o que mostra
  que a ficha está atual.
- **O sábado NÃO foi gravado.** A bio começa a citá-lo ("SAB | Missa nas…") e a frase é cortada; o
  `liriocatolico` não registra sábado nenhum. Não invento o que não li.
- A novena de terça (19h) precede a missa; só a missa entrou. O terço de terça (18h30) entrou como
  `ROSARY`.

**As outras 10 paróquias entram sem nenhum horário.**

## Comunidades — a diocese mais indígena do Brasil, e quase nada publicado

Só **4 comunidades** entraram, todas da Inspetoria Salesiana:

| Paróquia | Comunidades |
|---|---|
| N. Sra. de Lourdes – Maturacá | Nossa Senhora de Nazaré, Inambu, Maiá (**Yanomami**) |
| Santa Isabel – Santa Isabel do Rio Negro | Sagrada Família de Maruiá (missão de 1962) |

**Iauaretê é o retrato do que falta**: o Boletim Salesiano fala em "um distrito missionário central,
que compreende a Paróquia de São Miguel Arcanjo e mais **11 capelas**", além de "outras **40
comunidades indígenas**", numa área de 42.108 km² com **16 etnias** (Tucano, Hupdes, Dessana,
Tariana, Piratapuia, Kubeo e outras) nos rios Uaupés e Papuri. **Nenhuma das 51 é nomeada em fonte
pública.** O mesmo vale para Taracuá, Pari-Cachoeira, Içana e Cucuí.

A diocese-irmã de Cachoeiro de Itapemirim resume a escala: ~280.000 km², ~90.000 habitantes,
"nove, em cada dez habitantes, são indígenas", e "três presbíteros e dois diáconos vindos de
comunidades indígenas" (um deles o Padre Odílio Gentil dos Santos).

## Precisa de validação humana

1. **Os 4 oragos que faltam** — Taracuá, Pari-Cachoeira, Assunção do Içana e Cucuí. É a pendência
   número 1: só a Cúria (97) 3471-1367 resolve.
2. **Contagem divergente** — ISA diz **11** paróquias (02/2024), Wikipédia e a página da diocese de
   Cachoeiro dizem **10**, gcatholic diz **12 paróquias e 2 missões** (2021). Adotei as 11 do ISA,
   que é a única que nomeia cada uma; mas pode faltar 1 (a "12ª" do gcatholic) ou sobrar 1.
3. **Dom Bosco e Aparecida (cidade de São Gabriel)** — existem só como nome de duas palavras no ISA.
   Sem orago formal, endereço, bairro, contato nem clero, e sem estabelecimento próprio na Receita.
   São as duas entradas mais frágeis do arquivo.
4. **Município errado na Receita (Maturacá)** — a filial 0010 está registrada em Santa Isabel do Rio
   Negro. Gravei em São Gabriel da Cachoeira; se alguém reimportar direto da Receita, o erro volta.
5. **Maruiá** — a Inspetoria Salesiana lista a missão de Maruiá (Sagrada Família, 1962) junto com a
   presença de Santa Isabel do Rio Negro. Pode ser presença autônoma, e não comunidade da paróquia.
   Gravada como comunidade com `media`.
6. **Sábado na catedral** — a bio oficial começa "SAB | Missa nas…" e o texto é cortado. Vale
   completar (provavelmente "missa nas comunidades").
7. **Filial 0003 da Receita** — segundo estabelecimento em São Gabriel da Cachoeira, na mesma Rua 7
   de Setembro, sem identificação. Pode ser a Paróquia Dom Bosco, a Aparecida ou uma obra; não
   atribuí.
8. **Ano de fundação de Barcelos** — 1728 é a missão carmelita de Mariuá, não a ereção da paróquia.
   Deixei `null`.
9. **Comunidades indígenas** — 51 só em Iauaretê, mais as de Taracuá, Pari-Cachoeira, Içana e Cucuí.
   É a maior lacuna de todo o Amazonas.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

Registro atual: `address: "Av. 7 de Setembro 205"`, `zipCode: "69750-000"`,
`phone: "(97) 3471-1367"`, `email: null`, `website: null`,
`bishopName: "Dom Raimundo Vanthuy Neto"`, `foundedYear: 1910`.

- **Nada a corrigir.** Endereço, CEP, cidade, UF, telefone e bispo conferem com a Receita e com o
  gcatholic; `website: null` está certo — **a diocese realmente não tem site**, e é bom que continue
  `null` em vez de apontar para rede social.
- Para registro: a Receita grafa o logradouro como **"Rua Sete de Setembro, 205 – Centro"**
  (o `dioceses.json` diz "Av. 7 de Setembro 205" — é a mesma via).
- `foundedYear: 1910` é a **Prefeitura Apostólica do Rio Negro**; prelazia em 1925, diocese (de Rio
  Negro) em **30/10/1980** e nome atual em **21/10/1981**. Mesma questão de critério que a de Borba.
- Redes oficiais, se o modelo vier a ter campo para isso: Instagram **@igrejadorionegro** e Facebook
  **/DioceseDeSaoGabrielDaCachoiera**.
