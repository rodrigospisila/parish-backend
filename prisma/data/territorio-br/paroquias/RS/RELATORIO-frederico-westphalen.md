# RELATÓRIO — Diocese de Frederico Westphalen (RS)

- **Arquivo**: `paroquias/RS/frederico-westphalen.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: pesquisa de território (PROMPT-pesquisa.md)

## Resumo

| Métrica | Valor |
|---|---|
| Entradas em `parishes` | 44 — **41 paróquias**, 1 quase-paróquia, 1 reitoria e 1 santuário (não paroquial) |
| Entradas com confiança **alta** | 43 |
| Entradas com confiança **media** | 1 (o santuário) |
| Entradas com confiança **baixa** | 0 |
| Comunidades/capelas | 112 (44 matrizes + 68 comunidades nomeadas) |
| Horários fixos | 22 — 19 `alta`, 3 `baixa` |
| Paróquias com pelo menos um horário | **3 de 41 (7 %)** |
| Cobertura | **41 paróquias / 40 esperadas (100 %)** |

> **Lista de paróquias completa e atual; horários praticamente inexistentes.** O site oficial
> mantém uma página por paróquia com telefone, e-mail e pároco — e está sendo atualizado (traz a
> paróquia criada em **maio de 2025** e posses de outubro de 2025) — mas **quase nenhuma dessas
> páginas publica horário de missa**. É o oposto do cenário da vizinha Diocese de Erexim.

## Fontes principais

1. http://www.diocesefw.com.br/paroquias — **lista oficial das 43 unidades pastorais**
2. As **43 páginas individuais** `diocesefw.com.br/paroquia/<id>/<slug>` — telefone, e-mail,
   pároco e, em alguns casos, endereço, nº de capelas, histórico e lista de comunidades
3. http://www.diocesefw.com.br/presbiterio — **relação dos padres e suas designações** (usada
   para conferir os párocos e resolver conflitos com os textos históricos)
4. http://www.diocesefw.com.br/areaspastorais — as **7 foranias** (ver abaixo)
5. http://www.diocesefw.com.br/santuarios — os 4 santuários diocesanos
6. http://www.diocesefw.com.br/contato — endereço, CEP, telefones e e-mail da Cúria
7. https://www.catholic-hierarchy.org/diocese/dfrew.html — erigida em 22/05/1961, **40 paróquias**
   (2023), 11.473 km², 277.692 católicos, bispo Dom Antônio Carlos Rossi Keller desde 11/06/2008
8. **horariodemissa.com.br** — 38 fichas de paróquias desta diocese, com **endereço e CEP**
   (ver a ressalva importante abaixo)
9. https://radardoturismo.com.br/… e https://www.grupochiru.com/… — horários do Santuário da
   Divina Misericórdia
10. https://www.fredericowestphalen-rs.com.br/departamento/13/ubs-distrito-osvaldo-cruz —
    Osvaldo Cruz é distrito de Frederico Westphalen

## Cobertura: 41 paróquias / 40 esperadas

As 43 unidades listadas pelo site oficial se decompõem em:

- **41 paróquias**
- **1 quase-paróquia** — Santa Isabel de Hungria, **Vista Gaúcha** (pároco Cônego Alexander Mello
  Jaeger). Única entrada com `phone` e `email` nulos: a página oficial traz literalmente
  `Telefone: (` e `Email: .@com` — campos **quebrados na origem**.
- **1 reitoria** — Nossa Senhora de Lourdes, distrito de **Osvaldo Cruz** (criada em 30/12/2012,
  desmembrada da Paróquia de Taquaruçu do Sul; reitor Cônego Carlos Alberto Pereira da Silva).

O catholic-hierarchy informa **40 paróquias em 2023**; a diferença de uma unidade é explicada
pelas criações posteriores, sobretudo a **Paróquia Santa Teresinha do Menino Jesus (Padre
Gonzales, Três Passos), criada em 17/05/2025**, cujo segundo pároco tomou posse em 01/10/2025 —
sinal claro de que o site está vivo.

### Foranias (áreas pastorais)

Sete, com seus vigários: **São Mateus Evangelista** (Pe. Silvério Pikua), **São Paulo Apóstolo**
(Pe. João Paulo Pascoal), **São Lucas Evangelista** (Pe. Gilberto Giacomoni), **São Tiago
Apóstolo** (Pe. Nildo Moura de Melo, OSFS), **São João Evangelista** (Pe. Rafael Liberalesso
Romitti), **São Pedro Apóstolo** (Pe. Claudio Miro Monteiro) e **São Marcos Evangelista**
(Cônego Leandro Piffer). **A página não diz quais paróquias pertencem a cada forania** (remete a
um PDF), então esse vínculo **não** foi gravado.

## ⚠️ A ressalva mais importante: endereços de 2013

O site da diocese **não publica o endereço** da maioria das paróquias — só telefone, e-mail e
pároco. Os endereços e CEPs de **29 paróquias** vieram do **horariodemissa.com.br**, cujas fichas
foram **atualizadas em 25/05/2013 (13 anos)**.

Foram aceitos como `media` porque em **todos** os casos o **telefone da ficha confere com o
telefone fixo publicado hoje pelo site oficial** (ex.: Constantina (54) 3363-1079, Alpestre (55)
3796-1109, Palmitinho (55) 3791-1103, Rodeio Bonito (55) 3798-1228, Santo Augusto (55) 3781-1527,
Palmeira das Missões (55) 3742-1053, Três Palmeiras (54) 3367-1133, Trindade do Sul (54)
3541-1080, Catedral (55) 3744-1918) — corroboração exigida pelo README. **Ainda assim, todo
endereço com a fonte `horariodemissa.com.br` precisa de reconfirmação.**

**8 paróquias têm o endereço confirmado pelo próprio site da diocese** (marcados com a fonte
oficial, comunidade-matriz `alta`): Erval Seco, Humaitá, Nova Candelária, Palmitinho, São José das
Missões, Tiradentes do Sul, Três Passos e Vista Alegre.

**8 entradas ficaram apenas com "Praça da Matriz" como logradouro** (Ametista do Sul, Derrubadas,
Novo Barreiro, Pinheirinho do Vale, São Martinho, Taquaruçu do Sul, Três Palmeiras e Trindade do
Sul) e outras 2 com logradouro sem número, "s/n" (Jaboticaba e Miraguaí). É o que a fonte diz —
nenhum número foi inventado — mas é endereço de baixíssima precisão.

**6 entradas ficaram com `address: null`**, sem fonte alguma: Cerro Grande, Pinhal, Sede Nova,
Vista Gaúcha (quase-paróquia), Padre Gonzales/Três Passos e a Reitoria de Osvaldo Cruz.

## Horários: só 3 paróquias

| Unidade | Horários | Confiança |
|---|---|---|
| **Catedral Santo Antônio** (Frederico Westphalen) | Seg–sex **na Cripta**: 7h30 e 18h; sábado na Catedral 16h30; domingo 7h30, 9h e 19h | `alta` |
| **N. Sra. Auxiliadora** (Iraí) | Quinta 19h; sábado 19h; domingo 8h30 | `alta` |
| **Santa Terezinha** (Erval Seco) | Quarta 19h; sábado 19h | `alta` |
| *Santuário da Divina Misericórdia* (FW) | Sábado 19h; domingo 8h e 15h | `baixa` |

As demais **38 paróquias ficaram com `schedules: []`**. Isso foi verificado, não presumido:

- O **horariodemissa.com.br não tem um único horário cadastrado** para esta diocese — as 38 fichas
  dizem literalmente "(Nenhum horário de Missa informado)". Só servem para endereço.
- As paróquias divulgam horário quase só por **Instagram/Facebook** (ex.: `@paroquiatenenteportela`,
  `@pnsa.rc`), que não é raspável de forma confiável.
- Os horários que aparecem na imprensa regional (Rádio Alto Uruguai, Grupo Chiru, Guia Crissiumal)
  são de **datas especiais** — Finados, Cinzas, Tríduo Pascal, Natal — que o PROMPT manda excluir.
  Foram descartados de propósito.

## ⚠️ Pontos para o enxame de validação

1. **Endereços de 2013** (item detalhado acima) — a maior fragilidade do arquivo. 30 paróquias.

2. **Conflito de pároco em São José das Missões.** O campo "Pároco:" da página oficial e a página
   `/presbiterio` dizem **Cônego Ilídio Rosa de Azevedo**; o texto histórico **da mesma página**
   diz "Em 16 de Fevereiro de 2024 teve a posse de **Pe. Ezequiel Reis Borba** como Novo Pároco"
   (e antes "Em 27 de novembro de 2020 teve a posse do Pe. Luiz Afonso dos Santos"). Foi gravado
   **Ilídio Rosa de Azevedo** (campo estruturado + presbitério). **Resolver.**

3. **Contato quebrado na origem — Quase-paróquia Santa Isabel de Hungria (Vista Gaúcha).** A
   página traz `Telefone: (` e `Email: .@com`. `phone` e `email` ficaram `null`.

4. **Telefone divergente em Tiradentes do Sul.** O cabeçalho da página diz `(55) 99616-1069`; o
   corpo da mesma página diz `96161069` (sem DDD e sem o 9); o horariodemissa diz
   `(55) 3522-1749` — que é o **mesmo prefixo da paróquia de Três Passos**, da qual Tiradentes do
   Sul foi desmembrada. Foi gravado **(55) 99616-1069**.

5. **Dois telefones com formato suspeito**, gravados como estão na fonte oficial:
   **Seberi (55) 93619-0776** e **Taquaruçu do Sul (55) 93618-1477** — celulares de 9 dígitos
   começando por "93", padrão incomum. Palmitinho também tem um `(55) 93618-1498` no cabeçalho,
   mas ali foi gravado o **fixo (55) 3791-1103**.

6. **Divergência de número em Vista Alegre.** Site oficial: *Rua Sol da América, **252***;
   horariodemissa: *Rua Sol da América, **112***. Gravado o oficial (252).

7. **Nome oficial da paróquia de Crissiumal.** O site da diocese diz **"Paróquia Três Santos
   Mártires"**; o texto interno da própria página diz "Paróquia dos Três Santos Mártires **das
   Missões**"; o horariodemissa cadastrou como "Paróquia Mártires das Missões Riograndenses".
   Gravado o da lista oficial. **É uma só paróquia.**

8. **Distritos usados como cidade** — corrigidos para o município, com o distrito em
   `neighborhood`:
   - **Reitoria N. Sra. de Lourdes – "Osvaldo Cruz"** → `city: "Frederico Westphalen"`,
     `neighborhood: "Osvaldo Cruz"` (confirmado pela Prefeitura de FW, que mantém UBS no distrito).
   - **Paróquia Santa Teresinha do Menino Jesus – "Padre Gonzales"** → `city: "Três Passos"`,
     `neighborhood: "Padre Gonzales"` (o próprio site escreve "Padre Gonzales (Três Passos)").

9. **Entrada que NÃO é paróquia**: **Santuário Diocesano da Divina Misericórdia** (Frederico
   Westphalen, Rua Siro Binoto 451 – Nova Aparecida). Existência confirmada pela página oficial
   `/santuarios`, mas **endereço e horários vêm de agregadores de turismo e de rádio** — daí a
   entrada `media` e os horários `baixa`. Um telefone (55) 3738-1294 aparece no radardoturismo,
   mas o prefixo 3738 é de **Caiçara**, não de FW: **não foi gravado**. Decidir se entra na carga.
   Os outros três santuários **não** viraram entrada própria:
   - **Santuário Diocesano Sagrado Coração de Jesus (Vista Alegre)** = a própria matriz da
     Paróquia Sagrado Coração de Jesus de Vista Alegre (registrado em `sources` dela);
   - **Santuário Diocesano Beatos Manuel e Adílio (Nonoai)** — atenção: a diocese o localiza em
     **Nonoai**, mas a Paróquia Santa Teresinha do Menino Jesus (Padre Gonzales) lista
     "Santuário dos Beatos Manuel e Adílio (local do martírio)" entre **suas** capelas. Foi
     gravado como comunidade dessa paróquia. **Contradição a resolver.**
   - **Santuário de Schoenstatt Tabor Porta do Céu (FW)** — não incluído, sem dado nenhum.

10. **`communities: []` em 37 das 44 entradas.** Só 6 paróquias publicam a lista nominal:
    Padre Gonzales/Três Passos (19 capelas), Iraí (17), Novo Barreiro (16), Taquaruçu do Sul (8
    capelas + 6 capitéis, estes **não** gravados), Nova Candelária (7) e a Catedral (a Cripta).
    Outras quatro publicam **só a contagem**, sem nomes — informação que se perdeu por não caber
    no schema: **Palmitinho 23 capelas + capela do hospital**, **Tiradentes do Sul 19**,
    **Humaitá 13** e **Vista Alegre 7 capelas + 1 comunidade com gruta (N. Sra. da Salette)**.
    Essas quatro são o alvo mais fácil para o enxame de validação.

11. **Domínio com e sem `www`.** O site responde em `diocesefw.com.br` e `www.diocesefw.com.br`,
    e mistura `http`/`https` nos próprios links. `diocese.website` foi gravado como
    `http://www.diocesefw.com.br` (forma que o próprio site usa nos menus); as `sources` usam
    `https://www.diocesefw.com.br`.

12. **DDD misto (55) e (54)**, conferido contra a geografia: as paróquias do leste da diocese —
    **Constantina, Nonoai, Três Palmeiras e Trindade do Sul** — usam **(54)**; todo o resto usa
    **(55)**. Coerente, mas vale a checagem.

13. **`foundedYear` incompleto.** Preenchido em 20 entradas, sempre que a página trazia a data de
    criação/instalação de forma inequívoca; `null` nas outras 24 (inclusive Palmeira das Missões,
    Seberi, Tenente Portela, Iraí e Erval Seco, que têm histórico longo mas sem ano de ereção
    canônica explícito).
