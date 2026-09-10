# Relatório — Diocese de Criciúma (SC)

Pesquisa de 2026-09-10; relatório escrito a partir do JSON já gravado (o agente de pesquisa foi
interrompido antes de redigi-lo). Arquivo de dados: `criciuma.json`. Todas as estatísticas abaixo
foram computadas do próprio JSON.

## Resumo

| Item | Quantidade |
|---|---|
| Paróquias | **49** (49 alta / 0 media / 0 baixa) |
| Comunidades/capelas | **543** (todas alta) em 45 paróquias |
| Horários fixos | **159** (todos alta, fonte oficial) |
| Cobertura | 49 / 49 esperadas (lista oficial da diocese) — **100 %** |
| Cidades cobertas | 26 municípios |

## Fontes principais

57 URLs distintas, todas acessadas em **2026-09-10**.

1. **Site oficial `www.diocesecriciuma.com.br` — 54 URLs** (a espinha dorsal do dataset):
   - `https://www.diocesecriciuma.com.br/paroquias` — listagem das 49 unidades em 8 comarcas.
   - `https://www.diocesecriciuma.com.br/horarios-de-missa` — horários de missa por paróquia.
   - `https://www.diocesecriciuma.com.br/pagina/curia-diocesana` — endereço, telefone e e-mail da Cúria.
   - `https://www.diocesecriciuma.com.br/pagina/bispo-diocesano` — Dom Jacinto Inácio Flach (posse 13/11/2009).
   - `https://www.diocesecriciuma.com.br/pagina/bispo-coadjutor` — Dom Milton Zonta, SDS (nomeado 30/12/2025, ordenado 21/03/2026).
   - **49 páginas individuais** `https://www.diocesecriciuma.com.br/paroquia/<slug>` — uma por paróquia,
     com endereço, telefone, e-mail, pároco, ano de criação e a **lista nominal de comunidades com o
     bairro/localidade de cada uma**. É daí que vêm as 543 comunidades.
2. `https://www.catholic-hierarchy.org/diocese/dcric.html` — 43 paróquias (2023), ereção 27/05/1998.
3. `https://www.gcatholic.org/churches/local/cric0` — 43 igrejas.
4. `https://pt.wikipedia.org/wiki/Diocese_de_Crici%C3%BAma` — 26 municípios, 8 comarcas.

Nenhum agregador de horários foi usado: **0 registros** vêm de horariodemissa.com.br, missas.com.br ou
Google Maps. É por isso que os 159 horários são todos `alta`.

## Cobertura

`coverage`: `parishesFound` 49, `parishesExpected` 49.

A nota registra que catholic-hierarchy (43, 2023) e gcatholic (43) estão desatualizados: a diferença são
paróquias criadas entre 2020 e 2026. O JSON tem **13 paróquias com `foundedYear` ≥ 2020**, entre elas
São Francisco de Assis (Araranguá, 2026) e Santa Cruz (Morro Grande, 2026).

### Preenchimento por campo (de 49 paróquias)

| Campo | Preenchido | Nulo |
|---|---|---|
| `address` | 49 (100 %) | 0 |
| `neighborhood` | 49 (100 %) | 0 |
| `foundedYear` | 49 (100 %) | 0 |
| `email` | 48 (98 %) | 1 |
| `priestName` | 48 (98 %) | 1 |
| `phone` | 47 (96 %) | 2 |
| `website` | 6 (12 %) | 43 |
| `zipCode` | **3 (6 %)** | **46** |

Confiança: 49 `alta`, 0 `media`, 0 `baixa` — nenhuma paróquia fica fora da carga.

## Comunidades

- **543 comunidades**, todas `confidence: alta`, todas com `sources`.
- **45 paróquias com lista nominal**; **4 sem lista** (`communities: []`, o importador cria a matriz):
  Santuário Nossa Senhora Mãe dos Homens (Araranguá), Catedral São José (Criciúma),
  Basílica Santuário Sagrado Coração Misericordioso de Jesus (Içara),
  Santuário Nossa Senhora de Caravaggio (Nova Veneza).
- **43 comunidades marcadas `isMatriz: true`**; nenhuma paróquia tem mais de uma matriz.
- `neighborhood` preenchido em 541 de 543; `address` em **0 de 543** (o site só publica a localidade).
- Maiores listas: N. Sra. da Conceição/Urussanga (29), Imaculado Coração de Maria/Lauro Müller (28),
  São Sebastião/Praia Grande (24), Santa Terezinha/Jacinto Machado (21). Menor lista: Santa Catarina de
  Alexandria/Morro da Fumaça (4).

## Horários

- **159 horários**, **todos `alta`** (fonte: páginas oficiais da diocese).

| Tipo | Total | alta | media | baixa |
|---|---|---|---|---|
| MASS | 158 | 158 | 0 | 0 |
| ADORATION | 1 | 1 | 0 | 0 |
| CONFESSION | 0 | — | — | — |
| ROSARY | 0 | — | — | — |

- Por dia da semana: domingo 62, sábado 32, quarta 23, terça 14, quinta 14, sexta 11, segunda 3.
- Faixa: 06:00 às 19:30. Nenhum `time` ou `dayOfWeek` malformado, nenhum horário duplicado, nenhum
  horário sem `sources`, nenhum `community` órfão.
- **12 paróquias ficaram sem nenhum horário** (todas `alta`, entrariam no sistema sem missa):
  1. Paróquia São Francisco de Assis — Araranguá
  2. Paróquia São José — Araranguá
  3. Paróquia São Francisco de Assis — Balneário Rincão
  4. Paróquia Sagrada Família de Nazaré — Criciúma
  5. Paróquia Santo Antônio — Criciúma
  6. Paróquia Nossa Senhora das Graças — Ermo
  7. Paróquia Santa Rita de Cássia — Içara
  8. Paróquia São Miguel Arcanjo — Içara
  9. Paróquia Santa Cruz — Morro Grande
  10. Paróquia São Roque — Morro da Fumaça
  11. Paróquia Nossa Senhora dos Navegantes — Passo de Torres
  12. Paróquia Santa Rosa de Lima — Santa Rosa do Sul
- **`notes`: 5 horários** — e **0 com recorrência mensal/quinzenal**. As 5 notas são:
  "Missa com Bênção de São José", "Missa da Saúde", "Missa da saúde com cura e libertação",
  "Missa da Saúde; adoração ao Santíssimo às 15:30", "Adoração ao Santíssimo antes da Missa da Saúde".
- Distribuição por local: 42 horários usam o literal `"Matriz"` (6 paróquias) e o restante usa o nome
  da matriz nomeada. **32 das 37 paróquias com horário só têm horário na matriz** — as 543 comunidades
  ficam praticamente sem horário próprio.

## Pontos para o enxame de validação

1. **`zipCode` nulo em 46 de 49 paróquias (94 %).** O site diocesano não publica CEP. Só têm CEP:
   N. Sra. de Guadalupe/Criciúma (88805-610), N. Sra. das Graças/Ermo (88935-000) e a Basílica
   Santuário SCMJ/Içara (88821-240). Todos no padrão `NNNNN-NNN` e no prefixo 88 (correto para SC).
   Como todos os 49 endereços estão preenchidos, dá para completar via ViaCEP.
2. **`website` nulo em 43 de 49.** Só 6 sites, todos de santuários/paróquias grandes
   (santuariomaedoshomens.com.br, psfarincao.com.br, santuarioscmj.com.br, paroquiasaodonato.com.br,
   igrejademaria.com.br, santuariodecaravaggio.com.br). Dois deles ainda em `http://`.
3. **Nulos pontuais:** `phone` em N. Sra. Auxiliadora/Criciúma e Santa Rita de Cássia/Içara;
   `email` em Santuário N. Sra. Mãe dos Homens/Araranguá; `priestName` em N. Sra. da Oração/Turvo.
4. **Telefone malformado:** `(48) 92002-6195` (N. Sra. dos Navegantes, Passo de Torres) — celular
   brasileiro com o 2º dígito `2` é atípico (o padrão é 9 seguido de 6–9). Provável erro de digitação.
5. **Telefones com sufixo textual** (o campo não é um número puro):
   - São Paulo Apóstolo/Criciúma: `(48) 3433-0277 / (48) 99632-8340 (WhatsApp)`
   - São Roque/Morro da Fumaça: `(48) 3801-9379 / (48) 3434-1128 (Somente WhatsApp)`
   Todos os 47 telefones usam DDD 48, coerente com a região.
6. **13 endereços sem número** (`s/nº` ou só o logradouro), entre eles São José/Araranguá
   ("Rua Alameda Ascendino Moraes de Sá"), Santa Rita de Cássia/Içara ("Rua Santa Rita de Cassia") e
   Imaculado Coração de Maria/Lauro Müller ("Rua Alexandre Doneda").
7. **Grafias suspeitas em endereços** (copiadas do site como estão):
   - `Rua das Criança, 125` (N. Sra. da Conceição, Urussanga) — provavelmente "Rua das Crianças".
   - `Rua Cênego Aníbal Maria di Francia, 1435` — provavelmente "Cônego".
   - `Rua Santa Rita de Cassia` — sem acento em "Cássia".
8. **Matriz com padroeiro diferente do título da paróquia — 9 casos.** **Um foi conferido na fonte
   (10/09/2026) e está correto**: Paróquia São Pedro Apóstolo (Bal. Arroio do Silva) tem mesmo a
   "Nossa Senhora dos Navegantes (Matriz)" na página oficial. Os outros 8 provavelmente também são
   fiéis à fonte, mas convém checar:
   - Paróquia Sagrada Família (Araranguá) → Matriz São Cristóvão
   - Paróquia São José (Araranguá) → Matriz Santa Catarina de Alexandria
   - Paróquia Nossa Senhora Auxiliadora (Balneário Gaivota) → Matriz Nossa Senhora do Bom Parto
   - Paróquia São Francisco de Assis (Balneário Rincão) → Matriz Nossa Senhora dos Navegantes
   - Paróquia Nossa Senhora da Saúde (Forquilhinha) → Matriz São José
   - Paróquia Santa Terezinha (Jacinto Machado) → Matriz Santa Terezinha do Menino Jesus (só variação de nome)
   - Paróquia Nossa Senhora da Conceição (Maracajá) → Matriz São Pedro
   - Paróquia Nossa Senhora dos Navegantes (Passo de Torres) → Matriz São Pedro
9. **2 paróquias têm comunidades listadas mas nenhuma marcada `isMatriz`** e ainda assim usam o literal
   `"Matriz"` nos horários — o importador criará uma igreja "Matriz" **separada** das comunidades já
   listadas, gerando duplicata:
   - Paróquia Nossa Senhora de Guadalupe (Criciúma) — 6 comunidades
   - Paróquia São João Paulo II (Sombrio) — 13 comunidades
   (Nas 4 paróquias com `communities: []` o uso de `"Matriz"` está correto pelo README.)
10. **61 comunidades cujo `neighborhood` indica outro município** — o campo veio no formato
    "Localidade – Município". Exemplos: Paróquia São Pedro Apóstolo (Bal. Arroio do Silva) tem 5
    comunidades em Araranguá; N. Sra. da Saúde (Forquilhinha) tem 5 em Criciúma; N. Sra. das Graças
    (Ermo) tem comunidades em Sombrio, Jacinto Machado e Turvo. **O importador atribuirá todas à cidade
    da paróquia** — decidir se isso é aceitável ou se o `neighborhood` deve ser normalizado.
11. **Comunidade dividida indevidamente:** a página oficial de São Pedro Apóstolo (Bal. Arroio do Silva)
    lista **12** comunidades, com "São Sebastião (Golfinhos e Manhoso)" como **uma** só; o JSON tem 13,
    porque separou em "Comunidade São Sebastião (Golfinhos)" e "Comunidade São Sebastião (Manhoso)".
    Conferir se as demais paróquias sofreram divisão semelhante.
12. **Homônimas:** nenhuma comunidade repetida dentro da mesma paróquia. Há **1 colisão dentro da mesma
    cidade**: "Comunidade São José" existe em Sagrada Família de Nazaré e em Santo Agostinho, ambas em
    Criciúma. Repetições em paróquias diferentes da diocese são muitas e esperadas
    ("Comunidade São José (Vila São José)" ×4, "Comunidade Santa Luzia" ×4, "Matriz Nossa Senhora
    Aparecida" ×3) — só viram problema se o importador desduplicar por nome sem escopo de paróquia.
13. **Nomes de comunidade fora do padrão:**
    - "Oratório Nossa Senhora do Livramento (Vila Nova)" — único sem prefixo Matriz/Capela/Comunidade.
    - "Comunidade Nossa Senhora dos Campos (KM 107)" (Lauro Müller) — nome com quilometragem.
14. **Divergência interna da nota de cobertura:** a nota diz "38 paróquias com horários oficiais;
    11 sem horário publicado", mas o JSON tem **37 com e 12 sem**. Além disso, a página
    `/horarios-de-missa` **parece listar** a Paróquia Nossa Senhora dos Navegantes (Passo de Torres),
    que ficou com 0 horários no JSON. Reconferir a página e completar a paróquia faltante.
15. **Quase nenhum horário não-missa:** 1 ADORATION em toda a diocese, **0 CONFESSION e 0 ROSARY**. O
    site diocesano não publica confissões/adoração; um passe pelas redes sociais das paróquias
    completaria essa lacuna.
16. **Anos de fundação recentes** que valem confirmação por serem de 2026: São Francisco de Assis
    (Araranguá) e Santa Cruz (Morro Grande). O intervalo geral (1848–2026) é plausível.
17. Nenhum problema de forma detectado em: prefixos de nome (45 "Paróquia", 2 "Santuário",
    1 "Catedral", 1 "Basílica"), slugs (kebab-case ASCII, sem duplicatas, todos com a cidade),
    `state` (49 × "SC"), e-mails (48 válidos, todos no domínio `diocesecriciuma.com.br` ou próprio),
    nomes de pároco (48, todos com prefixo "Pe."). Um pároco aparece em duas paróquias
    (Sagrada Família/Araranguá e Santuário de Caravaggio/Nova Veneza) — confirmar se acumula.
