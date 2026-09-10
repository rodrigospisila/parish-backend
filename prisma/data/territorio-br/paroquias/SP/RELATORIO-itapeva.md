# Relatório de pesquisa — Diocese de Itapeva (SP)

- **Arquivo gerado:** `paroquias/SP/itapeva.json`
- **Data da pesquisa:** 2026-09-10
- **Agente:** enxame de pesquisa do território (`PROMPT-pesquisa.md`)

## Resumo

| Métrica | Valor |
|---|---|
| Entradas de paróquia | **37** (37 alta) — 34 paróquias + **3 áreas pastorais** |
| Comunidades / capelas | **37** (só as matrizes — o site não publica comunidades) |
| Horários fixos | **155** (50 alta / 96 media / 9 baixa) |
| Cobertura | **37 / 28** (esperado desatualizado — ver abaixo) |

Tipos de horário: 59 `MASS`, 96 `CONFESSION`.

Municípios cobertos (22): Itapeva (9), Capão Bonito (4), Apiaí (2), Guapiara (2),
Itararé (2), Ribeirão Branco (2), e 1 cada em Barra do Chapéu, Barão de Antonina,
Bom Sucesso de Itararé, Buri, Coronel Macedo, Itaberá, Itapirapuã Paulista, Itaporanga,
Itaí, Itaóca, Nova Campina, Ribeira, Ribeirão Grande, Riversul, Taquarituba e Taquarivaí.

Preenchimento: telefone 33/37, e-mail 33/37, endereço 31/37, bairro 28/37, CEP 6/37,
pároco 27/37, ano de criação 11/37.

## Fontes principais

| Fonte | Uso |
|---|---|
| `https://dioceseitapeva.com.br/paroquias/` | listagem canônica |
| `…/wp-json/wp/v2/paroquia?per_page=100` | índice completo: 37 registros com título, slug, link e taxonomia |
| `…/wp-json/wp/v2/local_paroquia?per_page=100` | taxonomia `local_paroquia`: 22 municípios + 5 foranias (Centro 12, Leste 8, Sul 7, Oeste 6, Norte 4) — usada para confirmar a cidade de cada paróquia |
| `…/paroquia/<slug>/` | ano, telefone, e-mail, endereço, expediente da secretaria, horários de confissão, sacerdotes |
| `…/horarios-de-missas/` | tabela oficial Tipo / Dia da Semana / Horário / Observações, uma por paróquia — **única fonte dos horários de missa** |
| `…/contato/` | Cúria: Rua Coronel Crescêncio, 311, Centro, CEP 18400-140, Itapeva – SP |
| `…/bispo-diocesano/` | Dom Eduardo Malaspina, eleito em 28/12/2022, posse em 11/02/2023 |
| `https://catholic-hierarchy.org/diocese/ditpv.html` | esperado: 28 paróquias (2023); erigida em 02/03/1968; sufragânea de Sorocaba |
| `https://gcatholic.org/dioceses/diocese/itap1` | corroboração do bispo e da catedral (Sant’Ana, Itapeva) |

**Nota de acesso:** o domínio devolve **HTTP 403 a leitores automáticos**. A coleta usou
`curl` com User-Agent de navegador. E-mails ofuscados pelo Cloudflare foram decodificados.

## Cobertura

O site publica **37 registros** contra **28 paróquias** no catholic-hierarchy (dado de
**2023**). A diferença se explica por dois fatores:

1. **3 dos 37 registros são ÁREAS PASTORAIS, não paróquias canônicas** — a diocese as lista
   junto das paróquias na mesma listagem e no mesmo custom post type:

   | Entrada | Local |
   |---|---|
   | Área Pastoral Nossa Senhora Aparecida e São Pedro | Distrito Alto da Brancal, Itapeva |
   | Área Pastoral Sant’Ana | Distrito do Guarizinho, Itapeva |
   | Área Pastoral São Roque | Distrito da Areia Branca, Itapeva |

   Foram **mantidas no dataset** (têm igreja, pároco/administrador e, em um caso, endereço
   e contato próprios) mas com o prefixo **"Área Pastoral"** no `name`, para o enxame de
   validação decidir se entram no banco como paróquia, quase-paróquia ou comunidade da
   paróquia-mãe. **Nenhuma das três tem horário de missa publicado**; só a
   Sant’Ana/Guarizinho tem algo (2 horários de confissão).

2. Restam **34 paróquias** contra 28 esperadas — compatível com criações posteriores a 2023
   (há registros datados de 2016, 2019 e 2025 no próprio site).

## Pontos para o enxame de validação

### 1. `communities` traz só a matriz — o site não publica capelas

**Nenhuma** das 37 fichas lista comunidades ou capelas; a palavra "Comunidade" aparece
apenas em notícias. Conforme a regra 3 do prompt, cada paróquia ficou com uma única
comunidade `isMatriz: true`, e o importador cria a igreja-matriz. **Esta é a maior lacuna
desta diocese** — é a única das três circunscrições desta rodada sem lista de capelas.
Sugestão para a validação: redes sociais das paróquias e o Anuário Católico.

### 2. Confissões gravadas como `media` (96 registros) — modelo perde o intervalo

O site publica confissão em **intervalos** ("Terça-feira: 09h às 11h; 19h30 às 21h30"),
mas `MassSchedule` guarda um instante. Cada intervalo virou um `CONFESSION` com o **horário
de início**, e o texto integral da linha ficou em `notes` (ex.: `"Confissões: Terça-feira:
09h às 11h; 19h30 às 21h30"`). Marcados `media` justamente porque a informação foi
comprimida — a fonte é oficial e atual, o dado é que não cabe inteiro no modelo. Se o
Parish passar a exibir intervalos, estes 96 registros devem ser reprocessados.

### 3. Vinte e quatro das 37 entradas não têm horário de missa publicado

A tabela de `…/horarios-de-missas/` existe para todas as 37, mas **está vazia em 24**. Só 13
têm grade de missa: Catedral Sant’Ana, Nossa Senhora Aparecida (Itapeva), Nossa Senhora da
Piedade (Itapeva), São Camilo de Léllis (Itapeva), São Roque (Itapeva), São Roque
(Taquarituba), Nossa Senhora da Conceição (Itaberá), Nossa Senhora Aparecida (Capão Bonito),
Nossa Senhora da Conceição (Capão Bonito), Santa Terezinha do Menino Jesus (Barão de
Antonina), Imaculada Conceição (Itaóca), Imaculada Conceição – Distrito do Lageado (Apiaí) e
Divino Espírito Santo (Itararé).

**Cinco entradas ficaram sem nenhum horário** (nem missa nem confissão): São Cristóvão
(Capão Bonito), Sant’Ana (Itapirapuã Paulista), Nossa Senhora da Conceição (Itararé) e as
áreas pastorais Nossa Senhora Aparecida e São Pedro e São Roque (ambas Itapeva).

### 4. Três horários descartados

- **Divino Espírito Santo (Itararé):** 2 linhas de missa com dia **e** hora vazios na origem.
- **Nossa Senhora Aparecida (Itapeva):** "Todo dia 12 do mês, 20h — Missa Votiva de Nossa
  Senhora Aparecida" — recorrência por dia do mês, sem dia da semana, não cabe no modelo.

### 5. Missas mensais — 9 registros `baixa`

"1ª Sexta do mês", "Primeira sexta-feira do Mês", "1ª Quarta-feira do Mês" foram gravadas com
o `dayOfWeek` correto, `confidence: baixa` e `notes` iniciando por **"Recorrência mensal"**.
Mesmo bloco de decisão de produto pendente descrito no README.

### 6. Uma "Celebração da Palavra" gravada como MASS

A Paróquia Nossa Senhora da Conceição (Capão Bonito) publica, além das missas, uma
**"Celebração da Palavra"** aos domingos (09h e 19h). Não existe tipo correspondente no
schema; ficou como `MASS` com `notes: "Celebração da Palavra"` e `confidence: baixa`.
**Não é missa** — decidir na validação se entra, se vira outro tipo ou se sai.

### 7. Ano de criação: 11 registros, aparentemente confiáveis

Diferente do site de Itapetininga, aqui os anos são variados e plausíveis (1855 Itaporanga,
1922 Buri, 1963 Guapiara, 1964 Taquarituba, 1966 Barão de Antonina, 1980 Catedral, 1983 São
Roque/Itapeva, 2012 Capão Bonito, 2016 Bom Sucesso de Itararé, 2019 Itaóca, 2025 Distrito do
Lageado). Foram todos aceitos. Os outros 26 não publicam o ano → `null`.

### 8. Lacunas de contato

- **Sem telefone (4):** São Cristóvão (Capão Bonito), Nossa Senhora da Conceição (Itararé) e
  as áreas pastorais Nossa Senhora Aparecida e São Pedro e São Roque.
- **Sem e-mail (4):** Imaculada Conceição – Distrito do Lageado (Apiaí), Nossa Senhora da
  Conceição (Itararé) e as duas mesmas áreas pastorais.
- **Sem endereço (6):** Santa Terezinha do Menino Jesus (Barão de Antonina), Santuário Nossa
  Senhora D’Ajuda (Guapiara), Nossa Senhora da Conceição (Itararé), Imaculada Conceição
  (Itaóca) e as áreas pastorais Nossa Senhora Aparecida e São Pedro e São Roque.
- **CEP em só 6 de 37:** o site raramente inclui CEP no campo de endereço.
- **Sem pároco (10):** Santuário Nossa Senhora D’Ajuda (Guapiara), Nossa Senhora Aparecida e
  Santo Antônio (Itapeva), as 3 áreas pastorais, Nossa Senhora da Conceição (Itararé), Santo
  Antônio (Itaí), Nossa Senhora Aparecida (Nova Campina) e Bom Jesus (Ribeirão Grande). Em
  vários casos o rótulo "Pároco:" existe na página, mas sem nome.

### 9. Detalhes de transcrição

- O endereço da **Catedral Sant’Ana** vem escrito como *"Praça anchieta, 123"* (minúscula) na
  origem; mantido literal.
- Alguns nomes de sacerdote vêm sem o tratamento "Pe." (ex.: *"Edson Aparecido de Sene
  Queiroz"* na Imaculada Conceição de Itaóca). Mantidos como publicados.
- Os títulos do site usam apóstrofo agudo (`Sant´Ana`, `D´Ajuda`); normalizados para `’`
  (`Sant’Ana`, `D’Ajuda`) e o prefixo "Paróquia" foi acrescentado onde a fonte só trazia o
  padroeiro, conforme a regra de nomes do README.
