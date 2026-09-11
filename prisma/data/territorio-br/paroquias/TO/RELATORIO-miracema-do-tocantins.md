# Relatório — Diocese de Miracema do Tocantins (TO)

**Pesquisa:** 2026-09-11 · **Arquivo:** `paroquias/TO/miracema-do-tocantins.json`

## Resultado

| Métrica | Valor |
|---|---|
| Entradas | **25** (25 alta) — 22 paróquias + 3 áreas missionárias |
| Comunidades/capelas | **5** |
| Horários fixos | **0** |
| Cobertura | 22/22 paróquias (100%) |

Diocese criada em **1966**. Bispo: **Dom Philip Dickmans** (desde 2008).

## Fontes principais

1. **Site oficial** — <https://diocesedemiracemato.org.br>. A lista fica em
   `/conteudo/paroquias-e-areas-missionarias/3`, dividida em **4 regiões pastorais**, cada uma
   com uma página própria que traz os links das paróquias:
   - `01-regiao-pastoral-sao-mateus/121` (7), `02-regiao-pastoral-sao-marcos/136` (4),
     `03-regiao-pastoral-sao-lucas/141` (6), `04-regiao-pastoral-sao-joao/147` (6) = **23 fichas**.
   - A página `/conteudo/paroquias/3` (a do menu superior) **não lista nada**: só repete os
     quatro links de região. Quem parar nela acha que a diocese não publica paróquias.
2. **Fichas individuais** — endereço, CEP, telefone, e-mail, pároco, vigários, diáconos
   permanentes e secretário de cada paróquia. E-mails ofuscados pelo Cloudflare
   (`data-cfemail`), decodificados.
3. **GCatholic** (20 igrejas, atualizado 2026-01-01) — checagem de cobertura.

## A diocese não publica horário de missa

Não há página de horários, nem grade nas fichas, nem calendário com celebrações fixas. Os
agregadores também não cobrem o estado: `horariodemissa.com.br` (8.895 igrejas cadastradas)
**não tem nenhuma diocese do Tocantins** na sua lista.

**Miracema entra em produção sem nenhum horário**, por decisão consciente — como Pouso Alegre,
Caratinga, Almenara e Leopoldina em Minas. É o item nº 1 da validação para esta diocese.

## Composição: 22 paróquias + 3 áreas missionárias

As 23 fichas são 22 paróquias mais a **Área Missionária Nossa Senhora Aparecida (Juarina)**.
Mais duas áreas missionárias estão publicadas **dentro** da ficha da paróquia que as administra
e só aparecem para quem lê o corpo da página:

| Área missionária | Cidade | Criação | Administrada por |
|---|---|---|---|
| N. Sra. Aparecida | Juarina | — | Pároco de Couto Magalhães |
| N. Sra. das Graças | Itaporã do Tocantins | 13/06/2024 | Pároco de Colméia |
| N. Sra. do Perpétuo Socorro | Brasilândia do Tocantins | 08/05/2024 | Pároco de Presidente Kennedy |

As três entraram como entradas próprias (com `-area-missionaria` no slug e aviso em `notes`).
O número de **22 paróquias** coincide com o publicado pela Wikipédia.

**Área Missionária Indígena Krâhô**: a ficha de Juarina registra que o conselho **aprovou a
criação**, ainda não efetivada. Fica o registro — quando for criada, é território indígena.

## Divergências com o GCatholic

O GCatholic lista **20** igrejas: são as 22 paróquias **menos Goianorte** (N. Sra. do Perpétuo
Socorro) **e Rio dos Bois** (São Raimundo Nonato), que ele simplesmente não registra. Ambas têm
ficha completa no site diocesano, com pároco e e-mail — mantive as duas.

## Pontos para o enxame de validação

1. **Levantar os horários de missa das 25 entradas** — não há nenhum. Caminho provável: os
   perfis das paróquias no Facebook/Instagram, ou contato direto com a cúria
   ((63) 99957-9384 / diocesemirato@uol.com.br).
2. **Nome da paróquia de Pequizeiro — conflito dentro da própria fonte.** O menu da região
   pastoral e o GCatholic dizem **Nossa Senhora de Fátima**; o corpo da ficha vem intitulado
   "COMUNIDADE SANTO ANTÔNIO – PEQUIZEIRO" e o e-mail é `paroquiasantoantonio347@gmail.com`.
   Adotei o nome do menu (corroborado pelo GCatholic). A mesma ficha traz no rodapé uma lista
   antiga ("7.1. Pequizeiro – Comunidade Santo Antônio / 7.2. Goianorte – Comunidade Nossa
   Senhora do Perpétuo Socorro") sugerindo que Pequizeiro e Goianorte já foram uma paróquia só.
3. **CEP repetido — Rio dos Bois**: a ficha publica `77.650-000`, que é o CEP de **Miracema do
   Tocantins**. O de Rio dos Bois é outro.
4. **E-mails com defeito, gravados como publicados**: `paroquiabp@outlokk.com` (Bom Pastor,
   Dois Irmãos — domínio digitado errado) e `paroquiansra.ap.colinas.@hotmail.com` (N. Sra.
   Aparecida, Colinas I — ponto antes do @).
5. **Sem telefone** (4): São José Operário (Guaraí II), N. Sra. de Fátima (Pequizeiro),
   Bom Pastor (Dois Irmãos) e a Área Missionária de Itaporã. **Sem e-mail** (3):
   São João Paulo II (Tupiratins) e as áreas de Itaporã e... (Tupiratins publica só o e-mail
   das Irmãzinhas da Imaculada Conceição, que gravei em `notes`).
6. **Comunidades quase inexistentes**: só 5, das duas paróquias que listam as suas
   (Jesus de Nazaré/Santa Maria e Bom Pastor/Dois Irmãos). As outras 20 fichas não publicam
   comunidade nenhuma, embora várias abranjam 2 ou 3 municípios.
7. **Paróquias que abrangem mais de um município** (registrado em `notes`, sem comunidade
   correspondente): Colméia + Itaporã; Santa Maria + Centenário + Recursolândia; Pedro Afonso +
   Bom Jesus + Tupirama; Tupiratins + Itapiratins; Dois Irmãos + Abreulândia; Presidente
   Kennedy + Brasilândia.
8. **Duas paróquias por cidade** em Guaraí (São Pedro Apóstolo "I" e São José Operário "II"),
   Miracema (Catedral "I" e N. Sra. da Conceição "II") e Colinas do Tocantins (N. Sra. Aparecida
   "I" e São Sebastião "II"). Os rótulos I/II são da diocese e foram para `notes`, não para o
   nome.
