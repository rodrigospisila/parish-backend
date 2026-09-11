# Relatório — Diocese de Uruaçu (GO)

Pesquisa em 2026-09-11. Arquivo: `uruacu.json`.

## Resumo

| Métrica | Valor |
|---|---|
| Entradas no arquivo | **36** (35 paróquias + 1 santuário `nao-paroquial`) |
| Paróquias que carregam | **35** — todas `alta` |
| Municípios cobertos | **27** |
| Comunidades/capelas | **351** (36 matrizes + 315 capelas/comunidades), todas `alta` |
| Horários fixos | **131** — **90 `alta`**, 41 `baixa` |
| Esperado (Annuario Pontificio 2021) | 35 paróquias |
| Cobertura da lista | **100%** |

**É a melhor das quatro dioceses desta rodada em horários**: 8 paróquias publicam a grade
completa, com missa por comunidade, no site oficial, atualizada entre 08/2025 e 06/2026.

## Fontes principais

Tudo veio do site oficial **`https://diocesedeuruacu.com.br`** (WordPress).

- **Truque que resolveu a diocese**: as fichas são *posts* na categoria `paroquias` (id 15), e as
  **5 foranias são subcategorias** (ids 18–22). Uma única chamada
  `GET /wp-json/wp/v2/posts?categories=15&per_page=100&_fields=...,categories` devolveu os 36 posts
  **já com a forania de cada um**, e a contagem das subcategorias (8+7+8+6+7 = 36) bateu exatamente
  com a distribuição obtida. Os `modified` mostram que 15 fichas foram atualizadas em 2026.
- Cada ficha traz: cidade + forania na primeira linha, pároco e vigários, endereço, CEP, telefone,
  e-mail, **lista separada de "Capelas Urbanas" e "Capelas Rurais"** com o padroeiro e a
  localidade, data de criação canônica, data de dedicação da matriz e o histórico completo de
  párocos.
- `catholic-hierarchy.org/diocese/durua.html` — bispo **Dom Giovani Carlos Caldas Barroca**,
  emérito Dom José da Silva Chaves, erigida 26/03/1956, 36.224 km², 35 paróquias em 2020.
- Home do site — endereço e telefone da Cúria, "36 paróquias em 27 cidades".

## O enigma do 36 × 35, resolvido

O site diz **36 paróquias**; o Annuario Pontificio diz **35**. A diferença é o **Santuário
Diocesano Nossa Senhora d'Abadia do Muquém** (Niquelândia): a ficha diz **"Reitor"**, não
"Pároco". São **35 paróquias + 1 santuário**. Marcado `status: "nao-paroquial"`.

> **Ponto para validação humana**: pela regra do README (igreja não paroquial sem horário publicado
> fica de fora), o Muquém não carrega. Mas ele **tem 6 capelas rurais sob seus cuidados**, ou seja,
> exerce cura pastoral de território, e é meta de peregrinação desde **1748**. Vale reavaliar se
> não deveria entrar como quase-paróquia.

Note que as outras duas jurisdições com "santuário" no nome **são paróquias** e carregam normalmente:
**Paróquia Santuário São José** (Niquelândia, "Pároco e Reitor") e **Paróquia e Santuário Nossa
Senhora da Penha** (Guarinos, "Pároco e Reitor").

## Horários

### As 8 paróquias que publicam grade (fonte oficial, `alta`)

| Paróquia | Cidade | Horários | Ficha atualizada |
|---|---|---|---|
| São Sebastião | Uruaçu | 27 (inclui 5 de confissão) | 01/02/2026 |
| Nossa Senhora da Abadia | Barro Alto | 21 | 01/02/2026 |
| Sagrada Família | Goianésia | 21 | 06/11/2025 |
| Nossa Senhora Aparecida | Minaçu | 21 | 31/05/2026 |
| Nossa Senhora da Guia | Campinorte | 15 | 06/11/2025 |
| Nossa Senhora d'Abadia | Campinaçu | 12 | 31/05/2026 |
| Santa Isabel | Santa Isabel | 8 | 03/08/2025 |
| Santa Tereza | Santa Tereza de Goiás | 6 | 30/06/2026 |

Tipos: 120 MASS, 5 CONFESSION, 4 ROSARY, 2 ADORATION.

### Os 41 registros `baixa` — quase todos recorrência mensal

**39 dos 41 `baixa` são missa de recorrência mensal**, com a regra literal preservada em `notes`
("1º e 3º Sábado às 17h", "2ª e 4ª Quinta-Feira do mês às 19h", "4º Sábado dos meses ímpares às
10h", "Sexta-Feira (2 e 3) às 19h"…). **É a norma, não a exceção**, exatamente como o README
descreve para o Jequitinhonha e o oeste paulista:

- **Nossa Senhora da Guia (Campinorte)**: **9 das 11 comunidades** só têm missa mensal. A matriz e
  Colinaçu são as únicas com missa semanal.
- **Nossa Senhora Aparecida (Minaçu)**: 9 das 13 capelas rurais, com regras que combinam
  ordinal + paridade do mês ("1º sábado dos meses ímpares", "4º Sábado dos meses pares").
- **Nossa Senhora d'Abadia (Campinaçu)**: todas as 5 capelas.

Se o Parish for exibir esses horários, precisa da modelagem de recorrência mensal — nesta diocese
é o que separa 90 horários carregáveis de 131 reais.

### Não convertidos, por decisão consciente

- **Grupos de oração / RCC / grupos de jovens / "Grupo de Adolescentes Éfeta"** — não são
  MASS/CONFESSION/ADORATION/ROSARY. Anotados nos `notes` da paróquia.
- **"Atendimento dos Padres"** genérico (Barro Alto, Minaçu, Campinaçu, Sagrada Família) — a fonte
  não diz "confissão", então **não** virou CONFESSION. Só a Paróquia São Sebastião de Uruaçu diz
  explicitamente "Confissões", e por isso é a única com 5 registros CONFESSION.
- **Registros sem dia ou sem hora utilizável**, todos em Minaçu: "São Lucas – Noite Negra: Primeiro
  sábado dos meses ímpares" (sem hora); "Santa Teresinha – Trevo: 2ª Sexta-Feira do Mês" (sem
  hora); "São Sebastião – Rajado: Oração do Ofício de Nossa Senhora às 19h e às 19h30 celebração da
  palavra" (sem dia da semana). Ficaram documentados nos `notes` da paróquia.
- **Celebração da Palavra** (Minaçu, Pela Ema, domingo 13h) — não é missa.

### Três fichas com cabeçalho de horário vazio

**Santa Terezinha** (Santa Terezinha de Goiás), **Santo Antônio Maria Claret** (Hidrolina) e
**São João Maria Vianney** (Formoso) têm a seção *"Horários de Missa e Atendimento"* no HTML mas
**sem nada abaixo dela** — a paróquia abriu o campo e não preencheu. Vale uma segunda passada no
futuro, porque elas provavelmente vão preencher.

## Comunidades homônimas — desambiguação aplicada

Numa diocese rural, o mesmo padroeiro se repete várias vezes dentro da mesma paróquia (a Paróquia
Nossa Senhora d'Abadia de Niquelândia tem **três** "Capela São Sebastião"). Como o importador
identifica a comunidade pelo nome, elas colidiriam. **Sempre que houve colisão dentro da mesma
paróquia, o local foi acrescentado ao `name`** (ex.: `Capela São Sebastião – Rajado`), mantendo o
`neighborhood` intacto. Isso foi aplicado a 17 paróquias desta diocese; os horários que apontavam
para os nomes ambíguos foram remapeados para os nomes desambiguados (validado: **0 órfãos**).

## Precisa de validação humana

1. **Nome do pároco com resíduo de digitação** — Campinaçu: a ficha diz
   *"Pe. Eguimar Matias dos Santos**les**"*. Gravado como **Pe. Eguimar Matias dos Santos**.
2. **CEP inválido** — Nova Iguaçu de Goiás: a ficha publica **"764950-000"** (8 dígitos antes do
   hífen). O correto é provavelmente 76495-000. Gravado `null` para não inventar.
3. **Endereço com resíduo de edição** — Santuário do Muquém: *"Praça da MatrRodovia da Fé, GO 237 –
   Km 45"*. Gravado como "Rodovia da Fé, GO-237, Km 45".
4. **Telefone com 8 dígitos** — Rianápolis: **(62) 9919-2040**, identificado como WhatsApp mas com
   um dígito a menos. Gravado como publicado.
5. **Paróquia sem telefone** — Santo Antônio de Pádua (Trombas) é a única sem telefone na ficha.
   Alto Horizonte é a única sem e-mail.
6. **Duas fichas com "Histórico" vazio** — Sagrado Coração de Jesus (Goianésia) e Santo Antônio de
   Pádua (Mara Rosa) não têm data de criação. `foundedYear: null`.
7. **Título duplicado no CMS** — o post de Amaralina se chama *"Paróquia de Paróquia São João
   Batista"*. Nome corrigido para "Paróquia São João Batista".
8. **Erro de dado na ficha de Minaçu** — a capela São Sebastião de Beira Rio/Mucambão repete o
   endereço e o horário de rosário da capela Nossa Senhora de Fátima da Vila União
   ("Rua 20 nº 325 – Vila União"). Copy-paste na fonte; o endereço não foi aproveitado.
9. **Capelas em município vizinho** — São Luiz Gonzaga (São Luiz do Norte) atende a Capela São
   Vicente de Paulo na Fazenda São Vicente, **em Pilar de Goiás**; Santo Antônio Maria Claret
   (Hidrolina) atende Taquaruçu, **em Pilar de Goiás**. É o que a fonte oficial diz.
10. **Capelas registradas como "sem atividade"** — São Francisco de Assis de Capim Puba (Santuário
    São José, Niquelândia) e São José Operário (Trombas). Mantidas na lista, como publicado.
11. **Comunidades com padroeiro "não definido"** — 7 em Itapaci e 1 em Minaçu/N. Sra. das Graças.
    Registradas como "Comunidade <local>".
12. **Comunidade sem local fixo** — Santa Tereza de Goiás, comunidade Nossa Senhora de Fátima:
    *"Sem local fixo, as missas acontecem nas casas"*. O horário (quinta 19h30) entrou assim mesmo,
    com o aviso em `notes`.
13. **Duas paróquias com data de criação 10/01/1755** — Santuário São José (Niquelândia) e
    Nossa Senhora do Pilar (Pilar de Goiás). Plausível (criação conjunta no período colonial), mas
    convém conferir.
14. **Ficha mais desatualizada**: São Sebastião (Alto Horizonte), modificada em 30/09/2024 — a
    única anterior a 2025.
15. **Capela com nome quebrado na fonte** — São Francisco de Assis (Niquelândia) grafa
    *"Nossa Se-nhora do Rosário"* com hífen de quebra de linha. Corrigido.
