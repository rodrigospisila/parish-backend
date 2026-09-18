# Diocese de Balsas (MA) — relatório de pesquisa

Data da coleta: **2026-09-18**. Agente de pesquisa (rodada MA — fechamento do Maranhão).

## Resumo

| Item | Valor |
|---|---|
| Paróquias no JSON | **19** |
| Confiança das paróquias | 19 `alta` |
| Comunidades | 0 (nenhuma fonte publica) |
| Horários fixos | 12, todos `baixa` |
| Cobertura | 19 encontradas × 18 esperadas (catholic-hierarchy 2022) |

## A diocese não tem site

- `diocesedebalsas.org.br` e `diocesedebalsas.com.br` **não resolvem no DNS** (verificado por
  `curl` e por DNS-over-HTTPS em `dns.google` — `Status: 3`, NXDOMAIN em `registro.br`).
- A única presença institucional encontrada é o **Facebook `facebook.com/diocesedebalsas`**, que
  não publica lista de paróquias, clero nem horários.
- O `dioceses.json` já traz `website: null` para Balsas — **está certo, não mexer**.

## Fonte que fechou a lista: a Receita Federal

Busca avançada do **Mapa das OSC/IPEA** por razão social "DIOCESE DE BALSAS" (um filtro por vez,
como manda o README) → **21 inscrições do CNPJ 06.080.154, todas ATIVAS**:

- 1 matriz/cúria (`/0001-17`, Praça Getúlio Vargas 149, Centro, Balsas);
- 1 entidade não paroquial: **"DIOCESE DE BALSAS – TV BOA NOTÍCIA"** (`/0019-46`, Praça Pe.
  Balduíno 510, telefone (99) 3541-2483 — o mesmo da cúria);
- **19 paróquias**, cada uma com `nome_fantasia`, logradouro, bairro e CEP.

Confrontadas com o `gcatholic.org/churches/local/bals0` (18 igrejas, 16 "Parish" + catedral +
antiga catedral), as 19 fecham. A Receita revelou **duas paróquias que nenhuma outra fonte tem**:

| Paróquia | Cidade | Abertura na Receita |
|---|---|---|
| Paróquia São Francisco de Assis | Feira Nova do Maranhão | **17/12/2021** |
| Paróquia Senhora Santana | Nova Colinas | **13/08/2025** |

## Decisões de identificação

- **Paróquia São Domingos Gusmão** — a Receita registra a filial `/0012-70` (aberta em
  **05/07/1977**) em *Benedito Leite*, bairro "SÃO DOMINGOS", Avenida Amaro Bezerra. Benedito
  Leite já tem a Paróquia de Santa Luzia e é um município de ~5 mil habitantes; **São Domingos do
  Azeitão só se emancipou em 1994**, depois da abertura do CNPJ, e o gcatholic lista
  independentemente "São Domingos do Azeitão | São Domingos Gusmão (Parish)". Gravei a paróquia em
  **São Domingos do Azeitão**, com a explicação em `notes` da paróquia. *Ponto para validação.*
- O `nome_fantasia` da Receita às vezes é genérico ("PAROQUIA DE BALSAS", "PAROQUIA DE RIACHÃO",
  "PAROQUIA DAS MANGABEIRAS", "PAROQUIA DE ALTO PARNAÍBA"). Nesses casos usei o **título do
  gcatholic** (Sagrado Coração de Jesus, Nossa Senhora de Nazaré, São Raimundo Nonato, Nossa
  Senhora das Vitórias), que é o orago real.
- **Igreja de Santo Antônio de Pádua (Balsas)** — o gcatholic a marca "Former Cathedral", não
  "Parish", e não há horário publicado em fonte que sustente `media`. **Ficou fora do JSON** pela
  regra do README.

## Horários

Só o Lírio Católico publica horário nesta diocese → 12 entradas, todas `baixa`:

- **Catedral Sagrado Coração de Jesus** (Balsas): Dom 06:30/09:00/17:00/18:30, Seg 19:00,
  Qua 06:00, Sex 19:00, Sáb 06:00.
- **Paróquia N. Sra. do Perpétuo Socorro** (Potosí, Balsas): Dom 07:00 e 19:00, Ter 19:00;
  confissão Sex 15:00.

### Igreja com missa publicada que NÃO foi vinculada a paróquia

| Igreja | Cidade | Missa | Por que ficou fora |
|---|---|---|---|
| Comunidade São Francisco de Assis, Av. São Francisco, 437, bairro São Francisco | Balsas | Dom 18:00 | Balsas tem duas paróquias e nenhuma fonte diz a qual pertence |

## Para o enxame de validação humana

1. **Párocos**: `priestName: null` nas 19. Nenhuma fonte pública lista o clero de Balsas.
2. **`foundedYear`**: `null` nas 19. A data de início na Receita é de inscrição de CNPJ
   (05/07/1977 repetida em 9 paróquias, 28/06/1976 em 3) — data repetida em massa, descartada pela
   lição do README.
3. **Comunidades**: nenhuma. É a maior lacuna de Balsas.
4. **São Domingos do Azeitão × Benedito Leite** (ver acima).
5. **Telefone do Lírio para a catedral**: `(98) 3541-2889` — DDD errado (Balsas é 99). Não foi
   gravado.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

Nenhuma alteração necessária. `address` ("Curia Diocesana, C.P. 18, Praca Getulio Vargas 149,
Centro"), `zipCode` (65800-000), `phone` ((99) 3541-2483, confirmado pela Receita no registro da
TV Boa Notícia, da mesma cúria), `website: null`, `email: null` e `bishopName` (Dom Valentim
Fagundes de Meneses, M.S.C., bispo desde 29/07/2020 pelo gcatholic) conferem.

`foundedYear` 1954 é a ereção da **Prelazia de Santo Antônio de Balsas** (20/12/1954); a diocese
só foi criada em 03/10/1981. Está certo pela convenção do dataset — **não alterar**.
