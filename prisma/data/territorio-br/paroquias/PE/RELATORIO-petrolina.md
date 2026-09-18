# Diocese de Petrolina (PE) — relatório de pesquisa

- **Agente**: pesquisa de território, 2026-09-17
- **Arquivo**: `paroquias/PE/petrolina.json`
- **Cobertura**: **24 / 24 paróquias (100%)**, todas `alta`, + 7 entradas que não contam: a Igreja
  Catedral (não paroquial), 1 quase-paróquia, 4 áreas pastorais (todas `alta`) e a Capelania
  Militar São José (`baixa`, só agregador)
- **Comunidades**: 35 (31 igrejas-sede + 4) — a diocese **não publica capelas**
- **Horários fixos**: 80 — **9 `alta`, 12 `media`, 59 `baixa`** (71 missas, 4 confissões,
  5 adorações). Só **a Catedral, a Matriz e a Capela São José têm horário com fonte oficial**; os
  outros 59 vêm do agregador Lírio Católico e ficam fora da carga.

## Fontes principais

| Fonte | URL | O que deu |
|---|---|---|
| Paróquias (contatos) | `https://www.diocesedepetrolina.org/contatos/paroquias/` | Catedral + 24 paróquias + quase-paróquia + 4 áreas pastorais: pároco/administrador, vigários, endereço, CEP, telefone, e-mail. Rodapé "**Atualizado em agosto de 2026**" |
| 4 páginas de forania | `/forania-sao-joao/`, `/forania-sao-lucas/`, `/forania-sao-marcos/`, `/paroquias/forania-sao-mateus/` | a que forania pertence cada paróquia, com o bairro/distrito; é aqui que Nova Descoberta aparece como **quase-paróquia** |
| WP REST API | `/wp-json/wp/v2/pages?per_page=100` | `modified` de cada página: Paróquias 06/08/2026, Clero 09/08/2026, foranias 01/2025 e 02/2026; as páginas velhas "Forania Central/Leste/Oeste" (2021–22) continuam no ar |
| Clero / Administração | `/a-diocese/clero/`, `/contatos/administracao-diocesana/` | grafia dos nomes, funções (vigário geral, chanceler, ecônomo) e o **endereço atual da cúria** |
| Calendário Diocesano 2026 | `/vida-pastoral/horario-de-missas/` | instalação das áreas pastorais de Vermelhos (09/02/2026) e Cosme e Damião (11/02/2026); festas patronais |
| Posts do site (781) | `/wp-json/wp/v2/posts` | criação de N. Sra. das Dores/Ouro Preto (31/05/1980) e de N. Sra. das Dores/Km 25 (23/10/2016, lido no convite em JPG) |
| Receita Federal | `https://minhareceita.org/<cnpj>` (raiz **10.730.109**) | varredura 0001–0060: **prova de completude**, endereços de Lagoa Grande e Afrânio, CEPs de conferência |
| Facebook das paróquias | `facebook.com/<página>` (lido com `curl` + cabeçalhos de navegador) | descrição da página, último post com data e, nos posts, as imagens em tamanho original |
| Lírio Católico | `https://www.liriocatolico.com.br/horario_missa/dados/uf/PE.json` | 23 registros nos 8 municípios (carga de 02/09/2026) |
| catholic-hierarchy / Wikipédia | — | 24 paróquias em 2021 e 2023; a Wikipédia não lista paróquias e ainda fala em "37 paróquias em 21 municípios" (anterior a 2010) |

### Prova de completude (CNPJ)

Raiz **10.730.109**, última ordem ocupada **0039**. Filiais ativas com nome de paróquia: **25** —
as 24 do site **+ "Paróquia de São Sebastião" (0036, Henrique Leite)**, que a diocese continua
listando como **área pastoral** em agosto/2026. Além delas: cúria (0001), Centro de Treinamento
(0003), **Igreja Catedral (0005)** e **Quase-Paróquia de Nossa Senhora de Fátima (0039, aberta em
14/11/2024)**. As filiais de Salgueiro, Ouricuri (2), Parnamirim, Granito, Exu, Araripina, Ipubi e
Trindade foram baixadas em 24/11/2011 — passaram à Diocese de Salgueiro. As duas áreas pastorais
de 02/2026 (Vermelhos e Cosme e Damião) ainda não têm filial. Site (24) = forânias (24) =
catholic-hierarchy (24) = Receita (24 + 1 área). `parishesExpected` = 24.

A numeração da lista oficial vai de 01 a 25, mas **o nº 22 não existe** (pula de 21 para 23) — é
erro de numeração, não paróquia faltando: as quatro forânias somam exatamente as mesmas 24.

### Atualidade

O site é WordPress 6.5 e está vivo (posts de agosto/2026). A lista de paróquias tem data explícita
no rodapé (agosto/2026) e bate com o comunicado de transferências de 18/03/2025 só em parte: o
comunicado punha o Pe. Gustavo Rohte na Área Pastoral Santa Luzia; a lista de 08/2026 já o traz em
São Sebastião (Henrique Leite) e o Pe. Cícero Rodrigues em Santa Luzia — segui a lista, mais nova.

## Horários: a diocese não publica

A página `/vida-pastoral/horario-de-missas/` existe, mas hoje é o **Calendário Diocesano 2026** (o
slug é herança). Não há grade de missa em nenhuma das 34 páginas nem nos 781 posts (só horários
de datas especiais: Natal, Cinzas, Finados). O Arquivo da Internet estava fora do ar
("Temporarily Offline"), então não deu para ver a versão antiga da página.

O que sobrou de fonte oficial é o **Facebook da Paróquia Nossa Senhora Rainha dos Anjos**, que
cuida da Matriz, da **Igreja Catedral** e da Capela São José:

- a **descrição da página** (página ativa, post de 27/08/2026) traz o horário da Catedral: seg–sex
  6h25, quinta 17h, domingo 9h/17h/19h30 → `alta` (o Lírio Católico repete os mesmos horários);
- um post de **28/09/2021** com quatro cartazes (lidos como imagem) dá a grade completa da época —
  com a Matriz fechada para restauro, tudo era na Catedral, e aparece a Capela São José (sáb 17h,
  dom 10h30);
- um aviso de **28/12/2024** (missas de fim de ano) mostra a divisão atual: 6h25 e 12h na Catedral,
  17h na Matriz; "domingo" com 7h30 na Matriz e 9h/17h/19h30 na Catedral.

Cruzando com a página de turismo da Prefeitura (sem data) e com o Lírio Católico (2026): Catedral
12h (seg, ter, qua, sex) `media`; Matriz seg/ter/qua/sex 17h, sáb 19h30 e dom 7h30 `media`; Capela
São José sáb 17h e dom 10h30 `media`. Ficaram `baixa`: Catedral quinta 12h e domingo 10h30 (os
cartazes de 2021 dizem que sim, a página atual e o aviso de 01/01/2025 indicam que não), Matriz
sáb 6h25 e Capela São José qua 19h30 (só agregador).

### Agregadores

- **horariodemissa.com.br**: 20 fichas nos 8 municípios (Santa Cruz não existe no agregador),
  **todas de 23/05/2013 a 20/10/2016**; 16 nem têm horário. Nada aproveitado (pré-pandemia).
- **liriocatolico.com.br** (carga de 02/09/2026): 23 registros. Deu a grade `baixa` de 9 paróquias
  (Sagrada Família, Santa Luzia, Santa Teresinha, São Francisco de Assis, N. Sra. do Rosário, São
  João Batista, São José, São Paulo Apóstolo e a Capela São Judas Tadeu, da Santa Rita), da Área
  Pastoral N. Sra. Aparecida (Cosme e Damião), da Capelania Militar e de uma igreja em Afrânio. É
  a fonte dos @ do Instagram gravados em `notes`. Os registros "Parnamirim" do agregador são de
  Parnamirim/RN (erro de UF) e não pertencem a esta região.
- **missahora.com.br**: só a Catedral, com os mesmos números do Lírio (mesma base). Ignorado.
- **buscamissa.com.br**: nada no sertão (confirmado pelo agente vizinho).

### Instagram

Todas as paróquias da cidade têm Instagram e é lá que publicam o horário (a bio de @luziaparo13,
por exemplo, traz "Missas: Domingo 9h/18h, Terça 19h30, Quinta Adoração 19h e Missa 19h30, Sexta
18h"). **O Instagram exige login** — API, página `embed` e visualizadores de terceiros estão todos
bloqueados. A bio só apareceu no *snippet literal* do DuckDuckGo (`html.duckduckgo.com/html/`), que
bloqueia o IP depois de duas consultas. Não gravei horário vindo de snippet (regra do README);
fica como caminho para o enxame de validação, que com sessão logada resolve as 24 paróquias.

## Decisões de modelagem

- **Igreja Catedral** (`Catedral Sagrado Coração de Jesus Cristo Rei`): **não é paróquia** — a
  diocese a lista à parte, sem número, com Reitor e Vice-Reitor, e ela tem CNPJ próprio ("Igreja
  Catedral"). Fica no território de N. Sra. Rainha dos Anjos (mesmo padre). Entrou como
  `status: "nao-paroquial"` + `loadAsParish: true` porque tem missa diária em fonte oficial `alta`
  — é a igreja que todo mundo procura em Petrolina.
- **Quase-paróquia Nossa Senhora de Fátima** (Nova Descoberta): a lista de contatos ainda diz "Área
  Pastoral", mas a página da forania, o Calendário 2026 e a Receita dizem **quase-paróquia**.
  Gravada com o prefixo "Quase-paróquia" (sem `status`; carrega pelo nome) e **não conta** nas 24.
- **4 áreas pastorais** → `nao-paroquial` + `loadAsParish: true`, como em Pesqueira, Caruaru e
  Nazaré (têm administrador próprio e território).
- **Capelania Militar São José**: só agregador → `nao-paroquial`, `baixa`, **sem** `loadAsParish`.
- **Homônimas em Petrolina**: três "Paróquia Nossa Senhora das Dores" (Ouro Preto, Rajada, Km 25)
  — o importador desambigua pelo `neighborhood`; os slugs levam o bairro/distrito. Idem São
  Francisco de Assis (Jardim Amazonas × Caraíbas, em municípios diferentes) e N. Sra. do Carmo.
- **Santa Cruz**: a fonte escreve "Paróquia de Nossa Senhora das Dores / Santuário da Santa Cruz da
  Venerada". O santuário **é** a matriz (decreto de 24/07/1993) → paróquia "Nossa Senhora das
  Dores", comunidade-sede "Santuário da Santa Cruz da Venerada".
- **Santa Rita**: "Paróquia Santuário de Santa Rita de Cássia" → `Paróquia Santuário Santa Rita de
  Cássia` (convenção do dataset).
- **São José (Atrás da Banca)**: nome oficial atual "Paróquia São José"; o orago é São José
  Operário (festa em 01/05; Facebook "Igreja Matriz São José Operário") → matriz com esse nome.
- **Pároco × administrador**: 12 das 24 paróquias têm "administrador paroquial"; o nome foi para
  `priestName` e a condição para `notes`.
- **`foundedYear`**: só onde há fonte — N. Sra. das Dores/Ouro Preto (1980), N. Sra. das Dores/Km
  25 (2016), São Paulo Apóstolo (1968: "58 anos" em 15/09/2026) e as duas áreas pastorais de 2026.
  **Não usei a data de abertura do CNPJ** (13/03/2019 para 13 filiais de uma vez).
- **Endereço sem fonte oficial**: Lagoa Grande e Afrânio (a diocese só dá telefone/CEP) → endereço
  da filial da Receita. Área Pastoral N. Sra. Aparecida → logradouro do agregador (em `notes`).
  Área Pastoral Santa Luzia → sem endereço.

## Pontos que precisam de validação humana

1. **Horários — quase tudo.** 22 das 24 paróquias não têm grade oficial acessível sem login. O
   caminho é o Instagram de cada uma (os @ estão em `notes`) ou o WhatsApp da secretaria.
2. **Catedral, 12h e domingo 10h30**: a página oficial cita só 6h25 (seg–sex), quinta 17h e
   domingo 9h/17h/19h30. A missa do meio-dia está confirmada até 31/12/2024; a das 10h30 de
   domingo parece extinta.
3. **Três endereços para a mesma paróquia**: São João Batista/João de Deus (site: Rua 12, nº 272;
   Receita: Av. Antônio João Braz, 159; agregador: R. Gleicimara Alves Pereira, 296) e N. Sra. do
   Rosário/São Gonçalo (site: Rua 17, s/n; Receita: Rua da Represa, 101; agregador: Rua Severo
   Dunga). **Dois endereços**: Santa Rita (Rua Men de Sá, 442 × Rua do Carretão, 2006), São
   Francisco de Assis (Rua Profª Nailde, 359 × Rua Elpídio Nunes, 06), Dormentes (Rua Francisco
   Modesto Cavalcanti, 205 × Rua Francisco Coelho de Macedo, 34), São Paulo Apóstolo (Rua da
   Inglaterra × Praça das Nações). Em geral um é a secretaria e o outro a igreja.
4. **"Rua Um, 200, Caraíbas"**: a Receita dá esse endereço à Paróquia N. Sra. do Carmo (2009); o
   site o dá à Paróquia São Francisco de Assis (Caraíbas) e põe a do Carmo no Núcleo Central 15 do
   Projeto Fulgêncio. Provável mudança de sede não refletida no cadastro.
5. **São Sebastião (Henrique Leite)**: a Receita a chama de paróquia desde 2019, a diocese de área
   pastoral. Segui a diocese.
6. **Telefone malformado**: Sagrada Família — WhatsApp "(87) 9 98847-7611" (um dígito a mais).
   **Sem telefone publicado**: N. Sra. das Dores/Km 25, quase-paróquia de Nova Descoberta, áreas
   pastorais São Sebastião e Santa Luzia. **Sem e-mail**: Lagoa Grande, São José (Atrás da Banca) e
   três áreas pastorais.
7. **Grafia do padre**: "José Erivan Liberalino Nuto" (lista de paróquias) × "José Erivan Nuto
   Liberalino" (clero, calendário) — gravei a segunda. "Wesley Bonfim" (paróquias) × "Wesley
   Bomfim" (clero).
8. **Comunidades**: só 4 além das sedes (Capela São José, Comunidade N. Sra. de Guadalupe, Capela
   São Judas Tadeu e Igreja N. Sra. de Lourdes/Afrânio). A diocese cobre 15 mil km² com perímetros
   irrigados cheios de vilas — o número real é de centenas.
9. **Pistas não gravadas (Lírio Católico, paróquia desconhecida)**, todas em Petrolina: Capela
   Sagrado Coração de Jesus e Maria (Rua 62, São Gonçalo 2; @sagradoscoracoespnz; dom 17h, qua
   19h, sex 19h30 — provável N. Sra. do Rosário); Capela de Nossa Senhora de Fátima (Avenida 3,
   Quati, Jardim São Paulo; @cnsfpnz; dom 9h); Igreja Nossa Senhora da Conceição N5 (PSNC N5/Vila
   Nova; sáb 18h — provável São Francisco das Águas); Igreja Nossa Senhora do Carmo (Rua 10,
   Fernando Idalino Bezerra; dom 17h, qua 19h — em 2014 "Idalino" era comunidade de N. Sra.
   Aparecida); Igreja de São Vicente de Paulo (Rua José Inácio Pereira; @com_saovicentedepaulo;
   sáb 19h30); Capela N. Sra. das Graças (Projeto Bebedouro, Vila 60/NS3) e Capela N. Sra. do
   Perpétuo Socorro (Caatinguinha/Estrada da Tapera), estas duas sem horário.
10. **Site antigo de Santa Maria da Boa Vista** (`paroquiansconceicao.wixsite.com/ns-conceicao`,
    © 2017) e blogs de Rajada (parado em 01/2020) e do Santuário Santa Rita (2013): pré-pandemia,
    não aproveitados para horário.

## Correções para o `dioceses.json` (não editei)

- **Endereço da cúria**: o arquivo traz "Praça Dom Antônio Malan, 99" / CEP 56302-330 — é o
  **Palácio Diocesano, em reforma**. A cúria atende na **Praça Maria Auxiliadora, 205 – Centro,
  CEP 56302-300** (página "Organismos da Administração Diocesana").
- **E-mail**: `curia@diocesedepetrolina.org`. O rodapé do site e a CNBB NE2 ainda mostram
  `curia@diocesedepetrolina.org.br`, mas **o domínio `.org.br` não existe mais** (NXDOMAIN); o
  `.org` tem MX do Google. Outros: `chancelariapetrolina@gmail.com`, `financeiro@…`, `ovs@…`.
- **Telefone**: o site publica só o WhatsApp da recepção, **(87) 98835-0576**; o fixo do arquivo,
  (87) 3861-2874, é o que consta na Receita para as filiais.
- **Site**: responde em `https://www.diocesedepetrolina.org` (o arquivo traz `http://`).
- Bispo correto (Dom Antônio Carlos Cruz Santos, M.S.C., desde 2024).
