# Relatório — Diocese de Naviraí (MS)

**Pesquisa:** 2026-09-11 · **Arquivo:** `paroquias/MS/navirai.json`

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **24** (24 alta) |
| Comunidades/capelas | **0** |
| Horários fixos | **0** |
| Cobertura | 24/24 (100%) |

Criada em **2011**, sufragânea de Campo Grande, **20 municípios**, 4 foranias.
Bispo: **Dom Ettore Dotti, C.S.F.**

## A página certa é `/foranias`, não `/paroquias`

A armadilha desta diocese: a página **`/paroquias`** do site oficial lista **19** paróquias, e
quem parar nela perde 5. A página **`/foranias`** — apesar do nome — é o **diretório completo**,
com **endereço, CEP, telefone, e-mail, pároco, vigários, diáconos e data de criação** das **24**.

Faltam em `/paroquias`: **Anaurilândia, Batayporã, Eldorado, Iguatemi e Novo Horizonte do Sul**.

Ironia: a página se chama "Foranias" mas **não diz a que forania cada paróquia pertence**. O
GCatholic nomeia as 4 (Ivinhema, Naviraí, Nova Andradina, Tacuru) mas não expõe o agrupamento no
HTML. Por isso **nenhuma paróquia deste arquivo traz forania** — é um dado a recuperar.

## Prova de completude pelo CNPJ

Raiz **14.815.628 = MITRA DIOCESANA DE NAVIRAÍ**. No `minhareceita.org`, ordens 0001…0035:
**28 filiais ATIVAS e nada além da 0028**.

- 24 são paróquias/santuário — **exatamente as 24 da página `/foranias`**;
- 4 não são: cúria (0001), Centro Cultural e Recreativo (0022), Câmara de Instrução Processual
  (0027) e Centro Diocesano São Paulo VI (0028).

**Os 24 CNPJs foram validados um a um contra o cadastro** e cada paróquia carrega o seu em
`sources`.

## Por que o GCatholic mostra 20 e não 24

O GCatholic (atualizado 2026-01-01) não tem as **4 paróquias criadas de 2019 em diante**:

| Paróquia | Cidade | Criação |
|---|---|---|
| Nossa Senhora Aparecida | Japorã | 24/02/2019 |
| Nossa Senhora da Conceição Aparecida | Ivinhema | 16/02/2020 |
| São José | Nova Andradina | 18/02/2023 |
| São Vicente | Nova Andradina | 19/02/2023 |

20 + 4 = 24. As três fontes são consistentes entre si.

## Nenhum horário de missa

O site não tem página de horários e as fichas de paróquia (`/paroquias/<slug>`) trazem só
telefone e endereço. O menu tem "Anuário Diocesano", mas a página está vazia — **não há PDF**.

Os **três sites paroquiais** que o diretório publica estão todos **fora do ar** (DNS não
resolve): `paroquiadeivinhema.com.br`, `paroquiasaopedrojatei.com.br` e
`paroquianovaandradina.com.br`. Gravei `website: null` nas três e registrei o fato em `notes`.

**Naviraí entra em produção sem nenhum horário e sem nenhuma comunidade**, apesar de ser a
diocese com os melhores dados de contato das três de MS desta rodada (24/24 com endereço, CEP,
telefone, e-mail *e* pároco).

## Pontos para o enxame de validação

1. **Levantar os horários das 24 paróquias** — não há nenhum. Contato da cúria:
   (67) 3461-0318, R. Campanário, 144, Centro, 79947-006, Naviraí/MS. Todas as 24 têm e-mail e
   telefone próprios no arquivo, o que facilita.
2. **Recuperar o mapeamento paróquia → forania** (Ivinhema, Naviraí, Nova Andradina, Tacuru).
3. **Divergência de nome — São Vicente (Nova Andradina)**: o cadastro federal registra
   "PAROQUIA SAO VICENTE DE PAULO"; o site da diocese publica "Paróquia São Vicente". Gravei o
   do site.
4. **Nova Casa Verde**: é **distrito de Nova Andradina**. A Receita e o GCatholic registram a
   Paróquia São Pedro e São Paulo em "Nova Andradina"; o site da diocese usa o nome do distrito,
   que adotei em `city`. Definir qual convenção o Parish quer.
5. **Defeitos de formatação no site, normalizados por mim**: CEP de Angélica publicado como
   "79.785.000" (ponto no lugar do hífen) e o de Tacuru com a UF truncada
   ("79.975-000 – TACURU – M").
6. **Grafia de município**: o site escreve "**Jutí**"; o nome oficial do município é **Juti**.
   Gravei Juti.
7. **"Santo António de Pádua" (Batayporã)** — o site usa acento agudo à portuguesa. Gravei
   "Santo Antônio de Pádua".
8. **Paróquias homônimas** desambiguadas pelo slug com a cidade: São João Batista
   (Anaurilândia, Bataguassu, Paranhos — **três**), Nossa Senhora Aparecida (Eldorado, Japorã,
   Novo Horizonte do Sul, Taquarussu — **quatro**), Nossa Senhora das Graças (Mundo Novo,
   Naviraí), Nossa Senhora do Perpétuo Socorro (Itaquiraí, Sete Quedas).
9. **Congregações religiosas com forte presença** (registrado em `notes`, útil para contato):
   **SVD/Verbitas** em Itaquiraí, Japorã, Mundo Novo e Naviraí-N.Sra. das Graças; **PSDP**
   (Pobres Servos da Divina Providência) em Bataguassu e Batayporã; **CSsR** (Redentoristas) no
   Santuário de Nova Andradina; **SMBN** em Iguatemi, Sete Quedas e Paranhos.
10. **CEP da cúria**: o `dioceses.json` registra 79950-000; o rodapé do site atual traz
    **79947-006**. Usei o do site no bloco `diocese` deste arquivo e **não alterei o
    `dioceses.json`**.
