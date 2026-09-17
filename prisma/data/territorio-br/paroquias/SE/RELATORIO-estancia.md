# Diocese de Estância — relatório de pesquisa

- **Slug**: `estancia` · **UF**: SE · **Sede**: Estância · **Província**: Aracaju
- **Pesquisa**: 17/09/2026
- **Bispo**: Dom José Genivaldo Garcia (5º bispo, posse em 25/02/2023) · **Site**: **não tem** (ver abaixo)
- **Território**: 16 municípios — Arauá, Boquim, Cristinápolis, Estância, Indiaroba, Itabaianinha, Lagarto,
  Pedrinhas, Poço Verde, Riachão do Dantas, Salgado, Santa Luzia do Itanhy, Simão Dias, Tobias Barreto,
  Tomar do Geru e Umbaúba.

## Resultado

| Métrica | Valor |
|---|---|
| Entradas | **30** = **29 paróquias + 1 quase-paróquia** (vira paróquia em 29/09/2026) |
| Confiança | 14 `alta` (perfil oficial vivo lido em 09/2026) · 16 `media` |
| Comunidades/capelas | 30 — **só as matrizes** (mas o campo `declaredCommunityCount` guarda quantas cada paróquia declarava em 2018: 575 no total) |
| Horários fixos | **31** (27 MASS · 2 CONFESSION · 2 ADORATION) — 2 `alta`, 1 `media`, 28 `baixa` |
| Paróquias com horário **carregável** | **2** (São Francisco de Assis/Cristinápolis; São Domingos de Gusmão/Simão Dias — só confissões) |

**Cobertura: 29 de 29 paróquias + a quase-paróquia.** Três contagens independentes fecham no mesmo número.

## A diocese não tem site — e o registrado em `dioceses.json` é um blog de 2009

- `diocesedeestancia.blogspot.com` (o `website` que está em `dioceses.json`): último post de **30/07/2009**.
  Morto. **Sugiro anular esse campo** (não mexi em `dioceses.json`).
- `diocesedeestancia.com.br`: foi o site oficial (WordPress, 2018); última captura no Arquivo em 22/01/2019.
  O domínio não existe mais (NXDOMAIN, junto com `.org.br`, `.org` e `.com`).
- Hoje a comunicação oficial é só o Instagram/Facebook **`@diocesedeestancia`** (23,5 mil seguidores, posts até
  16/09/2026). Por isso `diocese.website` ficou `null`.

## Como a lista foi fechada (três fontes que batem)

1. **Lista oficial de 2018** — captura de 23/12/2018 de `diocesedeestancia.com.br/paroquias/` (página de
   07/08/2018): **27 paróquias** com endereço, CEP, telefones, e-mail, clero, **número de comunidades** e o
   quadro das 5 foranias. É a base nominal (gravada em `forania` como "organização de 2018").
2. **Receita Federal — filiais do CNPJ 13.259.577** (truque do README), varridas em `minhareceita.org` de
   `/0001` a `/0050`: **30 filiais paroquiais ATIVAS** (`/0002`–`/0019` e `/0026`–`/0037`); as filiais
   `/0020`–`/0025` são duplicatas **BAIXADAS** de seis paróquias; nada de `/0038` em diante. As 27 de 2018 estão
   todas lá, mais **três criadas depois**:

   | Filial | Paróquia | Sede | CNPJ aberto em |
   |---|---|---|---|
   | /0035 | Nossa Senhora da Boa Viagem | Vila de Samambaia, Tobias Barreto | 31/05/2019 |
   | /0036 | São Domingos de Gusmão | Povoado Triunfo, Simão Dias | 30/04/2024 |
   | /0037 | São Miguel Arcanjo | bairro Centenário, Tobias Barreto | 31/03/2026 |

3. **Contagem oficial**: o Instagram da diocese, em **20/08/2025**, fala nas "igrejas matrizes das **29
   paróquias** que compõem o território diocesano" — exatamente as 30 filiais menos a de 2026. E a coluna
   *Foco no Interior* do Cinform (08/2026) noticia que o bispo anunciou ao clero, em 12/08/2026, "a elevação e
   instalação canônica da sua **30ª paróquia**": a atual **quase-paróquia São Miguel Arcanjo** será erigida em
   **29/09/2026, às 19h**, com Pe. Iuri Ribeiro dos Santos (hoje administrador) como primeiro pároco.

Wikipédia e `catholic-hierarchy` (28) e a imprensa de 2024 (27) estão defasadas. O GCatholic não tem lista de
igrejas para esta diocese.

> **Item com prazo**: gravei **"Quase-paróquia São Miguel Arcanjo"** porque esse é o estado em 17/09/2026. A
> partir de **29/09/2026** o nome passa a "Paróquia São Miguel Arcanjo" e `foundedYear` a 2026 (há `statusNote`
> no registro). O importador carrega "Quase-paróquia …" normalmente.

## Confiança das paróquias

Mesma régua usada em Jequié: lista oficial antiga + Receita ativa = `media`; **perfil oficial vivo lido em
09/2026 = `alta`**. As 14 `alta` (bio lida pelo leitor automático, com pároco/telefone atuais): Catedral,
Senhor do Bonfim/Estância, Indiaroba, Itabaianinha (Conceição), Arauá, Lagarto (Piedade, Fátima, Graças/Jenipapo),
Tomar do Geru, Cristinápolis, Poço Verde, Simão Dias (Sant'Ana e São Domingos) e Boquim (Sant'Ana). As bios
renderam 9 párocos atuais, 7 telefones atuais, dois anos de criação (Boquim, **21/03/1870**; Senhor do
Bonfim/Estância, **28/05/2012**) e uma confirmação elegante: a chave PIX da bio de Sant'Ana/Simão Dias é o
CNPJ da filial `/0017`.

Regras que apliquei aos dados de 2018 (8 anos), seguindo o README (*telefone e pároco de captura antiga não
vão para os campos de produção*): **`phone` só com fonte de 2025–2026** — os 7 telefones das bios; os **14
telefones de secretaria/casa paroquial de 2018 ficaram em `phoneHistoric`** e os **22 e-mails institucionais em
`emailHistoric`** (ambos repetidos em `notes`); `email` ficou vazio em todas. Fora até do campo histórico, por
serem pessoais: celulares rotulados com nome de secretário(a) ou "(Pároco)", 4 e-mails de padres (Natividade,
Tomar do Geru, São José/Ilha, Salgado) e um e-mail com acento, inválido (Jenipapo);
**`priestName` só com fonte de 2023 em diante** (10 entradas: 9 pelas bios e o administrador da quase-paróquia pela imprensa). Quando a bio identifica o padre só pelo @
(`@dam.sacerdos`, `@_peemilliojr`, `@padre_eder`), ficou `null`; usei o @ como nome só onde ele é o próprio nome
(`@ilmaraugusto`, `@josetitolivio`), com nota.

## Horários — quase nada publicado

- **Oficial (`alta`)**: Cristinápolis — bio "Missas - Qui. às 19h | Sáb. às 19h3…" (quinta 19h); São
  Domingos/Triunfo — "Todas as quintas-feiras, das 08h às 12h, confissões".
- **`media` (1)**: Cristinápolis, sábado 19h30 — a bio oficial atual diz "Sáb. às 19h3…" (cortada no último
  dígito) e o Lírio completa 19:30. O **domingo 08h** da mesma paróquia ficou `baixa`: só o Lírio o traz (a bio
  é cortada justamente antes do domingo) e, pela regra do README, agregador sem data de conferência não se
  promove sozinho. Muito provavelmente certo; basta abrir `@paroquiafranciscoassis` para confirmar.
- **`liriocatolico.com.br` (`baixa`, 28)**: 7 fichas — Catedral, Piedade/Lagarto, Sant'Ana/Simão Dias, Tomar do
  Geru, São Domingos, Cristinápolis e Poço Verde (esta sem grade: "programação semanal no Instagram"). Data
  `2026-09-02` é de carga em massa; nas outras dioceses desta rodada o Lírio errou onde deu para conferir.
- **`horariodemissa.com.br`**: 17 fichas, **todas de 27/05 a 08/07/2013 e nenhuma com grade** — só serviram para
  cruzar endereço. `buscamissa.com.br` cobre 33 cidades de Sergipe, **nenhuma** das 16 desta diocese.

## Pontos que precisam de validação humana

1. **29/09/2026**: promover a Quase-paróquia São Miguel Arcanjo a paróquia (ver acima).
2. **Duas paróquias Santa Luzia em Lagarto** — povoado **Colônia Treze** (filial /0014, de 2004) e bairro **Alto
   da Boa Vista** (filial /0034, de 2015). Confirmado pela lista de 2018, pela Receita e pela Wikipédia de
   Lagarto. Slugs distintos (`santa-luzia-colonia-treze-lagarto`, `santa-luzia-alto-da-boa-vista-lagarto`); o
   importador vai diferenciar pelo bairro. Há ainda uma terceira Santa Luzia, em Santa Luzia do Itanhy.
3. **23 das 30 entradas entram em produção sem telefone e todas sem e-mail.** Conferir os 14 `phoneHistoric` é
   o caminho mais curto. Sem telefone nem no campo histórico: N. Sra. da Boa Viagem (Samambaia) e a
   quase-paróquia São Miguel Arcanjo (só nome, endereço da Receita e CNPJ), mais Natividade do Senhor, Arauá,
   Jenipapo, Tomar do Geru, São José/Ilha, Senhor do Bonfim/Estância e São Domingos.
4. **Telefone de Indiaroba** copiado como está na bio, com 8 dígitos ("79 9844-8453") — pode faltar o nono.
   **Telefone da Catedral** "(79) 93500-9570" tem prefixo incomum; é o da bio `@pnsg.estancia` (último post em
   27/09/2025 — a paróquia parece ter migrado para `@catedraldeestancia`, que exige login).
5. **Perfis que existem mas o Instagram barrou** (tela de login) — são os horários mais fáceis de recuperar à
   mão: `@catedraldeestancia`, `@senhora_daguia` (Umbaúba), `@paroquiansraimperatriz` (Tobias Barreto),
   `@pssantanaboquim`, `@paroquia_santaluzia` (Alto da Boa Vista), `@paroquia.santa.teresinha`. Sem perfil
   encontrado: Salgado, Pedrinhas, Santa Luzia do Itanhy, as duas de Riachão do Dantas, Santa Rita/Boquim,
   São José/Ilha, São Francisco/Estância, Natividade, Colônia Treze, Boa Viagem e São Miguel Arcanjo.
6. **Série "Igrejas Matrizes da Diocese de Estância"**: a diocese publica desde 20/08/2025, às quartas-feiras,
   um post por matriz, com a história de cada paróquia (o da catedral traz 1632/1831/1960). Só o primeiro
   post está indexado; **percorrer o perfil logado renderia ano de criação das 29**.
7. **Endereços de 2018 × Receita** divergem em várias paróquias (Umbaúba, Tobias Barreto, Salgado, Fátima e
   Jenipapo em Lagarto, Santa Rita/Boquim, Sant'Ana/Boquim nº 284 × 122). Fiquei com o do site diocesano; a
   divergência está em `notes`. Em Senhor do Bonfim/Estância usei o da bio de 2026 (nº 602; em 2018 era 321).
8. **CEP com erro de digitação na lista de 2018**: N. Sra. do Amparo ("9480-000") → usado o da Receita.
9. **Nomes normalizados por mim**: a da sede virou **Catedral Nossa Senhora de Guadalupe**; "Paróquia da
   Natividade do Senhor" manteve o "da". **N. Sra. da Piedade/Lagarto é o "Santuário Mariano"** — mantive
   "Paróquia", como na lista oficial. Santa Luzia do **Itanhy** (IBGE), não "Itanhi" (site de 2018).
10. **`declaredCommunityCount`** vem de 2018 (de 8 em Santa Rita/Boquim a 51 em Tobias Barreto; Indiaroba
    declarava "27 rurais e 2 capelas de bairro") — dá a dimensão do que falta: **nenhuma fonte publica os nomes
    das capelas**.
