# Relatório — Diocese de Tubarão (SC)

Pesquisa de 2026-09-10; relatório escrito a partir do JSON já gravado (o agente de pesquisa foi
interrompido antes de redigi-lo). Arquivo de dados: `tubarao.json`. Todas as estatísticas abaixo foram
computadas do próprio JSON.

## Resumo

| Item | Quantidade |
|---|---|
| Paróquias | **29** (29 alta / 0 media / 0 baixa) |
| Comunidades/capelas | **403** (todas alta) — todas as 29 paróquias têm lista nominal |
| Horários fixos | **109** — **0 alta / 59 media / 50 baixa** |
| Cobertura | 29 / 29 esperadas (site diocesano e catholic-hierarchy) — **100 %** |
| Cidades cobertas | 17 municípios |

> **Alerta de carga:** nenhum horário tem confiança `alta` e 50 são `baixa`. Aplicando a regra do README
> (só `alta` e `media` entram), **apenas 5 das 29 paróquias entram no sistema com algum horário** — e a
> Catedral entra com **zero**.

## Fontes principais

48 URLs distintas, todas acessadas em **2026-09-10**.

1. **Site oficial `diocesetb.org.br` — 35 URLs:**
   - `https://diocesetb.org.br/paroquias` — listagem das 29 paróquias.
   - `https://diocesetb.org.br/pagina/comarcas` — foranias: Braço do Norte, Jaguaruna, Laguna, Tubarão.
   - `https://diocesetb.org.br/pagina/curia` — Cúria (e-mails vinham ofuscados pelo Cloudflare e foram decodificados).
   - `https://diocesetb.org.br/pagina/bispo` — Dom Adilson Pedro Busin, CS (7º bispo, posse 2023).
   - `https://diocesetb.org.br/cleros/categoria/presbiterosdioc` e `.../presbiterosrelig` — pároco e vigários por paróquia (fonte de 26 dos 29 `priestName`).
   - **29 páginas individuais** `https://diocesetb.org.br/entidade/paroquia<nome>` — histórico e **lista
     completa de comunidades**; poucas trazem endereço/telefone e menos ainda horários.
2. **`www.horariodemissa.com.br` — 10 URLs** (`igreja.php?k=…`), usadas para endereço, telefone e
   horários de 10 paróquias. **A antiguidade é o problema:** 5 fichas com última atualização em
   **2013** (São José Operário 14/05/2013, Santa Terezinha/Tubarão 08/05/2013, N. Sra. de Fátima
   03/05/2013, São Francisco de Assis 03/05/2013), 2 em **29/12/2023** (Catedral e Imaculada
   Conceição/Tubarão) e 4 **sem data informada**. Daí vêm os 50 horários `baixa`.
3. `https://www.catholic-hierarchy.org/diocese/dtuba.html` — 29 paróquias (2022), ereção 28/12/1954.
4. `https://www.gcatholic.org/churches/local/tuba0` — 28 paróquias + 1 igreja (não inclui São Martinho de Tours, criada em 2020).
5. `https://pt.wikipedia.org/wiki/Diocese_de_Tubar%C3%A3o` — 18 municípios.

## Cobertura

`coverage`: `parishesFound` 29, `parishesExpected` 29.

### Preenchimento por campo (de 29 paróquias)

| Campo | Preenchido | Nulo |
|---|---|---|
| `foundedYear` | 28 (97 %) | 1 |
| `priestName` | 26 (90 %) | 3 |
| `neighborhood` | 19 (66 %) | 10 |
| `address` | 15 (52 %) | 14 |
| `phone` | 13 (45 %) | 16 |
| `zipCode` | 12 (41 %) | 17 |
| `website` | 7 (24 %) | 22 |
| `email` | **4 (14 %)** | **25** |

Confiança: 29 `alta`, 0 `media`, 0 `baixa` — nenhuma paróquia fica fora da carga.

## Comunidades

- **403 comunidades**, todas `alta`, todas com `sources`. **Todas as 29 paróquias têm lista nominal**
  (nenhuma com `communities: []`) — é a diocese com a melhor cobertura de comunidades das três de SC
  desta rodada.
- **29 matrizes** marcadas (`isMatriz: true`), uma por paróquia.
- `neighborhood` preenchido em 374 de 403; `address` em 19 de 403.
- Maiores listas: São João Batista/Imaruí (27), Santa Otília/Orleans (26), São Marcos/Rio Fortuna (24),
  N. Sra. das Dores/Jaguaruna (23). Menor: São Sebastião/São Martinho (3).

## Horários

- **109 horários**, distribuídos assim:

| Tipo | Total | alta | media | baixa |
|---|---|---|---|---|
| MASS | 71 | 0 | 31 | 40 |
| ADORATION | 16 | 0 | 16 | 0 |
| ROSARY | 12 | 0 | 12 | 0 |
| CONFESSION | 10 | 0 | 0 | 10 |
| **Total** | **109** | **0** | **59** | **50** |

- Origem: 59 `media` de `diocesetb.org.br`, 50 `baixa` de `horariodemissa.com.br`.
- Por dia da semana: domingo 33, quinta 24, terça 17, quarta 12, sábado 11, sexta 10, segunda 2.
- Faixa: 06:00 às 20:15. Nenhum `time`/`dayOfWeek` malformado, nenhum duplicado, nenhum sem `sources`,
  nenhum `community` órfão.
- **Concentração extrema:** 34 dos 109 horários são de uma única paróquia (N. Sra. Imaculada
  Conceição, Imbituba) — e **todos os 16 ADORATION e todos os 12 ROSARY** vêm dela.
- **16 paróquias sem nenhum horário no JSON:**
  Senhor do Bom Fim (Braço do Norte), São João Batista (Capivari de Baixo), Santuário Sagrado Coração
  de Jesus (Gravatal), São João Batista (Grão-Pará), N. Sra. dos Navegantes (Laguna), São Pedro
  Apóstolo (Laguna), Santa Otília (Orleans), São Gabriel e N. Sra. da Salete (Pedras Grandes),
  São Marcos (Rio Fortuna), N. Sra. do Bom Parto (Sangão), São João Batista (Sangão),
  São Ludgero (São Ludgero), Cristo Rei (São Martinho), São Sebastião (São Martinho),
  São José (Treze de Maio), São Martinho de Tours (Tubarão).
- **`notes`: 26 horários** — e **0 com recorrência mensal/quinzenal**. As 11 notas distintas são:
  "Missa da Saúde", "Missa dos Comerciários", "Adoração ao Santíssimo", "Terço dos Homens",
  "Missa e Novena em honra a Nossa Senhora das Dores", "das 9h às 16h", "das 10h às 16h" e quatro
  variantes de horário de verão ("20h durante o horário de verão", "18h30 durante o horário de verão",
  "19h30 durante o horário de verão", "20h no verão").
- Distribuição por local: o literal `"Matriz"` **não é usado** (todas as matrizes estão nomeadas);
  **10 das 13 paróquias com horário só têm horário na matriz**.

## Pontos para o enxame de validação

1. **Nenhum horário com confiança `alta` em toda a diocese.** As páginas do site diocesano trazem
   histórico e comunidades, mas os horários vieram sem sinal claro de atualidade → tudo `media`. Com a
   regra `alta`+`media`, sobram **59 horários em 5 paróquias**: São Pedro Apóstolo (Armazém),
   N. Sra. Imaculada Conceição (Imbituba), N. Sra. das Dores (Jaguaruna), Santo Antônio dos Anjos
   (Laguna) e Santa Terezinha do Menino Jesus (Tubarão, parcial). **24 das 29 paróquias entram sem
   nenhum horário.** É a prioridade nº 1 da validação.
2. **A Catedral Nossa Senhora da Piedade entra com zero horários:** seus 14 registros são todos `baixa`,
   vindos de uma ficha do horariodemissa atualizada em 29/12/2023. Uma catedral sem missa de domingo no
   app é o pior sintoma visível dessa lacuna.
3. **Horários de 2013 no dataset.** 5 fichas do agregador não são atualizadas há ~13 anos:
   São José Operário (10 horários), Santa Terezinha/Tubarão (4), N. Sra. de Fátima (8),
   São Francisco de Assis (3), Imaculada Conceição (3). Praticamente certo que estão errados —
   validar contra as redes sociais das paróquias antes de qualquer promoção de confiança.
4. **`email` nulo em 25 de 29 paróquias (86 %).** Só têm e-mail: São Pedro Apóstolo/Armazém
   (`contato@paroquiaarmazem.com.br`), São João Batista/Imaruí, N. Sra. Imaculada Conceição/Imbituba
   e Santo Antônio dos Anjos/Laguna (`p.laguna@diocesetb.org.br`). Os e-mails da Cúria vinham
   ofuscados pelo Cloudflare e foram decodificados — reconferir se a decodificação está correta.
   `paroquiaideimarui@hotmail.com` (Imaruí) parece ter um erro de digitação ("ide" no lugar de "de").
5. **`phone` nulo em 16 de 29 e `address` nulo em 14 de 29** — as mesmas 14–16 paróquias, todas aquelas
   cuja página oficial só traz histórico. Todos os 13 telefones existentes usam DDD 48 e estão no padrão;
   só `(48) 3255-0250 (WhatsApp)` (Imbituba) carrega sufixo textual. Os 12 CEPs estão no padrão
   `NNNNN-NNN` e no prefixo 88 (correto para SC).
6. **Nome com prefixo duplicado — viola a regra do README:** `Paróquia Santuário Sagrado Coração de
   Jesus` (Gravatal). O `slug` já é `sagrado-coracao-de-jesus-gravatal`. Escolher entre
   "Paróquia Sagrado Coração de Jesus" ou "Santuário Sagrado Coração de Jesus".
7. **46 comunidades sem prefixo**, com o nome solto do padroeiro, contra 357 no padrão
   "Matriz/Capela/Comunidade …". Exemplos: "São Roque", "Mãe Peregrina", "Bom Jesus", "Santa Paulina",
   "Dom Orione", "Gruta Nossa Senhora da Cabeça", "São Luiz e Bem Aventurada Albertina". Padronizar
   antes da carga (elas se tornarão nomes de igreja no app).
8. **Acentuação inconsistente entre comunidades:**
   - "São Cristovão" (Armazém) vs "São Cristóvão" (São Francisco de Assis/Tubarão)
   - "São Tomáz" vs "São Tomás de Aquino"
9. **Matriz com nome diferente do título da paróquia — 7 casos.** Quatro são só variação de grafia e
   devem ser uniformizados; três merecem checagem na fonte:
   - "Paróquia Senhor do Bom Fim" (Braço do Norte) → "Matriz Nosso Senhor do Bom Fim"
   - "Paróquia Nossa Senhora Imaculada Conceição" (Imbituba) → "Matriz Nossa Senhora da Conceição"
   - "Paróquia Imaculada Conceição" (Tubarão) → "Matriz Nossa Senhora Imaculada Conceição"
   - "Paróquia São Martinho de Tours" (Tubarão) → "Matriz São Martinho"
   - "Paróquia Santuário Sagrado Coração de Jesus" (Gravatal) → "Matriz Sagrado Coração de Jesus"
   - "Paróquia São José Operário" (Tubarão) → "Matriz São José"
   - "Paróquia São Gabriel e Nossa Senhora da Salete" (Pedras Grandes) →
     **"Matriz S. Gabriel Arcanjo e N.S. da Salete"** — abreviações no nome, expandir.
10. **`foundedYear` = 1697** para Santo Antônio dos Anjos (Laguna) — único anterior a 1700. As fontes
    históricas sobre a freguesia de Laguna citam 1696 e 1714; conferir. `foundedYear` nulo em Santa
    Terezinha do Menino Jesus (Imbituba).
11. **`priestName` nulo em 3:** Santuário Sagrado Coração de Jesus (Gravatal), Santo Antônio dos Anjos
    (Laguna) e São Sebastião (São Martinho) — as três aparecem na página de presbíteros, então é
    provável que sejam extrações que falharam.
12. **Possível troca de município:** "Paróquia São João Batista" está com `city: Sangão` e
    `neighborhood: Morro Grande`, e sua fonte é a entidade `paroquiamorrogrande`. Existe um município
    **Morro Grande** em SC (na diocese de Criciúma). Confirmar que a paróquia é mesmo do distrito de
    Morro Grande, em Sangão. Situação análoga (e aparentemente correta): "Paróquia São Martinho de
    Tours" tem `city: Tubarão` e `neighborhood: São Martinho`, enquanto "Paróquia Cristo Rei" é do
    município de São Martinho.
13. **Notas de "horário de verão" (4 registros):** o `time` guarda o horário de inverno e a nota
    descreve o alternativo. O schema não modela isso — decidir se vira um segundo registro ou fica só
    na nota.
14. **Notas de duração em ADORATION** ("das 9h às 16h", "das 10h às 16h"): o `time` guarda só o início.
15. **Homônimas:** nenhuma comunidade repetida dentro da mesma paróquia e **nenhuma colisão dentro da
    mesma cidade**. As repetições entre paróquias diferentes ("Matriz São João Batista" ×4,
    "Comunidade Santo Antônio (Rio Santo Antônio)" ×3, "Matriz São Pedro Apóstolo" ×2) são esperadas.
16. Nenhum problema de forma detectado em: prefixos de nome (28 "Paróquia" + 1 "Catedral"), slugs
    (kebab-case ASCII, sem duplicatas), `state` (29 × "SC"), párocos (26, todos com prefixo "Pe.", sem
    repetição entre paróquias). "Paróquia São Ludgero / São Ludgero" repete a cidade no nome, mas é o
    padroeiro real do município — não é violação.
