# Relatório — Diocese de Macapá (AP)

Pesquisa: 2026-09-18. Arquivo: `paroquias/AP/macapa.json`.
**Esta circunscrição fecha o estado do Amapá** (a Diocese de Macapá cobre os 16 municípios do AP,
mais ilhas do Pará próximas).

## Resultado

| Métrica | Valor |
|---|---|
| Entradas de paróquia | **41** (32 paróquias + 8 áreas missionárias + 1 igreja não paroquial) |
| Confiança das entradas | 40 `alta`, 1 `baixa` (o convento) |
| Comunidades/capelas | 52 |
| Horários fixos | 104 — 31 `alta`, 10 `media`, 63 `baixa` |
| Cobertura | 40/40 declaradas pela diocese (100%) |

## Fontes principais

1. **Site oficial — `diocesedemacapa.com.br`** (WordPress 7.1.1 + Elementor). A REST
   (`/wp-json/wp/v2/pages?per_page=100`) devolveu 136 páginas com `modified` por ficha:
   - `/paroquias-e-areas-missionarias/` — **modificada em 14/04/2026**, é a lista canônica:
     "A Diocese de Macapá é composta atualmente por 32 Paróquias e 8 Áreas Missionárias",
     numeradas por Vicariato 1 a 10 (o Vicariato 10, "Quilombos", aparece sem nenhuma paróquia).
   - 24 páginas individuais de paróquia, quase todas paradas em **25–30/05/2022**.
2. **Anuário Diocesano 2025** — PDF de 44 páginas em
   `wp-content/uploads/2026/01/Anuario-2025.pdf`, publicado em jan/2026, com a nota
   "Os dados foram atualizados de acordo com o levantamento realizado pela secretaria da Cúria
   Diocesana finalizado em 28.02.2025". **Foi a fonte mais rica**: endereço, CEP, telefone, e-mail,
   pároco, vigários, diáconos, horário de secretaria e algumas comunidades de 29 paróquias.
3. **Receita Federal via `minhareceita.org`** — CNPJ 07.814.217 (Mitra Diocesana de Macapá):
   **42 filiais ativas (0001 a 0042)**; 0043 a 0060 retornam 404. Prova de completude.
   Composição: 1 sede, 1 Centro Diocesano, 2 seminários (São Pio X em Macapá e São José em
   Ananindeua/PA), 31 paróquias e 7 áreas missionárias.
4. `liriocatolico.com.br/horario_missa/dados/uf/AP.json` — 14 fichas do estado inteiro.
5. `buscamissa.com.br` — só 2 fichas de Macapá.
6. Instagram: `@paroquiansconceicao_mcp` (com grade na bio), `@jesusbomsamaritanoap`,
   `@santuarionsrafatimaoficial`, `@perpetuosocorro.macapa`, `@paroquiafatimaesantaana`,
   `@catedralsaojoseap`, `@diocesedemacapa`.

## Cotejo das três listas

| Fonte | Data | Paróquias |
|---|---|---|
| Site diocesano | 14/04/2026 | 32 + 8 áreas missionárias |
| Receita Federal | consulta de 18/09/2026 | 31 + 7 áreas missionárias |
| Anuário Diocesano | levantamento de 28/02/2025 | 29 ("dividida em 29 paróquias … reunidas em 6 vicariatos") |

As diferenças são desmembramentos recentes e todas estão anotadas em `notes` na paróquia:
- **Paróquia São Pedro Apóstolo (Pedra Branca do Amapari)** — só no site de 2026. O Anuário 2025
  tratava Serra do Navio e Pedra Branca como uma paróquia só (Santa Bárbara), com secretaria na
  Rua da Paz, 601 – Pedra Branca. Ainda **sem filial no CNPJ** e sem endereço confirmado.
- **Paróquia Nossa Senhora da Imaculada Conceição (Ferreira Gomes)** — desmembrada de
  N. Sra. do Brasil Aparecida (Porto Grande); já tem CNPJ (0041).
- **Paróquia Nossa Senhora da Conceição (Calçoene)** — o Anuário ainda a chamava de Área
  Missionária; site e Receita já a registram como paróquia.
- **Área Missionária Santa Cristina** (Residencial Miracema) — só no site; sem CNPJ próprio.
- **Área Missionária Cristo Rei** (Santana) — consta da lista das 8 áreas e tem CNPJ (0040),
  mas não aparece na numeração por vicariato do site.

## Horários — situação real

A diocese **não publica grade de missas**. A página `/horarios-de-missas/` (modificada em
25/11/2022) é só um índice de 16 municípios, e todas as 16 páginas de cidade
(`/macapa/`, `/santana/`, …, modificadas em **31/03/2018**) estão **vazias** — tanto no HTML
renderizado quanto na REST. Nas fichas de paróquia, o bloco "Celebrações" do Elementor está
preenchido com o **placeholder `test / test`** em 22 das 24 fichas (mesma armadilha de CMS
descrita no README).

Só duas fichas têm grade de verdade:
- `/jesusbomsamaritano/` (modificada em **30/03/2026**, Instagram ativo em 16/09/2026) — matriz e
  5 capelas → 11 horários `alta`.
- `/saojose/` (modificada em 30/05/2022, pós-pandemia) — Catedral, Igreja São José e Igreja Santo
  Antônio → 10 horários `media`, corroborados pela ficha "Confirmado" do BuscaMissa.

Somam-se:
- **`alta`**: Paróquia N. Sra. da Conceição (Macapá), 15 horários da bio do Instagram oficial
  (@paroquiansconceicao_mcp, posts até 21/08/2026); e as comunidades Santíssima Trindade e
  São Francisco de Assis do Santuário de Fátima, cujos horários o **Anuário 2025** publica
  ("Terça e quinta – às 19h e domingo às 9h"; "quinta-feira – às 19h e Domingo às 9h").
- **`baixa`**: 63 horários que vêm **só do `liriocatolico`**. Pela regra do README, o
  `ultima_atualizacao` de 02/09/2026 é a data de regeneração da base (idêntica nas 14 fichas do
  estado) e não serve de conferência; e não há segunda fonte atual para cruzar. Atinge Santa Cruz,
  Jesus de Nazaré, N. Sra. de Nazaré, Santuário do Perpétuo Socorro (Macapá), São João Batista
  Piamarta, N. Sra. das Graças (Oiapoque), a Comunidade Cristo Redentor e o convento.

O `horariodemissa.com.br` não tem página de estado para o AP e a ficha que existe
(`igreja.php?k=YW1wD`, Paróquia N. Sra. de Fátima) é de **15/05/2013** e sem nenhum horário —
descartada pela regra pré-pandemia.

## Precisa de validação humana

1. **Paróquia São Pedro Apóstolo (Pedra Branca do Amapari)** — sem endereço, telefone, e-mail ou
   pároco. Único registro do arquivo com tudo nulo além do nome/cidade.
2. **CEP da Paróquia N. Sra. do Perpétuo Socorro (Santana)** — deixado `null`. O Anuário 2025
   imprime 68900-130, que é CEP de Macapá; a Receita registra "Rua Felinto Müller, 1717 – Centro,
   CEP 68925-001"; um terceiro registro público dá "Rua Cláudio Lúcio Monteiro, 1717, Remédios,
   68927-003".
3. **Endereço do Santuário N. Sra. de Fátima (Macapá)** — Anuário: Av. Almirante Barroso, 1363 –
   Santa Rita. Bio do Instagram oficial (set/2026): Av. Cora de Carvalho – Santa Rita.
4. **Área Missionária N. Sra. Aparecida (Pacoval)** — a razão social na Receita é "Área Missionária
   Nossa Senhora da Conceição Apar…" (truncada). Confirmar se é "Aparecida" ou "Conceição
   Aparecida". Há também uma **Comunidade Nossa Senhora Aparecida** na Paróquia São Benedito —
   verificar se não é a mesma igreja.
5. **Paróquia São Pedro (Vitória do Jari)** — a Receita ainda a registra como *Quase-Paróquia*.
6. **63 horários `baixa`** do `liriocatolico` — precisam de conferência por telefone ou rede social.
7. **Três igrejas do `liriocatolico` que não consegui atribuir a nenhuma paróquia** e por isso
   **não** entraram no JSON:
   - Igreja Nossa Senhora do Bom Remédio — Rua Oséas de Oliveira Pimentel, 1331, Renascer 1,
     Macapá (dom 07:30; ter 19:00; confissão ter 08:00; adoração qui 18:00).
   - Igreja Santa Maria e São João Evangelista — Rodovia Duca Serra, 2715, Macapá
     (dom 08:00; ter 19:00) — provavelmente da Paróquia São João Batista Piamarta, cuja casa
     paroquial fica na mesma rodovia, mas não há confirmação.
   - Igreja São João Paulo II — Av. dos Ipês, 448, Ipê, Macapá (sáb 19:00; adoração qui 19:00) —
     **não** é a Paróquia São João Paulo II, que fica em Tartarugalzinho.
8. **Comunidades ribeirinhas**: a Paróquia N. Sra. dos Navegantes ("Ilhas") e o Santuário do
   Perpétuo Socorro têm diáconos designados para o arquipélago do **Bailique** e para a beira do
   rio Amazonas, mas nenhuma fonte pública nomeia essas comunidades. Provavelmente é o maior
   buraco de cobertura do arquivo.
9. **Convento dos Frades Capuchinhos** (Av. FAB, 2851 – Santa Rita, Macapá): entrou com
   `status: "nao-paroquial"` + `loadAsParish: true` porque a fonte publica missa diária, mas a
   única fonte é o `liriocatolico` → confiança `baixa`. Confirmar se a igreja é aberta ao público.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

Registro atual: `address: "Curia Diocesana, Rua Sao Jose 1790"`, `zipCode: "68900-902"`,
`phone: "(96) 3222-0426"`, `email: null`, `website: "https://www.diocesedemacapa.com.br"`,
`bishopName: "Dom Antônio de Assis Ribeiro, S.D.B."`, `foundedYear: 1949`.

- **`zipCode`**: a Receita dá **68900-110** para a sede (CNPJ 07.814.217/0001-84, Rua São José,
  1790, Central). O 68900-902 registrado é CEP de caixa postal/grande usuário. Sugiro 68900-110.
- **`phone`**: a Receita registra **(96) 3223-1690** para a sede; o (96) 3222-0426 publicado pelo
  Anuário também é da Cúria (aparece como contato da secretaria provisória da Paróquia Cristo
  Libertador). Os dois estão corretos; vale guardar os dois.
- Website, bispo, cidade, UF, regional (Norte 2), província (Belém do Pará) e `foundedYear` 1949
  conferem — o Anuário confirma a bula *Unius Apostolicae Sedis*, de 01/02/1949 (prelazia), elevada
  a diocese em 14/11/1980.
- `email` continua `null`: a diocese não publica e-mail institucional em nenhuma página.

## Observação de segurança

O site diocesano tem **páginas de spam SEO injetadas** (p. ex. `/interesnuy-syzet-v-azartnuh-igrah-v-igrovom-clube-vavada/`
e `/mobile-gambling-apps-are-subjugating-australias-video-gambling-market/`, ambas de nov–dez/2022,
em bielorrusso e inglês, sobre cassino). O domínio continua sendo o oficial e o conteúdo católico
está intacto, mas a instalação WordPress parece comprometida desde 2022.
