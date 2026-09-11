# Relatório de pesquisa — Diocese de Colatina (ES)

Pesquisa: 11/09/2026. Arquivo: `colatina.json`.

## Números

| Item | Quantidade |
|---|---|
| Paróquias | **31** (31 `alta`) |
| Entradas fora da carga | 1 — Santuário Diocesano Nossa Senhora da Saúde (`status: "nao-paroquial"`) |
| Paróquias com endereço + telefone + e-mail + pároco | 31 (30 com CEP) |
| Comunidades nomeadas | 47, em 3 paróquias |
| Horários fixos | 106 — 93 MASS, 12 CONFESSION, 1 ADORATION (89 `media`, 17 `baixa`) |
| Paróquias com horário de missa | 23 de 31 |
| Municípios cobertos | 17 |

Cobertura de paróquias: **100 %** — 31 encontradas, 31 esperadas (Anuário Pontifício 2023, via
catholic-hierarchy). O número bate exatamente.

## Fontes principais

1. **`https://diocesedecolatina.org.br/paroquias/`** — a listagem oficial. Diferente de Cachoeiro, aqui
   as paróquias não são um *custom post type*: são **posts comuns** na categoria `Paróquias` (id 29) e
   nas cinco subcategorias de área pastoral (37 BR-101 Norte, 38 BR-101 Sul, 39 de Colatina, 40 do Café,
   41 Linha Ita). `GET /wp-json/wp/v2/posts?categories=29,37,38,39,40,41&per_page=100` devolve as **32
   entradas** de uma vez (31 paróquias + o santuário).
2. Cada post traz, em texto corrido dentro do `content`, um bloco estruturado: `Fundada em`,
   `Comunidades: N`, `Endereço` (logradouro / bairro, cidade (ES) / Cep), `Contatos` (telefone,
   WhatsApp, e-mail, site, Facebook, Instagram, YouTube), `Horário de missas`, `Horário de confissões`,
   `Atendimento da secretaria` e `Sacerdotes`. Foi tudo extraído por parser de rótulos.
3. **`https://diocesedecolatina.org.br/clero/`** (categorias 26 e 81, 63 fichas) — cada presbítero tem
   ficha dizendo de que paróquia é pároco ou vigário. Fechou os 5 párocos que a ficha da paróquia não
   trazia e revelou 4 conflitos (abaixo). Fichas atualizadas entre 01/2025 e 06/2026.
4. `catholic-hierarchy.org/diocese/dcola.html` — 31 paróquias em 2023.

## Áreas pastorais (`forania`)

Colatina (8, incluindo São Roque do Canaã), BR-101 Norte (8), BR-101 Sul (6), Linha Ita (5), do Café (4).
Nota: a árvore de subcategorias do site coloca **São Roque** em "Linha Ita", mas o post está marcado na
categoria "Área Pastoral de Colatina". Adotei a categoria do post.

## Horários

Esta é a melhor diocese das três em horários: **23 das 31 paróquias publicam grade de missa no
próprio site diocesano**, e 3 publicam confissões, 1 publica adoração.

- **`media` (89)**: a diocese é fonte oficial, mas as fichas foram modificadas pela última vez entre
  2019 e 10/2024 — mais de 12 meses. Pela escala do README isso é "fonte oficial sem sinal de
  atualidade" = `media` (carrega).
- **`baixa` (17)**: recorrências que `MassSchedule` não representa. São o padrão de 6 paróquias:
  - **Coração Eucarístico de Jesus (Guaraná/Aracruz)** — a missa da matriz alterna por domingo do mês
    (1º/3º/5º às 7h, 2º/4º às 19h). É a *única* grade que a paróquia publica.
  - **Santa Clara de Assis (Colatina)** — "domingos intercalados: 19h" e "2ª quarta do mês, Missa da
    Saúde, 16h". Também é a grade inteira.
  - **São João Paulo II (Linhares)** — "domingos, 8h e 19h de forma intercalada", 1ª sexta e última
    quinta do mês.
  - **São José (João Neiva)** — "domingos às 7h **ou** às 19h", sem dizer a alternância.
  - Primeiras sextas-feiras em Cristo Rei, N. Sra. Auxiliadora/Marilândia, Sagrada Família, São João
    Batista/Aracruz, Santíssima Trindade e Catedral.
- **Fora do modelo, só em `notes`**: missas por **dia do mês** — dia 21 (Marilândia), dia 22 (Santa
  Rita de Cássia), dia 12 e dia 21 (São João Batista/Aracruz).
- **Sem horário publicado (8 paróquias)**: Imaculada Conceição (Coqueiral/Aracruz), N. Sra. da Glória
  (Vila Lenira), **N. Sra. da Penha (Honório Fraga)**, Bom Pastor (Linhares), São Paulo Apóstolo
  (Linhares), Santa Luzia (Pancas), São Domingos do Norte e São Marcos (Ibiraçu).
- **Confissões**: só N. Sra. da Conceição (Linhares), São João Paulo II (Linhares) e Cristo Rei
  (Sooretama) publicam com horário. São Pedro (Baixo Guandu) diz apenas "às terças e quartas-feiras
  durante a manhã" — sem hora, não virou registro (ficou em `notes`).

## Comunidades

Só **3 paróquias publicam a lista nominal**, e essas 47 entradas são o que entra:
- **N. Sra. da Penha (Honório Fraga, Colatina)** — 17 comunidades em 3 setores (Cidade, Itapina, São
  João), com o bairro de cada uma. A lista mais completa da diocese.
- **Divino Espírito Santo (Maria das Graças, Colatina)** — as 18 comunidades nomeadas no texto de
  fundação (2006), com a localidade de cada uma, mais a matriz.
- **Imaculado Coração de Maria (São Silvano, Colatina)** — 10 comunidades nomeadas, mais a matriz.

As demais publicam só o **total**: 64 (Rio Bananal), 50 (Santa Teresa), 37 (Sagrada Família), 30
(Pancas), 28 (Guaraná), 27 (Sooretama e São Domingos), 24 (N. Sra. da Glória), 20 (Santa Clara e São
Marcos), 11 (Catedral e Laranja da Terra), 7 (Bom Pastor). Os totais ficaram em `notes`.

Há uma categoria "Comunidades" no site (86 posts), mas os posts são de 2018, têm **conteúdo vazio** e
**não apontam para a paróquia** a que pertencem — inúteis para o dataset. Não foram usados.

## Pontos para o enxame de validação humana

1. **Quatro conflitos de pároco entre a ficha da paróquia e a ficha do clero** (o clero é mais recente;
   gravei a versão do clero e anotei em `notes` os dois lados):
   - **N. Sra. da Penha (Honório Fraga)** — ficha da paróquia (10/2024): Pe. Paulo Sérgio Ribeiro
     Barbosa; ficha do clero (15/06/2026): **Pe. Wilderson das Virgens Gama**.
   - **Santa Rita de Cássia (Araçá, Linhares)** — a ficha da paróquia dá Pe. Wilderson como pároco
     daqui; o clero o colocou na Penha e lista Pe. Waldemir Costa Pereira como vigário. **Não se sabe
     quem é o pároco atual desta paróquia.**
   - **Santa Teresinha do Menino Jesus (Bela Vista, Aracruz)** — ficha da paróquia e clero de 01/2025:
     Pe. Jésus Bento Fioresi; clero de 06/06/2026: Pe. Marcelo Keller Santiago.
   - **São Pedro (Baixo Guandu)** — a ficha da paróquia dá Pe. Marcelo Keller Santiago como pároco, o
     mesmo nome que o clero pôs em Santa Teresinha.
2. **Paróquia São Roque (São Roque do Canaã)** — é a única sem CEP publicado.
3. **N. Sra. da Conceição (Linhares)** — `foundedYear: 1918`, deduzido do e-mail oficial
   (`paroquiansc1918@hotmail.com`) e do texto (pedra fundamental da matriz atual em 1960, freguesia
   muito anterior). Confirmar.
4. **Fichas paradas** — Bom Pastor e São João Batista/Aracruz (02/2020), N. Sra. da Glória (02/2020),
   Santuário (05/2019), Imaculada Conceição/Coqueiral e São Domingos (09/2021), São Marcos (08/2022).
   Nessas, endereço e telefone podem estar defasados.
5. **Santuário Diocesano Nossa Senhora da Saúde (Ibiraçu)** — a primeira igreja da região, erguida
   pelos imigrantes italianos; elevada a santuário por Dom Geraldo Lyrio Rocha em 1998, e em 2007
   Bento XVI declarou N. Sra. da Saúde padroeira da diocese (festa em 21 de novembro). Reitor: Pe.
   Luismar Passarelli. Não é paróquia e não publica horário fixo — marcado `nao-paroquial` e fora da
   carga. Se a validação encontrar horário fixo, vale marcar `loadAsParish: true`.
6. **Nome variante** — "Paróquia São Francisco de Assis" (Laranja da Terra) se apresenta como
   "Paróquia **Missionária** São Francisco de Assis" nas redes e na ficha do pároco.
7. **Grafia do município** — a ficha escreve "Governador Lindemberg"; o nome oficial do município é
   **Governador Lindenberg**. Gravei a grafia oficial.
