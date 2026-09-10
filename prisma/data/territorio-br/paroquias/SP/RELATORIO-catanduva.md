# Diocese de Catanduva (SP) — relatório de pesquisa

- **Arquivo**: `paroquias/SP/catanduva.json`
- **Data da coleta**: 2026-09-10
- **Resultado**: 34 paróquias (34 `alta`), 36 comunidades (34 `alta`, 2 `baixa`), 278 horários
  fixos (**todos `baixa`**) em 17 municípios.
- `validate.cjs` roda limpo para este arquivo.

## Fontes principais

| Fonte | Uso |
|---|---|
| https://diocesedecatanduva.com.br/paroquias/ | Lista oficial: 34 paróquias com município (categoria `local_paroquia`) |
| Página de cada paróquia (34 páginas) | Apenas nome e município — o restante renderiza vazio |
| https://www.catholic-hierarchy.org/diocese/dcatn.html | 34 paróquias, criação em 09/02/2000, sufragânea de São José do Rio Preto |
| https://pt.wikipedia.org/wiki/Diocese_de_Catanduva | Bispo Dom José Benedito Cardoso (2024), 17 municípios, 4 setores |
| https://www.horariodemissa.com.br/ (busca por município) | Endereço, bairro, telefone e horários de missa/confissão |

## Limitação central do portal diocesano

O site é Elementor + ACF: as páginas de paróquia têm os blocos "História da Paróquia", "Clero" e
"Horários de Missas", mas **todos renderizam vazios** — o repetidor de horários sai como
`<table class="dce-acf-repeater-table"><thead></thead></table>` em **todas** as 34 páginas, o
bloco de clero devolve "Nenhum resultado encontrado" e o `content` da API REST é string vazia.
A página `/horarios-de-missas/` traz somente o filtro por município (JetSmartFilters), sem dados,
e filtrar por `?local_paroquia=<id>` não muda nada. O CPT `clero` (43 registros) lista os padres
com a função ("Pároco", "Administrador Paroquial") **sem indicar a paróquia**.

Consequência: **nome e município das 34 paróquias são `alta`** (fonte oficial), mas endereço,
telefone e horários vieram de **horariodemissa.com.br**, fonte única não oficial e sem carimbo de
atualização — logo os horários e as 2 comunidades derivadas dela ficam `baixa` e **não entram no
sistema** até a validação.

## Cobertura

- **34 encontradas** × **34 esperadas** (catholic-hierarchy). A Wikipédia fala em 33; a lista
  oficial tem 34, incluindo a **Sé Catedral Nossa Senhora Aparecida** (gravada como
  "Catedral Nossa Senhora Aparecida").
- Enriquecidas pelo agregador: 31/34 com endereço, bairro e telefone; 5 com site próprio.
- **3 paróquias sem nenhum horário**: São Benedito (Catanduva), São Sebastião (Catiguá) e
  Imaculada Conceição (Elisiário).
- Municípios cobertos: Ariranha, Catanduva, Catiguá, Elisiário, Ibirá, Irapuã, Itajobi,
  Marapoama, Novais, Novo Horizonte, Palmares Paulista, Paraíso, Pindorama, Sales, Santa Adélia,
  Tabapuã e Urupês.

## Decisões de normalização

- Os títulos do site não trazem o prefixo ("Nossa Senhora de Fátima – Catanduva/SP"); foi
  acrescentado "Paróquia " conforme a regra do dataset, e "Sé Catedral …" virou "Catedral …".
- **"São João Batista – Vila Roberto/SP"**: Vila Roberto é o distrito de **Roberto**, no município
  de **Pindorama** (confirmado na Wikipédia). `city` = Pindorama, `neighborhood` =
  "Roberto (Vila Roberto)".
- **"Santa Adélia"** (sem cidade no título) teve o município recuperado pela taxonomia
  `local_paroquia`; a paróquia ficou "Paróquia Santa Adélia" em Santa Adélia.
- Pareamentos aproximados com o agregador (abreviações e grafias diferentes), todos conferidos
  um a um:
  - "São Domingos de Gusmão" ~ "São Domingos" (Catanduva)
  - "São Francisco de Assis" ~ "São Francisco" (Catanduva)
  - "Santo Antônio de Pádua" ~ "Santo Antônio" (Catanduva)
  - "Santa Teresinha do Menino Jesus" ~ "Santa **Terezinha** do Menino Jesus" (Catanduva)
  - "Santo Antônio Pádua" ~ "Santo Antônio" (Pindorama)
  - "São Sebastião" ~ "**Pároquia** São Sebastião - SP" (Ibirá, com erro de digitação na origem)
  - "Santa Izabel" ~ "Santa **Isabel** e São Sebastião" (Catiguá)
- Faixas de confissão ("08:00 às 11:00") entraram como um horário no início da faixa, com o texto
  completo em `notes`.

## Pontos para o enxame de validação

1. **Todos os 278 horários são `baixa`** e não sobem para produção. É a circunscrição com o pior
   lastro das quatro — vale procurar as redes sociais das paróquias ou pedir a listagem à cúria.
2. **"Paróquia Santa Isabel e São Sebastião – Catiguá"** no agregador parece **fundir as duas
   paróquias** que a diocese lista separadamente em Catiguá (Santa Izabel e São Sebastião). Os
   horários foram atribuídos a Santa Izabel; São Sebastião ficou sem horário. Revisar.
3. **"Capela Particular de Santa Bakhita – Ibirá"** existe no agregador e **não** foi incluída:
   é capela particular, não paróquia nem comunidade paroquial listada oficialmente.
4. As duas comunidades `baixa` da Catedral ("Capela São Bento" e "Capela Colegião") vêm só do
   agregador — confirmar se são comunidades da catedral.
5. **E-mail da cúria não pôde ser lido**: o rodapé usa o ofuscador do Cloudflare e a string
   decodifica para `diocesedecatanduva@org.br`, claramente truncada. O provável é
   `curia@diocesedecatanduva.org.br`, mas ficou `null` por não haver confirmação.
6. Nenhuma paróquia tem **CEP, e-mail, pároco ou ano de fundação** — a diocese não publica.
7. Conferir se a diocese tem 33 ou 34 paróquias (Wikipédia × site × catholic-hierarchy).
