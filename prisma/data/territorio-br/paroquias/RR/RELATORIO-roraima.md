# Relatório — Diocese de Roraima (RR)

Pesquisa: 2026-09-17 · Arquivo: `roraima.json` · Regional Norte 1 da CNBB · sede em Boa Vista
A diocese cobre o estado inteiro (15 municípios), com forte presença em terras indígenas.

## Resultado

| Métrica | Valor |
|---|---|
| Entradas | **30** — 13 paróquias, 1 reitoria/santuário, 10 áreas missionárias e 6 missões indígenas |
| Confiança | 26 `alta`, 3 `media`, 1 `baixa` |
| Comunidades/capelas | **427** (422 `alta`, 2 `media`, 3 `baixa`; 2 com `status: "fechada"`) |
| Horários fixos | **184** em 15 unidades — 24 `alta`, 128 `media`, 32 `baixa` (163 missas, 11 confissões, 5 adorações, 5 terços) |
| Cobertura | **24 paróquias/áreas encontradas / 24 esperadas** (+ 6 missões indígenas) |

## Fonte principal

**`https://diocesederoraima.org.br`** — WordPress ativo (notícia de 16/09/2026). O menu "Paróquias &
Áreas" tem quatro blocos: **Paróquias** (8, em Boa Vista), **Áreas** (5, em Boa Vista), **Interior**
(10) e **Missões Indígenas** (7). A API (`/wp-json/wp/v2/pages`) deu a data de modificação de cada
ficha — de 18/07/2024 a 05/08/2026.

**O conteúdo das fichas é IMAGEM, não texto.** As 12 fichas de Boa Vista e 6 do interior
(Pacaraima–Amajari, Bonfim, Caroebe, Mucajaí, Normandia e P. A. Nova Amazônia) foram refeitas em
2025–2026 para o Jubileu dos 300 anos e trazem: um *mural* (nome, data e bispo de criação, endereço
e horário da secretaria, WhatsApp, e-mail, presbítero, Instagram), **um cartão 1080×1080 por
comunidade** (nome no topo, endereço no rodapé) e as artes da **programação**. Baixei as 204
imagens, montei folhas de contato com o topo e o rodapé de cada cartão e li tudo visualmente; as
artes de programação foram lidas em tamanho cheio e os trechos miúdos, ampliados. As demais fichas
do interior e as das missões indígenas (julho de 2024) são texto.

Outras fontes: página **Clero** (modificada em 13/07/2026, com a lotação de cada padre — confere com
os murais), página de contato, gcatholic (24 paróquias e 1 missão em 31/12/2022), Cimi (Missão
Catrimani, 09/2025).

## A conta fecha

8 paróquias de Boa Vista (com a Catedral e a Reitoria) + 5 áreas + 5 paróquias e 5 áreas do interior
= 23; mais **Surumu**, que o menu põe entre as missões indígenas mas cuja ficha se intitula
"Paróquia Nossa Senhora do Perpétuo Socorro – Surumu (criada em 17/03/1966)" = **24**, o número do
gcatholic. Restam 6 missões indígenas.

## Decisões de modelagem

- **Missões indígenas entram com `loadAsParish: true`.** O nome "Missão Indígena …" cairia no filtro
  de unidade não paroquial do importador, mas estas missões têm padre responsável, território e
  dezenas de comunidades com igreja (Maturuca: 84 comunidades indígenas, 65 eclesiais, 44 igrejas) —
  são equivalentes às áreas missionárias. **É decisão a confirmar**: a regra do README reserva
  `loadAsParish` a igrejas com missa publicada, e nenhuma missão publica horário. Para deixá-las de
  fora basta remover a chave.
- **Igreja-sede.** Onde a secretaria fica no endereço de uma das comunidades, ela foi marcada
  `isMatriz` e posta em 1º lugar, mesmo com outro padroeiro (São Jerônimo → igreja São Bento; Frei
  Galvão → Bom Pastor; Santos Arcanjos → N. Sra. do Perpétuo Socorro; A. M. Sagrado Coração → Santa
  Paulina, onde o padre atende). Nas missões indígenas e na área em formação criei "Sede da …".
- **"Matriz Nossa Senhora do Carmo"** é o nome que a própria Catedral dá à antiga matriz de Boa
  Vista, hoje comunidade da paróquia — não é a sede. Os horários apontam sempre para o nome exato.
- **Área Missionária Nova Amazônia** (`media`): a diocese a lista entre as "Áreas" como "Projeto de
  Assentamento Nova Amazônia — em processo de formação", com presbítero e 4 comunidades. Normalizei
  o nome para passar no validador.
- Nomes sem a cidade: "Paróquia N. Sra. de Fátima – Mucajaí" → Mucajaí em `city`; "São José Operário
  – Caracaraí e Iracema" → Caracaraí (as comunidades de Iracema estão na lista); "Santo Isidoro do
  Caroebe" → Caroebe. Rorainópolis, Cantá, Bonfim e Pacaraima–Amajari não têm padroeiro no nome
  oficial e ficaram "Área Missionária de …".
- Comunidades das missões sem padroeiro ("Comunidade Pavão", "Comunidade Jawari") mantêm o nome da
  aldeia, e a observação da fonte ("tem igreja", "rezam no malocão", "construindo igreja") foi para
  `notes`. **Não entraram** as aldeias que a fonte diz não terem comunidade católica (evangélicas,
  sem moradores etc.) — 18 em Maturuca, 1 na Raposa e 5 em São Marcos/Murupu.

## Horários

- **`alta` (24)**: fichas modificadas há menos de 12 meses — São Francisco das Chagas (05/08/2026),
  Mucajaí e Caroebe (17/12/2025).
- **`media` (128)**: fichas de agosto–setembro de 2025 (12 a 13 meses): Catedral, Consolata, São
  Mateus, Reitoria Aparecida, São Jerônimo, Frei Galvão, Santos Arcanjos e as áreas São Raimundo
  Nonato, São João Batista e Santa Rosa de Lima. São artes intituladas "Horários das missas".
- **`baixa` (32)**:
  - A. M. **Sagrado Coração de Jesus** (10): a arte se chama só "Programação" e põe duas comunidades
    às 9h de domingo para um único padre — pode ser celebração da Palavra. Só a quinta-feira de N.
    Sra. da Piedade diz "Adoração e Missa" (`media`). Três linhas são mensais.
  - A. M. **Santa Rosa de Lima**, sábados (4): "as celebrações são intercaladas entre celebração da
    Palavra e Missa".
  - **São João da Baliza / São Luiz** (15): a ficha de 07/2024 cola a hora ao fim da linha de cada
    comunidade ("Vicinal 3117H" = Vicinal 31, 17h), sem dizer se é missa, metade sem o dia, e com
    duas comunidades rurais no mesmo "DOM 10H" para um padre só.
  - Recorrência mensal: 1ª sexta na Consolata, terço do 3º sábado na Reitoria; e a terça dos Santos
    Arcanjos ("novena às 19h, seguida de missa na comunidade", sem hora nem local exatos).
- Não entraram: novenas (Consolata, São Francisco), celebração do 1º sábado na Reitoria, encontros
  de jovens, grupo de oração, terço nas residências (Caroebe) e o atendimento do padre.
- **Sem grade publicada**: Nova Amazônia, Caracaraí, Rorainópolis, Alto Alegre, Cantá, Bonfim
  ("em desenvolvimento"), Normandia, Pacaraima–Amajari e todas as missões indígenas.

## Párocos

Os murais dizem "Presbítero(s)", sem distinguir pároco de vigário. Gravei o **primeiro nome
listado**, que coincide com a página do Clero (07/2026) em todos os casos conferíveis. Onde há dois
ou três padres (Santa Rosa de Lima, São Raimundo Nonato, São João Batista, Mucajaí,
Pacaraima–Amajari), **confirmar quem é o pároco**. Nomes vindos só das fichas de 07/2024 (conferir):
Caracaraí (Pe. Mattia Bozzolan — confirmado no Clero 2026), São João da Baliza (Pe. Eduardo Augusto
Belão), Raposa (Pe. Julius Oduor — o mural de Normandia de 11/2025 o dá como presbítero de N. Sra.
de Nazaré), São Marcos e Murupu (Pe. Teddy Keyari Njaya), Catrimani (Pe. Bob Mulega), Surumu (Pe.
Mugewa Joseph; o outro padre da ficha, Pe. Rosalino Dall'Agnese, já aparece em 2025 na A. M. São
João Batista). Serra da Lua, Maturuca, Baixo Cotingo e Cantá vêm do Clero 2026. Rorainópolis traz
só "Fr. Smaley" → `priestName: null` (guardado em `priestNote`); Alto Alegre lista só uma religiosa.

## Precisa de validação humana

1. **Missões indígenas na carga** (`loadAsParish`) — decisão de produto, ver acima.
2. **Município de três unidades não está na fonte**: Missão Raposa (gravei Normandia), Paróquia de
   Surumu (Pacaraima) e Missão Baixo Cotingo (Normandia). Raposa e Surumu ficaram `media`; **Baixo
   Cotingo ficou `baixa`** — a página dela (`?page_id=7323`) devolve 404 e só sei que existe pelo
   menu e pelo Clero (Pe. Fred Opiyo Okumu). Catrimani = Caracaraí (Cimi, 09/2025); Maturuca =
   Uiramutã, Serra da Lua = Bonfim/Cantá e São Marcos = Boa Vista/Pacaraima (as próprias fichas).
3. **Contatos ilegíveis ou inválidos na fonte**: Caroebe traz "(95) 98427-596" (falta um dígito →
   `null`); A. M. Sagrado Coração traz e-mail com acentos (`amsagradocoraçãodejesusrr@gmail.com` →
   `null`; o provável é sem acento); A. M. São Raimundo Nonato traz celular de 8 dígitos "(95)
   8412-4761" (gravado como está); Frei Galvão: o mural diz "(95) 9113-9426" e a agenda semanal,
   "(95) 99113-9426" — gravei o segundo.
4. **Cartões com endereço repetido** (provável erro de montagem da arte): Santo André = São Pedro
   (Rua Miguel Lupi Martins, 380) em São Francisco das Chagas; N. Sra. do Rosário = Santa Clara (Rua
   Santa Clara, 1261) em São Jerônimo. São Marcos (Consolata): o cartão diz "Calungá" e a arte de
   localizações diz "São Vicente". "Rua Francisco Alvez Machado" mantida como no cartão.
5. **Pacaraima–Amajari**: os 13 cartões não têm endereço nem dizem em qual dos dois municípios fica
   cada igreja; há dois cartões "N. Sra. de Guadalupe" e dois "São Sebastião" com fotos diferentes —
   o segundo de cada par ficou `baixa` para não se fundir com o primeiro na carga.
6. **Comunidades fora do município-sede**: Santa Cecília (Consolata) fica em Cantá; N. Sra. Aparecida
   (Vila Nova) e N. S. de Fátima (Vila Samaúma), de Alto Alegre, ficam em Mucajaí; Iracema e São
   Luiz são municípios atendidos pelas paróquias de Caracaraí e São João da Baliza. O importador grava
   a cidade da paróquia em todas.
7. **Mucajaí**: a programação cita "Igreja Nsa. Sra. Aparecida – 9h30 domingo" na lista "da cidade";
   há duas comunidades com esse nome (bairro Sagrada Família e Vicinal 09/Apiaú) — atribuí à urbana
   (`media`).
8. **Confissões de domingo na Reitoria**: a arte diz "7h e 9h / 10h às 11h30 / 17h às 18h" — o
   primeiro trecho pode ser "7h às 9h". Gravei 7h, 10h e 17h com o texto literal em `notes`.
9. **Cantá**: a ficha não indica a igreja-sede; marquei N. Sra. da Conceição (centro). Duas
   comunidades de Taboca estão "fechadas" (`status: "fechada"`).
10. **Sem CEP** em quase tudo: os murais não publicam (só Alto Alegre, 69350-000).
11. Grafias mantidas: "Santa Terezinha Davila" (Serra da Lua), "N. Sra. de Lurdes" (Alto Alegre),
    "Santo Antonino" (Cantá), "São João Diego" (Raposa).
