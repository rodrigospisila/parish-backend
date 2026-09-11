# Relatório — Diocese de Formosa (GO)

Pesquisa em 2026-09-11. Arquivo: `formosa.json`.

## Resumo

| Métrica | Valor |
|---|---|
| Paróquias no dataset | **37** (36 paróquias + 1 quase-paróquia) |
| Confiança das paróquias | 37 `alta`, 0 `media`, 0 `baixa` |
| Comunidades/capelas | **317** (inclui as 37 matrizes) |
| Horários fixos | **46** (29 `alta`, 4 `media`, 13 `baixa`) |
| Esperado (Annuario Pontificio 2024) | 35 paróquias em 2023 |
| Cobertura da lista | **100%** da listagem oficial da diocese |

## Fontes principais

1. **Site oficial — `https://diocesedeformosa.com.br`** (WordPress). Foi a fonte de quase tudo.
   - `/paroquia/` — índice oficial com as 37 jurisdições em 5 foranias.
   - Páginas de forania (`/foraniaimaculadaconceicao/`, `/foraniadivinoespiritosanto/`,
     `/foranianossasenhoradaguia/`, `/foraniasantanadeposse/`, `/forania-santana-de-cavalcante/`),
     todas atualizadas entre 02/2025 e 04/2026.
   - **Truque que resolveu a diocese**: as fichas de paróquia são *posts* na categoria
     `paroquia` (id 423). `GET /wp-json/wp/v2/posts?categories=423&per_page=100` devolveu os 58
     posts (37 fichas de paróquia + 21 páginas de cidade) numa chamada, com `modified` por post.
     Não existe post-type customizado — `/wp-json/wp/v2/types` só lista os nativos.
   - **34 das 37 fichas trazem bloco estruturado** com: data de criação canônica, CNPJ (filial da
     mitra `01.496.660/____-__`), endereço completo com CEP, telefone(s), e-mail
     `@diocesedeformosa.com.br`, pároco, vigários e diáconos. **32 fichas publicam a lista nominal
     de capelas/comunidades** com o povoado/fazenda/assentamento de cada uma.
   - 30 das 37 fichas foram modificadas em 2026 — sinal de atualidade forte.
2. **`https://www.catedraldeformosa.com.br`** — site próprio da Catedral. Horários publicados como
   **imagem** (cartazes "Horário de Missa Dominical" e "Horário de Missa Semanal"); ambos lidos.
   Banner "Adoração ao Santíssimo" de 01/2026 também lido como imagem.
3. **`catholic-hierarchy.org/diocese/dforb.html`** — número esperado de paróquias, bispo, área,
   lista dos 22 municípios da diocese. Atenção: **`dform.html` é Formosa/Argentina**, não esta.
4. **`horariodemissa.com.br`** (busca por cidade) — único horário encontrado além dos oficiais
   (Divino Espírito Santo, Planaltina de Goiás) e um conjunto de horários antigos de Formosa.

## O que foi confirmado / corrigido

- A página `/paroquia/` lista **"Damianópolis/Sítio d'Abadia"** como um item e **"Cavalcante/
  Teresina de Goiás"** como outro. As páginas de forania esclarecem: Sítio d'Abadia **não é
  paróquia** — é a Capela Nossa Senhora d'Abadia, da Paróquia Santa Catarina de Sena
  (Damianópolis). Já Teresina de Goiás **virou paróquia em 23/01/2026** (Santa Terezinha do Menino
  Jesus). Ambas as correções estão aplicadas no JSON.
- A Forania Sant'Ana de Cavalcante diz no texto "cinco paróquias" mas lista seis cidades/seis
  paróquias — o texto está desatualizado (foi escrito antes da criação de Santa Terezinha).
  Adotadas as **seis**.
- **Planaltina**: os endereços do site grafam "Planaltina-GO". O município é **Planaltina de
  Goiás (GO)**, não Planaltina/DF (que é da Arquidiocese de Brasília). A página da forania
  confirma ("região de Planaltina de Goiás"), e catholic-hierarchy lista "Planaltina" entre os 22
  municípios da diocese. `city` gravado como **"Planaltina de Goiás"**.
- **Duas paróquias homônimas em Formosa**: "Paróquia Nossa Senhora Aparecida" na sede (Parque Vila
  Verde, criada 2011) e outra no **Distrito do Bezerra** (criada 2016). São distintas; slugs
  `nossa-senhora-aparecida-formosa` e `nossa-senhora-aparecida-bezerra-formosa`.
- **Duas "Paróquia São José Operário"** (Formosa/Pau Ferro e Planaltina de Goiás/Setor Leste) e
  **duas "Paróquia São Sebastião"** (Formosa/Formosinha e Vila Boa) e **duas "Paróquia São João
  Batista"** (Divinópolis de Goiás e São João d'Aliança) e **duas "Paróquia Sant'Ana"**
  (Posse e Cavalcante). Todas distintas, desambiguadas pelo slug com a cidade.
- **Datas de fundação**: aqui as datas **não** são a data de cadastro no CMS. A ficha traz um campo
  "Data de criação" com datas canônicas plausíveis e variadas (1825, 1836, 1855, 1770, 1969, 1972,
  1986, 1987, 1996, 2000, 2004, 2009, 2011, 2012, 2016, 2017, 2020, 2022, 2023, 2026). Três
  paróquias de Formosa (Cristo Rei, São Sebastião, São José Operário) repetem **10/02/1989** — é
  plausível (criação conjunta) e foi mantido, mas convém confirmar.
  As datas "1 de janeiro de 2017"/"1 de março de 2017" que aparecem nas listagens das foranias
  **são a data de publicação do post no CMS** e foram ignoradas.

## Horários — cobertura baixa, por decisão da diocese

Só **4 paróquias das 37** têm grade de missa localizável:

| Paróquia | Fonte | Confiança |
|---|---|---|
| Catedral N. Sra. Imaculada Conceição (Formosa) | Site diocesano (seg–sex 7h15 e 19h, atualizado 03/2026) + cartazes do site da catedral (domingo 07h, 10h, 17h, 19h) | `alta` nos dias de semana, `media` no domingo |
| Paróquia Santa Luzia (Formosa) | Ficha diocesana, atualizada 23/03/2026 — inclui matriz e 3 comunidades | `alta` |
| Paróquia Sant'Ana (Cavalcante) | Ficha diocesana, atualizada 10/04/2026 — matriz + 2 capelas | `alta` |
| Paróquia Divino Espírito Santo (Planaltina de Goiás) | Só `horariodemissa.com.br` | `baixa` (9 horários) |
| Paróquia São José Operário (Formosa) | Só `horariodemissa.com.br` | `baixa` (3 horários) |

Nenhuma outra ficha da diocese publica horário. Os 33 registros restantes ficam sem grade.

### Registros `baixa` (13)
- **1 recorrência mensal**: Sant'Ana de Cavalcante, "Primeira sexta do mês às 05h30" — regra
  literal preservada em `notes`, conforme a decisão de produto pendente no README.
- **12 de agregador sem corroboração oficial**: Divino Espírito Santo (9) e São José Operário de
  Formosa (3).

### Divergência registrada, não resolvida
`horariodemissa.com.br` publica para a **Paróquia Santa Luzia** de Formosa "domingo 07:30 e 19:30;
seg–sex 19:30; confissões 20:30". A ficha oficial da diocese (03/2026) diz "terça a sexta 19h;
domingo 7h, 10h e 19h". **Prevaleceu a fonte oficial**; o agregador está velho e foi descartado
(não entrou no JSON).

## Comunidades homônimas — desambiguação aplicada

O mesmo padroeiro se repete várias vezes dentro da mesma paróquia (a Paróquia Sant'Ana de
Cavalcante tem quatro "Capela Nossa Senhora Aparecida"; a Quase-paróquia São Bento, três).
Como o importador identifica a comunidade pelo nome, elas colidiriam e se fundiriam na carga.
**Sempre que houve colisão dentro da mesma paróquia, o local foi acrescentado ao `name`**
(ex.: `Capela Nossa Senhora Aparecida – Palmeira 2`), mantendo o `neighborhood` intacto.
**63 comunidades** foram renomeadas assim, em 15 paróquias. Validado: nenhum horário ficou órfão.

Em Cavalcante, a única "Capela Nossa Senhora Aparecida" que **não** foi renomeada é a que aparece
no bloco de horários da fonte oficial sem indicação de local — é justamente a que as missas de
quarta e sábado apontam.

## Precisa de validação humana

1. **Telefone malformado** — Paróquia São João Batista (São João d'Aliança): a ficha publica
   `(62) 9999-8214`, 8 dígitos com prefixo de celular. Gravado como `(62) 99999-8214`
   (normalização assumida). **Confirmar.**
2. **CEP incompleto** — Paróquia São Francisco Xavier (Buritinópolis): a ficha publica `73975-`.
   `zipCode` deixado `null`.
3. **Capela fora do estado** — Paróquia Imaculado Coração de Maria (Planaltina de Goiás) lista a
   **Capela Nossa Senhora da Rosa Mística no Morumbi (DF)**. Território do DF é da Arquidiocese de
   Brasília; a diocese a publica como sua. Verificar jurisdição.
4. **Capelas em município de outra paróquia** — Santo Antônio de Pádua (Iaciara) atende
   "Prata da Ponte" e "Povoado Impueiras", ambos **no município de Posse**; Imaculada Conceição
   (Mambaí) atende "Vila Nova", **em Buritinópolis**. É o que a fonte oficial diz (limite pastoral
   ≠ limite municipal), mantido como publicado.
5. **Paróquia Sagrada Família (Posse)** — a ficha oficial **não publica telefone**.
6. **Paróquia São Vicente de Paulo (Formosa)** — a ficha oficial **não publica CNPJ**
   (todas as outras publicam).
7. **Quase-paróquia São Bento (Formosa)** — endereço "Rodovia 116, Km 01 - Estrada Vicinal", sem
   CEP e sem bairro. Sede no Mosteiro Nossa Senhora da Ternura. É `Quase-paróquia` no nome, como
   manda a regra de prefixos.
8. **Paróquia Nossa Senhora das Graças (Alto Paraíso de Goiás)** — o e-mail oficial é
   `santuarionsg@`, sugerindo condição de santuário, mas a diocese a lista e nomeia como paróquia.
   A ficha promete "site da paróquia" sem publicar a URL. `website` ficou `null`.
9. **Paróquia Santo Antônio (Planaltina de Goiás)** — o texto histórico da ficha termina em 2022
   com Pe. Jesus Joaquim de Sousa como administrador, mas o campo "Pároco" diz Pe. Welison
   Magalhães Barbosa. Foi usado o campo estruturado.
10. **Adoração na Catedral** — o cartaz diz "Toda Quinta-Feira, início após a Missa das 07h15 até
    as 18h40". Como `MassSchedule` exige hora fixa, foi gravado `dayOfWeek 4 / 07:15 / ADORATION`
    com a regra literal em `notes` e confiança `media`. O início real é ao fim da missa.
11. **Telefones divergentes nos agregadores** — `horariodemissa.com.br` traz DDD 61 e números
    diferentes para Posse, Cavalcante, Iaciara, São Domingos, Mambaí e Alvorada do Norte. São
    registros antigos (a maioria das cidades mudou para DDD 62). Prevaleceu o site diocesano; a
    divergência está anotada no `notes` de cada paróquia afetada.

## Nota de coleta para o próximo agente

O site da Diocese de Formosa é o melhor padrão visto em GO até aqui: `wp-json` aberto, fichas com
CNPJ/CEP/e-mail institucional e lista nominal de capelas rurais com o povoado de cada uma. O que
falta é exclusivamente **horário de missa** — a diocese simplesmente não publica. Para fechar essa
lacuna seria preciso ir aos Instagram/Facebook das paróquias (todas as fichas linkam), um a um.
