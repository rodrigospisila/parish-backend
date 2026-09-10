# Relatório — Diocese de Mogi das Cruzes (SP)

**Agente de pesquisa · 10/09/2026 · arquivo `paroquias/SP/mogi-das-cruzes.json`**

| | |
|---|---|
| Circunscrição | Diocese de Mogi das Cruzes (sufragânea da Arquidiocese de São Paulo) |
| Sede | Mogi das Cruzes/SP — Avenida Braz de Pina, 560, Vila Vitória — 08730-020 — (11) 4724-9734 |
| Bispo | Dom Pedro Luiz Stringhini (nomeado em 19/09/2012) |
| Site | http://www.diocesedemogi.org.br |
| Paróquias no dataset | **105** (todas com confiança `alta`) |
| Comunidades | **456**, em 89 das 105 paróquias (todas `alta`) |
| Horários fixos | **657** (577 `alta`, 80 `baixa`) em 103 paróquias |

## Fontes principais

1. **http://www.diocesedemogi.org.br/paroquias.php** → **`paroquias_busca.php?id=1..9`** — a busca oficial
   por região pastoral. As 9 regiões são **Catedral, Brás Cubas, Salesópolis, Suzano, Poá,
   Ferraz de Vasconcelos, Itaquaquecetuba, Santa Isabel e César de Souza**.
2. **`paroquias_pagina.php?id=N`** (105 fichas lidas, uma por paróquia) — é a fonte de praticamente
   todo o arquivo: histórico com a data de criação, endereço/bairro/CEP, telefone, e-mail, site,
   Facebook, pároco e vigários, horários de atendimento do padre e da secretaria, **horários de missa**
   e a **lista nominal de comunidades e capelas com endereço**.
3. **http://www.diocesedemogi.org.br/curia_diocesana.php** — endereço, CEP, telefone, WhatsApp e e-mail
   da Cúria; vigário geral Mons. Antonio Robson Gonçalves; moderador da Cúria e chanceler
   Pe. João Batista Ramos Motta; ecônomo Pe. Michel dos Santos; coordenador diocesano de pastoral
   Pe. Reginaldo Martins da Silva.
4. **http://www.diocesedemogi.org.br/bispos.php** — galeria dos bispos diocesanos.
5. **https://www.catholic-hierarchy.org/diocese/dmodc.html** — ereção 09/06/1962, **89 paróquias (2023)**,
   878.998 católicos, sufragânea de São Paulo, bispo Pedro Luiz Stringhini desde 2012.
6. **https://pt.wikipedia.org/wiki/Diocese_de_Mogi_das_Cruzes** — corrobora a ereção, o bispo e a lista
   dos 10 municípios.

## Cobertura

- **105 entradas encontradas / 89 paróquias esperadas (catholic-hierarchy, 2023).** A diferença é
  explicada e não indica erro:
  - **100 entradas territoriais** (a 1ª lista numerada de cada região), das quais **6 são áreas
    pastorais** e **1 é quase-paróquia** — erigidas recentemente e ainda não paróquias plenas;
  - **5 entradas não territoriais**, que o próprio site publica numa **segunda lista numerada à parte**
    dentro da região: 3 santuários diocesanos (Maria Mãe do Divino Amor, Cristo Amor Misericordioso e
    Nossa Senhora Desatadora dos Nós), a **Paróquia Pessoal para os Japoneses São Maximiliano Kolbe** e
    a **Paróquia São Charbel e São Frei Galvão, de rito maronita**.
- Os **10 municípios** da diocese estão todos representados: Mogi das Cruzes (42), Itaquaquecetuba (17),
  Suzano (14), Ferraz de Vasconcelos (9), Poá (6), Arujá (5), Biritiba Mirim (4), Santa Isabel (3),
  Guararema (3) e Salesópolis (2).
- **Contato:** 99 das 105 paróquias com telefone, **100 com e-mail**, 87 com CEP, 105 com endereço,
  104 com bairro, 93 com pároco, 19 com site próprio, 77 com ano de criação.
- Cobertura considerada **completa** — o site diocesano mantém a base atualizada e é a fonte única.

## Comunidades

- **456 comunidades/capelas** em 89 paróquias, com **nome e endereço**, extraídas do bloco
  "Comunidades" de cada ficha. Só 4 ficaram sem endereço.
- O nome foi mantido **exatamente como publicado** (`Comunidade <padroeiro>`, `Capela <padroeiro>` ou,
  raramente, `Igreja …`); quando a ficha separa "Capelas" de "Comunidades", os dois grupos entraram na
  mesma lista, preservando o rótulo original.
- Nas 89 paróquias com lista, foi acrescentada a **Matriz** como primeira comunidade
  (`isMatriz: true`), com o endereço da paróquia — a própria ficha rotula esse endereço como "Matriz".
  Nas 16 paróquias sem lista publicada, `communities` ficou `[]` e o importador cria a igreja-matriz.
- Quando duas comunidades da mesma paróquia têm o mesmo padroeiro, o bairro foi acrescentado entre
  parênteses para desambiguar (ex.: `Comunidade Nossa Senhora Aparecida (Arrepiado)`).

## Horários

- **655 dos 657 horários são da Matriz.** Isso reflete a fonte: o site publica missas apenas no bloco
  "Missas" da ficha da paróquia. Em **todo o site só 2 comunidades publicam horário próprio**
  (Capela Santa Rita de Cássia, da Catedral, e Capela Nossa Senhora dos Remédios, da Paróquia São
  Benedito / Santuário Diocesano Senhor Bom Jesus) — as demais fichas listam as comunidades apenas
  com nome e endereço.
- **80 horários `baixa`**: 79 são **missas de recorrência mensal** ("Toda 1ª sexta-feira do mês",
  "Toda última quinta-feira do mês"), que o modelo semanal do dataset não representa; ficam com a
  frase original em `notes` e **não devem entrar na carga** sem tratamento de recorrência mensal.
- **Não foram gravadas 42 linhas** de horário, todas registradas aqui como pendência:
  - **36** são missas votivas de **dia fixo do mês** ("Todo dia 13, votiva a Santo Antônio",
    "Todo dia 22, votiva a Santa Rita", "Todo dia 25, votiva ao Frei Galvão") — não têm dia da semana
    e são impossíveis de representar no modelo atual;
  - **4** são missas mensais **sem horário publicado** ("Toda 1ª sexta-feira do mês, votiva ao Sagrado
    Coração de Jesus" — em N. Sra. de Guadalupe, São Judas Tadeu/Suzano, Santa Luzia e Santo Antônio,
    esta última "A última quinta-feira do mês, Missa da Bênção");
  - **2** são notas de rodapé sem dia próprio ("*se durante a semana, às 19h30, domingo, às 19h").
  - Erro de digitação na fonte: `São Judas Tadeu` (Suzano) publica **"Toda 1ª Sexat-feira do mês"**.
- **Adoração/terço:** 4 `ADORATION` e 1 `ROSARY`. A diocese **não publica horário de confissão** em
  nenhuma ficha → 0 registros `CONFESSION`. O bloco "Padre" das fichas é **horário de atendimento do
  pároco**, não confissão, e por isso foi deliberadamente ignorado.
- **2 paróquias sem nenhum horário publicado**: Área Pastoral São Charles Foucauld (Suzano) e
  Área Pastoral Santa Cecília (Ferraz de Vasconcelos).

## Pontos para validação humana / enxame de validação

1. **Paróquia de rito maronita listada pela diocese latina.** `sao-charbel-e-sao-frei-galvao-rito-maronita-mogi-das-cruzes`
   pertence à **Eparquia Maronita de Nossa Senhora do Líbano em São Paulo**, não à Diocese de Mogi das
   Cruzes. Está no dataset porque o site diocesano a publica, mas **não deveria entrar como paróquia
   desta diocese**.
2. **Entidades não paroquiais.** Os 3 santuários diocesanos e a paróquia pessoal japonesa são
   entidades reais, mas os santuários **não são paróquias territoriais** — conferir antes da carga.
   Idem para as 6 **áreas pastorais** e a **quase-paróquia**: são etapas anteriores à ereção canônica.
3. **Codificação mista no site.** As páginas misturam UTF-8 (menu/breadcrumb) e ISO-8859-1 (conteúdo
   do banco). Os nomes das paróquias foram tomados da **lista da região** (que decodifica corretamente)
   e não do `<h1>` da ficha; vale conferir acentuação por amostragem.
4. **`PÁROQUIA` grafado com acento errado** em 2 fichas do site (ids 17 e 98) — normalizado para
   "Paróquia" no dataset.
5. **Erros de digitação de cidade no próprio site**, corrigidos por correspondência aproximada:
   "Mogi das Cruze", "Mogi ds Cruzes", "Suzan". Registrados aqui porque o endereço bruto foi mantido.
6. **18 paróquias sem CEP** e **6 sem telefone** (`sao-bartolomeu-itaquaquecetuba`,
   `imaculada-conceicao-de-nossa-senhora-mogi-das-cruzes`, `nossa-senhora-aparecida-aruja`,
   `sao-bras-biritiba-mirim`, `sao-charles-foucauld-suzano`, `santa-cecilia-ferraz-de-vasconcelos`) —
   a ficha não publica.
7. **Telefones múltiplos.** Várias fichas publicam 2 ou 3 números ("11 4796 6785 e 95090 5064 |com
   whatsapp|"); foi gravado **apenas o primeiro**. Os demais estão na ficha de origem.
8. **`priestName` sem cargo explícito em parte das fichas.** Foi usado o bloco "Pároco"; onde ele traz
   também o e-mail do padre em segunda linha, só o nome foi gravado. 12 paróquias não publicam pároco.
9. **Nomes duplicados no mesmo município** (mesma cidade, mesmo padroeiro) receberam o bairro no
   `slug` para desambiguar: Santa Cruz (Ponte Grande × Biritiba Ussú), São José Operário
   (Vila Mogilar × Jundiapeba), Nossa Senhora das Graças (Vila Brasileira × Nova Jundiapeba),
   Divino Espírito Santo (Suzano, Jd. Tabamarajoara × Jd. Imperador), São Pedro Apóstolo
   (Jd. São Pedro × Jd. Santos Dumont I) e Nossa Senhora de Fátima (Vila Jundiaí × Chácara Guanabara).
10. **Missa em forma extraordinária.** A Paróquia Santa Cruz (Ponte Grande) publica domingo 17h como
    "Forma Extraordinária" — gravada como MASS, com a frase original em `notes`.
11. **Rodapé do site divergente do endereço da Cúria**: o rodapé traz "Avenida Braz de Pina, 560" sem
    o número de telefone da Chancelaria; foram usados os dados da página `curia_diocesana.php`.

12. **Campo vazio preenchido com frase de aviso.** Quando a paróquia não tem e-mail, o site grava
    literalmente `href="mailto:Não há nenhum e-mail cadastrado para esta paróquia."`. Essas 5
    ocorrências foram descartadas (`email: null`): `santa-luzia-mogi-das-cruzes`,
    `nossa-senhora-da-paz-aruja`, `sao-bras-biritiba-mirim`, `sao-charles-foucauld-suzano` e
    `santa-cecilia-ferraz-de-vasconcelos`. O mesmo vale para `website`. E o e-mail do
    Santuário Diocesano Senhor Bom Jesus é publicado com **ponto e vírgula no fim**
    (`…@yahoo.com.br;`), normalizado no arquivo.
