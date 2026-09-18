# Diocese de Juazeiro — relatório de pesquisa

- **Slug**: `juazeiro` · **UF**: BA · **Sede**: Juazeiro · **Província**: Feira de Santana · **Regional**: Nordeste 3
- **Pesquisa**: 18/09/2026
- **Bispo**: Dom Valdemir Vicente Andrade Santos · **Vigário Geral**: Mons. Jodean Amâncio dos Santos
- **Cúria**: Rua Carmela Dutra, 24, Centro · 48903-530 · (74) 3611-7825 / (74) 9 8130-1740 · diocese@diocesedejuazeiro.org.br
- **Site oficial**: <https://diocesedejuazeiro.org.br> — **vivo e muito atualizado** (fichas de paróquia republicadas em 06/08/2026)
- **Território**: 9 municípios — Juazeiro, Curaçá, Sobradinho, Casa Nova, Sento Sé, Remanso, Pilão Arcado, Campo Alegre de Lourdes e Uauá

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **19** — todas `alta` |
| Comunidades | 26 = 19 matrizes (`alta`) + 7 (1 `alta`, 4 `media`, 2 `baixa`) |
| Horários fixos | **59** (48 MASS · 5 ADORATION · 5 CONFESSION · 1 ROSARY) — **10 `media`**, 49 `baixa` |
| Paróquias com algum horário | 9 de 19 |
| Horários carregáveis (`alta`/`media`) | **10**, todos da Catedral Santuário |

**Cobertura: 19 de 19.**

## Fontes principais

1. **`diocesedejuazeiro.org.br`** — WordPress com tipo de conteúdo `location`. O índice
   `/locais/paroquias` mostra **só 13 das 19** (defeito de categorização do CMS: as páginas de
   forania listam 1 paróquia cada). A lista **completa** veio do
   `wp-sitemap-posts-location-1.xml` / `-2.xml`: 19 fichas, **todas republicadas em 06/08/2026**.
   Cada ficha `/local/<slug>` traz endereço, bairro, CEP, telefone e e-mail institucional.
2. **Receita Federal via `minhareceita.org`** — todas as paróquias são **filiais do CNPJ 14.663.306**.
   Varredura de `/0001` a `/0030`: **20 filiais ATIVAS** (sede + 19 paróquias), nada de `/0021` em diante.
3. **`santuariomaedasgrotas.blogspot.com`** — site próprio da Catedral, linkado pela ficha oficial
   da diocese. Deu a **única grade oficial de horários** da diocese e a lista de **comunidades** da Catedral.
4. `diocesedejuazeiro.org.br/curia` (bispo, vigário geral, vigários episcopais) e `/historico`.
5. Instagram oficial `@paroquianossasenhoradasgrotas` (posts até 17/09/2026, pároco na bio) e
   `@paroquia.n.s.dorosarioremanso` (até 30/08/2026).
6. `liriocatolico.com.br` — 17 fichas no território.

## Prova de completude — duas contagens que fecham

| Fonte | Total |
|---|---|
| Sitemap `location` do site oficial | 19 fichas de paróquia |
| Filiais ATIVAS do CNPJ 14.663.306 | 20 = sede + **19 paróquias** |

Casam **uma a uma**, por título e município. As duas mais novas — Santa Teresinha de Lisieux
(Carnaíba do Sertão) e São Sebastião (Pau a Pique) — foram inscritas na Receita em 11 e 12/2022 e
ainda usam e-mail de "setor pastoral".

## Horários

### A grade oficial da Catedral (`media`, 10 registros)

A página **"Horários das Celebrações"** do site da paróquia está no ar hoje e o seu conteúdo é
**idêntico** ao da captura do Arquivo da Internet de **24/11/2023** (única captura existente) —
ou seja, é texto **pós-pandemia** e estável, de fonte oficial ainda linkada pela diocese em 2026:

> dom 09h e 19h · seg 18h (+ Terço dos Homens 19h) · ter 18h (Novena Perpétua) · qua 18h ·
> qui 09h exposição do Santíssimo, 11h30 Ofício, 12h bênção e Hora da Graça, 17h30 retirada, 18h missa ·
> sex 18h · sáb 19h

O **Lírio Católico**, fonte independente, repete exatamente domingo 09h e 19h, segunda 18h, sexta
18h e sábado 19h. Com fonte oficial pós-2020 + corroboração independente, gravei **`media`**.
**Divergência**: o site diz Terço dos Homens às **19h**, o Lírio diz **19:30** — gravei 19h (oficial)
com a divergência em `notes`.

O blog **não** postou nada depois de 25/12/2023: é o ponto fraco desta grade e o primeiro item para
o enxame de validação.

### O resto (`baixa`, 49 registros)

Tudo do `liriocatolico.com.br`, fonte única não oficial cuja data `2026-09-02` é de **carga da
base**, não de conferência. Paróquias cobertas: Santo Antônio (Juazeiro), Santa Teresinha (Piranga),
São Cosme e São Damião, N. Sra. de Fátima, Santo Antônio (Pilão Arcado), N. Sra. do Rosário
(Remanso), São José (Sento Sé), além das comunidades São Geraldo, Santíssimo Redentor, São Francisco
de Assis (Country Club) e Santa Maria Goretti.

O que **não** existe:
- A diocese **não publica horários**. A busca interna devolve uma página "Horários de Missas" de
  **19/03/2014** — pré-pandemia, descartada pela regra do README.
- `buscamissa.com.br` não cobre a região; as fichas do `horariodemissa.com.br` da Bahia são de
  2013–2018 e a busca por cidade do site é AJAX (não devolveu nada).
- Instagram: as bios das paróquias **não trazem grade**. A de Remanso guarda os horários num
  destaque de stories, que o leitor automático não abre.

## Comunidades

A página "Comunidades" do blog da Catedral lista **5 além da matriz**: São Geraldo (Av. Edgard
Chastinet, bairro São Geraldo), São Pedro (Novo Encontro), Santíssimo Redentor (Av. Paulo VI,
Centro), Santa Joana Francisca (Av. Flaviano Guimarães, Centro) e São Vicente (Morada do Rio).
**São Geraldo é `alta`**: a ficha oficial da diocese, de 08/2026, também a publica, mas com o nome
**"Área Pastoral São Geraldo"** e outro endereço (Av. Paulo Rios Campelo, s/n) — foi esse o nome e
o endereço gravados. As outras quatro são `media` (site oficial da paróquia sem sinal de atualidade).

Nenhuma outra das 18 paróquias publica lista de comunidades.

## Precisa de validação humana

1. **Endereço da Catedral — três versões**: ficha da diocese (2026) "Praça da Bandeira, s/n, Centro,
   48903-490" (**gravado**); Receita "Praça Imaculada Conceição, s/n, 48900-120"; blog da paróquia
   "Praça da Catedral N. Sra. das Grotas, s/n, 48903-970".
2. **CEP de N. Sra. Sant'Ana (Santana do Sobrado, Casa Nova)**: a ficha oficial imprime
   **48903-970**, que é de Juazeiro e está errado. Gravei o **47310-000** da Receita.
3. **Divergências de CEP** entre ficha oficial e Receita em Santo Afonso (48903-130 × 48905-350),
   São Cosme e São Damião (48903-271 × 48904-350), Santa Teresinha de Lisieux (48924-999 × 48922-000)
   e São Francisco de Assis/Maniçoba (48921-000 × 48924-000). Em todos prevaleceu a ficha oficial.
4. **Foranias**: a diocese tem 4 (São José, N. Sra. do Rosário, N. Sra. das Grotas e Bom Jesus), mas
   as páginas de forania do site listam **uma paróquia cada** — o vínculo paróquia→forania **não foi
   gravado**, por falta de fonte.
5. **Párocos**: o site **não publica pároco por paróquia** e a página `/clero` devolve 404. Só dois
   foram gravados: Mons. Jodean Amâncio dos Santos (Catedral, pela bio do Instagram oficial) e
   Pe. João Borges dos Santos Filho (São Sebastião/Pau a Pique, porque a ficha oficial dá o telefone
   como "(74) 98852-2937 (Pe. João Borges)" e a página da Cúria completa o nome).
6. **Terço dos Homens da Catedral**: 19h (oficial) × 19:30 (Lírio).
7. **N. Sra. de Fátima (Juazeiro)**: a ficha do Lírio de onde veio a grade traz um endereço
   (Av. Benedito de Almeida Moraes, 22) que **não bate** com o oficial (Av. Irmã Dulce, Alto da
   Aliança). Identificação só por nome + cidade.
8. **Santo Antônio (Pilão Arcado)**: o Lírio tem **duas fichas duplicadas** no mesmo endereço, com
   grades diferentes (1701: dom 19:30; 1707: dom 07:30 e 19:30). Gravei a união.
9. **Vínculos de capela inferidos** (marcados `baixa` e com nota no registro):
   - *Igreja São Francisco de Assis* (Av. Papa João Paulo I, 24, Country Club) → Paróquia Santo
     Antônio, porque a ficha do Lírio traz o telefone exato da paróquia, (74) 3611-2317.
   - *Igreja Santa Maria Goretti* (Tv. Matatu Um, 944, Alagadiço) → Paróquia São Cosme e São Damião,
     pelo bairro.
   - *Capela Santíssimo Redentor* (R. Francisco Martins Duarte, 150, Centro) → Comunidade do
     Santíssimo Redentor da Catedral, pelo nome e bairro (o blog dá Av. Paulo VI).
10. **Quatro igrejas de Juazeiro ficaram FORA do arquivo** por não ter como ligá-las a uma paróquia
    sem inventar. Todas vêm do Lírio Católico, com grade:
    | Igreja | Endereço | Grade |
    |---|---|---|
    | Comunidade Nossa Senhora das Graças | R. Chorrochó, 17, Sol Levante | sáb 17:30 |
    | Comunidade São João Batista | R. Alan Carino, 10, João XXIII | sáb 19:30 |
    | Igreja Nossa Senhora de Nazaré | R. Esperança, bairro Quidé | sáb 19:00 |
    | Igreja Nossa Senhora do Perpétuo Socorro | Av. Maria da Glória de Jesus, Jardim Vitória | dom 09:00 e 10:00 |

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- `website`: está `http://diocesedejuazeiro.org.br` — hoje o site responde em **HTTPS**
  (`https://diocesedejuazeiro.org.br`).
- `address`: está `Curia Diocesana, Av. Carmela Dutra 24, Orla Fluvial 1`; o próprio rodapé do site
  diz **"Rua Carmela Dutra, 24 - Centro"**.
- `zipCode`: está `48903-410`; a Receita registra **48903-530** para a sede (CNPJ 14.663.306/0001-32).
- `phone`, `email`, `bishopName` e `foundedYear` (1962) **conferem**.
