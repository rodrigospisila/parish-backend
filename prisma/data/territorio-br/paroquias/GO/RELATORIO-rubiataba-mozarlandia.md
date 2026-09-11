# Relatório — Diocese de Rubiataba-Mozarlândia (GO)

Pesquisa em 2026-09-11. Arquivo: `rubiataba-mozarlandia.json`.

## Resumo

| Métrica | Valor |
|---|---|
| Entradas no arquivo | **16** (15 paróquias + 1 santuário `nao-paroquial`) |
| Paróquias que carregam | **15** — todas `alta` |
| Comunidades/capelas | **20** (16 matrizes + 4 capelas, todas `baixa`) |
| Horários fixos | **14**, **todos `baixa`** |
| Esperado (Annuario Pontificio 2023/2024) | 15 paróquias |
| Cobertura da lista | **100%** |

## Fontes principais

1. **`https://diocesederubiataba.com.br/paroquias/`** (WordPress + Elementor, página atualizada em
   **05/10/2025**) — a lista completa, com nome, cidade, endereço, CEP, telefone e pároco das 15
   paróquias, mais o Santuário Diocesano Mãe de Deus.
   - O site **não tem post-type de paróquia** e **não tem página por paróquia**: as 53 páginas do
     `wp-json/wp/v2/pages` incluem exatamente uma de paróquias. Toda a informação está nela.
2. **`/mapa-da-diocese/`** — 12 municípios em **4 foranias**, que permitiu atribuir `forania` a
   cada paróquia e identificar que Valdelândia e São José dos Bandeirantes são **distritos**.
3. **`/curia-diocesana/`** (03/2025) — endereço da Cúria (em **Mozarlândia**, não em Rubiataba),
   vigário-geral, chanceler, ecônomo, vigários forâneos.
4. **`catholic-hierarchy.org/diocese/drumo.html`** — 15 paróquias em 2022/2023, bispo
   **Dom Júlio César Gomes Moreira**, 26.697 km².
5. **`horariodemissa.com.br`** — único lugar com qualquer horário. As fichas trazem a data da
   última atualização, o que permitiu classificar corretamente.

## Estrutura da diocese

| Forania | Municípios | Paróquias |
|---|---|---|
| Nossa Senhora da Glória | Rubiataba (e distrito de Valdelândia), Nova América, Morro Agudo de Goiás | Catedral N. Sra. da Glória, Jesus Bom Pastor, N. Sra. de Fátima (Valdelândia), Santa Maria Mãe da Igreja, Imaculada Conceição (+ Santuário Mãe de Deus) |
| Nossa Senhora do Perpétuo Socorro | Mozarlândia, Nova Crixás (e distrito de São José dos Bandeirantes), Mundo Novo | Concatedral N. Sra. do Perpétuo Socorro, Santo Antônio de Pádua, São José, N. Sra. Aparecida |
| Nossa Senhora da Guia | Araguapaz, Aruanã, Faina, Matrinchã | N. Sra. da Guia, N. Sra. do Rosário, N. Sra. da Penha, Santa Luzia |
| Nossa Senhora da Conceição | Crixás, Uirapuru | N. Sra. da Conceição, Santa Rita de Cássia |

## Decisões tomadas

- **Santuário Diocesano Mãe de Deus (Rubiataba, zona rural)** — a própria página oficial o lista
  separado das paróquias e dá **"Reitor"** em vez de "Pároco". Marcado
  `status: "nao-paroquial"`; como **não publica horário**, não entra na carga (regra do README).
  Fica no dataset com proveniência para eventual reavaliação.
- **Valdelândia × Waldelândia** — a página de paróquias grafa "WALDELÂNDIA"; o Mapa Diocesano e o
  IBGE grafam **Valdelândia**, distrito de Rubiataba. Adotado `city: "Rubiataba"`,
  `neighborhood: "Distrito de Valdelândia"`.
- **São José dos Bandeirantes** é distrito de **Nova Crixás** (confirmado pelo Mapa Diocesano:
  "Nova Crixás (São José dos Bandeirantes)"). `city: "Nova Crixás"`.
- **"Morro Agudo"** → `city: "Morro Agudo de Goiás"` (nome IBGE do município).
- **Catedral e Concatedral** receberam os prefixos `Catedral …` e `Concatedral …` conforme a regra
  de nomes; os nomes na fonte são "Paróquia NOSSA SENHORA DA GLÓRIA - CATEDRAL" e
  "Paróquia NOSSA SENHORA DO PERPÉTUO SOCORRO - CONCATEDRAL".

## Horários — a diocese não publica nenhum

**Nenhuma das 15 paróquias publica grade de missa**, nem no site diocesano, nem em página própria
(só há Instagram para Catedral e Concatedral, e YouTube para a Concatedral). Todos os 14 horários
do dataset são `baixa`:

| Paróquia | Horários | Motivo do `baixa` |
|---|---|---|
| Catedral N. Sra. da Glória (Rubiataba) | 10 | Ficha de agregador que **diz** "dados atualizados pela última vez em **09/11/2016**" — anterior à pandemia, rebaixado pela regra do README |
| N. Sra. Aparecida (Mundo Novo) | 4 (2 missas + 2 confissões) | Fonte única de agregador, sem data de atualização |

A ficha de 2016 da Catedral ainda traz o pároco antigo ("Monsenhor Vanildo da Motta", hoje em Nova
Crixás), o que confirma que está velha — mas é a única evidência existente das **quatro
comunidades** da Catedral (São José/Rubiatabinha, Santa Mônica/Vila Esperança, N. Sra. do Perpétuo
Socorro/Aeroporto, N. Sra. Aparecida/Vila Operária), por isso foram registradas.

> **Atenção para o importador**: essas 4 comunidades e os horários que apontam para elas formam um
> pacote — ambos `baixa`. Se a carga aceitasse os horários sem as comunidades, eles cairiam na
> matriz e ficariam errados.

A ficha da **Concatedral** no mesmo agregador está parada desde **23/05/2013** e não tem nenhum
horário; foi usada só para registrar o telefone divergente.

## Precisa de validação humana

1. **Nenhuma comunidade oficial** — a diocese não publica capelas/comunidades de nenhuma paróquia.
   Numa diocese de 12 municípios e 26.697 km², há certamente dezenas de capelas rurais invisíveis
   neste dataset. É a maior lacuna.
2. **Telefone sem número** — Paróquia Nossa Senhora de Fátima (Valdelândia): a página oficial
   publica o campo como `Fone: (62)` e para aí. Gravado `null`; o agregador sugere
   **(62) 3325-1165**, não confirmado.
3. **DDD 61 em Goiás** — Paróquia São José (São José dos Bandeirantes) tem "Casa Paroquial
   **(61)** 98215-7897". A região é DDD 62. Confirmar.
4. **Paróquia sem pároco?** — Santa Maria Mãe da Igreja (Nova América) é a única cuja página
   oficial diz **"Vigário:"** em vez de "Pároco:". Pode estar em administração.
5. **Contradição entre duas páginas oficiais sobre vigários forâneos**:
   - `/mapa-da-diocese/` (01/2024): Glória→Pe. Bruno Miguel; Socorro→Pe. Lindemberg;
     Guia→Pe. Diomar; Conceição→Pe. Damião Avelino de Melo.
   - `/curia-diocesana/` (03/2025): Guia→Pe. Francisco Ricardo; Glória→Pe. Renato Oliveira;
     Socorro→Pe. Lindemberg; Conceição→Pe. Adalberto Júnior.
   Adotada a **página da Cúria** (mais recente), com a divergência anotada nas `notes`.
   **Pe. Damião Avelino de Melo não aparece em nenhuma paróquia da lista** — verificar se há
   paróquia faltando ou se ele foi transferido.
6. **Bispo** — Dom Júlio César Gomes Moreira, empossado em 2026 (catholic-hierarchy + Wikipédia).
   A página `/bispos/` do site ainda termina em **Dom Francisco Agamenilton Damascena
   (19/12/2020 – 02/08/2025)**; o site não foi atualizado com o novo bispo.
7. **Endereço/telefone divergentes em 8 paróquias** — o agregador traz rua, número e telefone
   diferentes para Catedral, Concatedral, Aruanã, Crixás, Faina, Matrinchã, Nova América,
   Nova Crixás e Uirapuru. Prevaleceu sempre o site diocesano (2025); a divergência está no
   `notes` de cada registro.
8. **Pe. Divino Eterno** aparece como pároco de N. Sra. de Fátima (Valdelândia) e, como
   "Pe. Divino Eterno Coimbra de Paula", como reitor do Santuário Mãe de Deus. Provavelmente a
   mesma pessoa acumulando os dois ofícios — confirmar.
