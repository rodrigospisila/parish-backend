# Relatório de pesquisa — Diocese de São Mateus (ES)

Pesquisa: 11/09/2026. Arquivo: `sao-mateus.json`.

## Números

| Item | Quantidade |
|---|---|
| Paróquias | **27** (27 `alta`) |
| Entradas fora da carga | 1 — Setor Missionário Santa Teresinha do Menino Jesus (`status: "nao-paroquial"`) |
| Paróquias com endereço + telefone + e-mail + forania + padre | 27 (25 com CEP) |
| Comunidades nomeadas | 3 |
| Horários fixos | 23 — 20 MASS e 3 ROSARY (6 `media`, 17 `baixa`) |
| Paróquias com horário de missa | 4 de 27 |
| Municípios cobertos | 18 |

Cobertura de paróquias: **100 %** — 27 na listagem oficial contra 26 do Anuário Pontifício de 2022
(catholic-hierarchy). A diferença é a **Paróquia Nossa Senhora do Perpétuo Socorro** (São Gabriel da
Palha), cuja ficha foi publicada em **28/08/2025**, depois do anuário. Por isso `parishesExpected: 27`.

## Fontes principais

1. **`https://diocesedesaomateus.org.br`** — WordPress com Elementor/JetEngine. A API REST expõe o
   custom post type `paroquias`: `GET /wp-json/wp/v2/paroquias?per_page=100` devolve as **28 entradas**
   (27 paróquias + o setor missionário) com o termo da taxonomia `foranias` de cada uma.
   O `content` vem **vazio** — todos os campos são renderizados pelo Elementor. As 28 páginas foram
   raspadas em HTML e os blocos extraídos por marcador: `elementor-post-info__terms-list-item`
   (forania), `elementor-icon-box-title` "Padre(s)" + descrição, e os `<h2>` "Endereço" e "Contato"
   seguidos de `elementor-icon-list-text`.
2. **`https://diocesedesaomateus.org.br/santuario-imaculado-coracao-de-maria/`** — a **única** página
   da diocese com grade de celebrações. Modificada em 25/01/2024.
3. `horariodemissa.com.br` — varredura das 19 cidades da diocese (20 fichas encontradas).
4. `catholic-hierarchy.org/diocese/dsamt.html` — 26 paróquias em 2022.

## Foranias (`forania`)

Capixaba (9), Praiana (8, incluindo as 5 de São Mateus), Baiana (6) e Mineira (5).

## Horários — a diocese praticamente não publica

**As fichas das paróquias não têm campo de horário de missa.** O que existe:

- **Santuário Diocesano do Imaculado Coração de Maria, em Vinhático (Montanha)** — 6 horários `media`
  (fonte oficial, página de 01/2024): Missa quarta 19h30, domingo 9h (transmitida pela Rádio Montanha
  FM) e 19h (Rádio Kairós FM); Terço Mariano segunda e sábado 19h; Terço dos Homens quinta 19h.
  Não entraram: "Grupo de Oração" (terça 19h — não é nenhum dos 4 tipos do modelo), a Oração das Mil
  Ave-Marias do 1º sábado (recorrência mensal) e as confissões, que a fonte descreve só como "antes da
  celebração" (quarta) e "depois da celebração" (domingo), sem hora.
  **Estrutura adotada**: o santuário entrou como *comunidade* da Paróquia Nossa Senhora Aparecida /
  Imaculado Coração de Maria (Montanha), com a matriz listada explicitamente antes dele para que o
  importador não mande as missas da matriz para o santuário.
- **`horariodemissa.com.br`, tudo `baixa` (17 horários)**: a base está congelada — das 20 fichas,
  **15 foram atualizadas em 2012–2013**, 2 em 2014 e 3 em 2023. Só 4 têm horário: Paróquia São Mateus
  (a catedral, ficha de 2013, 7 horários), São Marcos/Nova Venécia (2014, 4), São José
  Operário/Ecoporanga (2014, 4) e N. Sra. de Fátima/Pedro Canário (2023, 2 — e a própria ficha manda
  "conferir no Facebook").

**23 das 27 paróquias entram em produção sem nenhum horário de missa.** Todas as 27 têm perfil oficial
de Instagram ou Facebook (gravados em `notes`), que é onde a grade circula — e que o leitor automático
não alcança. Foi também verificado que o `missas.com.br` **não tem dado nenhum do Espírito Santo**.

## Comunidades

A diocese **não publica lista de comunidades nem o total por paróquia** — é a mais pobre das três
neste ponto. As 3 comunidades nomeadas são: Catedral São Mateus (matriz da Paróquia São Mateus),
Matriz N. Sra. Aparecida / Imaculado Coração de Maria e o Santuário de Vinhático. Todas as demais
ficam com `communities: []` e o importador cria a matriz sozinho.

## Pontos para o enxame de validação humana

1. **Setor Missionário Santa Teresinha do Menino Jesus (Cedrolândia, Nova Venécia)** — a diocese o
   lista junto das paróquias, e ele tem administrador próprio (Pe. Jader Jesus Silva), sede e telefone;
   é, na prática, uma paróquia em formação. Como não é paróquia e não publica missa fixa, segui a regra
   do README e marquei `nao-paroquial` (fica no dataset, fora da carga). **Decisão a confirmar com o
   Rodrigo**: se o Parish quiser exibi-lo, basta trocar para `loadAsParish: true` ou reclassificá-lo
   como quase-paróquia.
2. **Vínculo do santuário de Vinhático** — a ligação do Santuário Diocesano do Imaculado Coração de
   Maria à Paróquia N. Sra. Aparecida / Imaculado Coração de Maria (Montanha) foi **inferida**: a
   paróquia tem titulação dupla e o santuário é a antiga matriz da paróquia de Vinhático, instalada em
   14/02/1965 por Dom José Dalvit e elevada a santuário por Dom Zanoni Demettino Castro a partir de
   21/04/2014. A diocese não diz explicitamente a que paróquia ele pertence hoje. Marcado `media`.
3. **Três entradas sem CEP** — N. Sra. do Perpétuo Socorro (São Gabriel da Palha, ficha de 08/2025),
   São Lucas Evangelista (Nestor Gomes, São Mateus) e o Setor Missionário.
4. **Administrador sem título eclesiástico** — Paróquia Santa Rita de Cássia (Nova Venécia): a ficha
   diz apenas "Administrador: Welington Cristiano da Silva", sem "Pe.". Gravei literal; confirmar se é
   padre, diácono ou administrador leigo.
5. **Um padre em duas paróquias** — Pe. Magno Nogueira Pereira aparece como vigário paroquial da
   Paróquia Arcanjo São Gabriel **e** como administrador paroquial da Paróquia N. Sra. do Perpétuo
   Socorro, ambas em São Gabriel da Palha. Plausível (a paróquia nova foi desmembrada da outra), mas
   vale conferir.
6. **`foundedYear` vazio em todas as 27** — a diocese não publica ano de criação em nenhuma ficha.
7. **Nome da catedral** — o site chama a paróquia da sé de "Paróquia São Mateus" (URL
   `/paroquias/catedral/`); mantive o nome oficial e registrei a igreja como comunidade "Catedral
   São Mateus" com `isMatriz: true`.
8. **Fichas mais antigas** (20/02/2024): N. Sra. das Dores/Mantenópolis, Santa Luzia/Nova Venécia,
   São João Paulo II/Jaguaré, São José/Alto Rio Novo, São Lucas Evangelista/São Mateus e São
   Pedro/Vila Pavão — contatos podem estar defasados.
9. **Bairro divergente** — para a paróquia de Ponto Belo o `horariodemissa` registra o bairro "Mucuci";
   a diocese diz "Centro". Adotei "Centro".
