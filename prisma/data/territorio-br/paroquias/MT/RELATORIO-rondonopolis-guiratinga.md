# Relatório — Diocese de Rondonópolis-Guiratinga (MT)

Pesquisa em 2026-09-11. Arquivo: `rondonopolis-guiratinga.json`.

## Resumo

| Métrica | Valor |
|---|---|
| Paróquias no arquivo | 22 (todas `alta`) |
| Paróquias esperadas | 22 (catholic-hierarchy.org, estatística de 2022) |
| Comunidades | 198 (190 `alta`, 8 `media`) |
| Horários fixos | 130, todos MASS (120 `alta`, 10 `baixa`) |
| Paróquias sem nenhum horário | 0 |
| Paróquias sem comunidade listada | 8 |

Municípios com sede paroquial: Rondonópolis 10, Juscimeira 2, e um cada em Alto Araguaia,
Alto Taquari, Alto Garças, Itiquira, Tesouro, Guiratinga, São José do Povo, Pedra Preta,
Dom Aquino e Jaciara. São Pedro da Cipa aparece só como comunidade da Paróquia Bom Jesus
(Juscimeira) — fecha os 13 municípios da diocese.

## Fontes principais

- **Site oficial** — <https://dioceseroogga.org.br> (WordPress + Elementor).
  A lista canônica veio da **API REST do custom post type `paroquia`**
  (`/wp-json/wp/v2/paroquia?per_page=100`, `X-WP-Total: 22`).
  Últimas alterações das fichas: 06/06/2025 a 20/08/2026.
- Cada ficha (`/paroquia/<slug>/`) publica ano de criação, telefone, e-mail (ofuscado por
  Cloudflare, decodificado em `data-cfemail`), atendimento, endereço com CEP, clero com função e
  a **grade de missas** (repetidor ACF: dia da semana / tipo / horário / observações).
- A **história de cada paróquia**, na mesma ficha, traz a lista de comunidades em texto corrido
  ("A paróquia conta com nove comunidades urbanas: … e três comunidades rurais: …").
  Foi de lá que saíram as 198 comunidades.
- A **taxonomia `local_paroquia`** do site guarda as 5 foranias
  (`/wp-json/wp/v2/local_paroquia`): Nossa Senhora Aparecida (4), Nossa Senhora Auxiliadora (5),
  Sagrado Coração de Jesus (5), São João Batista (5) e São Lourenço (3) — soma exatamente 22.
  A forania de cada paróquia foi registrada em `notes`.
- <https://www.catholic-hierarchy.org/diocese/drond.html> — 22 paróquias (2022), 288.000 católicos,
  37 presbíteros, 53.405 km², 13 municípios; bispo **Dom Maurício da Silva Jardim** (desde 08/06/2022).

## Cobertura

**Fechada com três confirmações independentes**: 22 no CPT do site, 22 no catholic-hierarchy e
22 na soma das foranias. É a melhor situação possível para este dataset.

## Decisões tomadas

- **Concatedral São João Batista (Guiratinga)** — o site publica como "Paróquia São João Batista",
  mas é a antiga catedral da extinta Diocese de Guiratinga e hoje concatedral da diocese unida
  (a própria ficha chama a comunidade-sede de "Catedral São João Batista"). Registrada como
  `Concatedral São João Batista`, com a explicação em `notes`.
- **Homônimos desambiguados pelo slug**: duas "Paróquia São Sebastião" (Alto Garças e Dom Aquino) e
  duas "Paróquia Santa Terezinha do Menino Jesus" (Tesouro e Rondonópolis). O `name` ficou sem a
  cidade, como manda o README, e a cidade foi para `city`/`slug`.
- **Horários mensais → `baixa`** (10 registros), com a regra literal em `notes`:
  "1ª sexta de cada mês" em Alto Garças (17h, missa do apostolado), São José do Povo (19h),
  Pedra Preta (19h), Dom Aquino (18h), Jaciara (18h), São Domingos Sávio (19h),
  Nossa Senhora Aparecida/Rondonópolis (5h30) e Catedral (18h); e, ainda na Catedral,
  "a segunda terça de cada mês às 15h — missa dos idosos" e
  "a segunda sexta de cada mês às 19h — missa dos imigrantes".
- **Missa mensal sem dia da semana foi descartada**: a Paróquia São José e Nossa Senhora Aparecida
  (Alto Taquari) informa "missa mensal" nas comunidades rurais de Buriti e Jacuba sem dizer o dia —
  não cabe em `dayOfWeek`. Está anotado no `notes` da paróquia.
- **Faixas de dias expandidas**: "Segunda á Sábado", "Terça á Sexta", "Segunda-Feira á Domingo",
  "Terças e Quintas" etc. foram convertidas em um registro por dia, com deduplicação
  (São José Esposo publica domingo 6h tanto na linha de domingo quanto na linha "segunda a domingo").
- **Só há missas.** A diocese não publica horário de confissão, adoração ou terço em nenhuma ficha
  (o campo "Atendimento" traz o expediente da secretaria e o nome das secretárias). Por isso o
  arquivo tem 130 registros, todos `MASS`.
- **Comunidades `alta` × `media`**: as listas em presente ("A paróquia conta com…") entraram como
  `alta`; a da Catedral Santa Cruz veio de narrativa histórica de 1998 ("…passou a contar com sete
  comunidades") e ficou `media`.

## Precisa de validação humana

1. **Pároco da Paróquia Nossa Senhora Aparecida (Rondonópolis)** — o bloco "Clero" da ficha lista
   **dois** padres com a função *Pároco* (Pe. José Éder Ribeiro Lima e Pe. Jefferson Klayton Vilhame
   Aragão). O texto da mesma ficha diz que em 16/11/2024 Pe. Jefferson Klayton assumiu como pároco,
   com Pe. José Éder como cooperador — e a ficha da Paróquia São Domingos Sávio traz Pe. José Éder
   como pároco *de lá*. Foi adotado Pe. Jefferson Klayton.
2. **CEP de Tesouro** — a ficha publica `8.775-000` (falta um dígito). Ficou `null`;
   não foi reconstruído para não inventar dado. Essa paróquia também **não publica telefone**.
3. **CEP ausente em 3 paróquias de Rondonópolis**: Catedral Santa Cruz, Nossa Senhora Aparecida e
   Bom Pastor (o endereço não traz CEP na ficha).
4. **Contagens que não batem com a própria lista da fonte**:
   - Alto Garças diz "oito comunidades urbanas" e lista **cinco** (registradas as cinco + as 2 rurais);
   - Jaciara diz "vinte comunidades" e lista **dezoito**;
   - Juscimeira/Bom Jesus diz "vinte e uma" e lista **vinte**;
   - Catedral Santa Cruz diz "sete comunidades" e lista **oito** localidades.
5. **Paróquia Santa Terezinha do Menino Jesus (Rondonópolis)** entrou com `communities: []`
   de propósito: a única lista da ficha é rotulada "COMUNIDADES DA PARÓQUIA **ATÉ O PRIMEIRO
   DESMEMBRAMENTO**" e várias dessas comunidades (Gleba Rio Vermelho, Cabeceira do Almoço,
   Várzea do Ouro, Boa Vista, Parque Universitário) aparecem hoje na Paróquia Salesiana São João
   Batista. Registrá-las duplicaria comunidade.
6. **Oito paróquias sem lista de comunidades** (a ficha não publica): Itiquira, Tesouro,
   Pedra Preta, Dom Aquino, Nossa Senhora de Fátima (Juscimeira), São João Bosco, Santa Terezinha e
   Sagrado Coração de Jesus (as três últimas em Rondonópolis).
7. **Comunidades nomeadas por bairro/gleba.** Em São José Operário (29), São José Esposo (18),
   Salesiana São João Batista (17), São José do Povo (17), Jaciara (18) e São Domingos Sávio (12) a
   fonte lista a comunidade só pelo nome do bairro/assentamento/fazenda, sem padroeiro. Entraram
   como "Comunidade &lt;bairro&gt;". Quando o Parish exibir nome de comunidade, vale conferir se o
   padroeiro existe.
8. **Telefones em formato livre** e com dígitos faltando: `(66) 9952-8420`, `66 9676-1859`,
   `(66) 9983-7058`, `(66) 9200-0378`, `(66) 9696-9820`, `(66) 9601-3574`, `(66) 9984-5803`
   (celulares de MT precisam de 9 dígitos). Um e-mail está truncado no site:
   `paroquia.s.domingossavio@hotmail` (sem `.com`) — gravado como publicado.
9. **Paróquia Sagrado Coração de Jesus (Rondonópolis)** publica só as três missas de domingo;
   não há grade de dias de semana na ficha.
