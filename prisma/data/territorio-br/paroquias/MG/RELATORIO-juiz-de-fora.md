# Relatório — Arquidiocese de Juiz de Fora (MG)

Pesquisa em 10/09/2026. Arquivo gerado: `paroquias/MG/juiz-de-fora.json`.

## Resultado

| Métrica | Valor |
|---|---|
| Registros no arquivo | **95** (todos `confidence: alta`) — 94 latinos + 1 de outra jurisdição |
| Paróquias latinas | 91 paróquias + 3 quase-paróquias |
| Cobertura | 95 / 95 (a fonte oficial é a própria lista da arquidiocese) |
| Municípios/localidades distintos | 45 |
| Comunidades/capelas | **737** (todas `alta`) — 89 das 95 têm mais de uma |
| Horários fixos | **979 missas** (552 `alta`, 427 `baixa`) — **todas as 95** têm horário |
| Campos preenchidos | endereço 95, CEP 82, bairro 92, telefone 89, e-mail 88, pároco 91, ano de fundação 93, forania 93, site/rede 45 |

Foranias (12): Nossa Senhora da Conceição 11, São José 10, São Miguel 10, Santa Teresinha 9,
Sant'Ana 8, São Vicente 8, Santo Antônio 7, Nossa Senhora das Dores 7, Bom Jesus 6,
Mãe de Deus 6, Nossa Senhora do Líbano 6, Santa Luzia 5. Duas unidades sem forania declarada.

## Fontes principais

1. **`https://arquidiocesejuizdefora.org.br/lista-de-paroquias/`** e a **API REST do WordPress**
   (`/wp-json/wp/v2/posts?categories=2516`, categoria "Paróquias", 147 registros: 94 paróquias,
   40 capelas e 13 comunidades) — a lista completa saiu de uma chamada só.
2. **Página de detalhe de cada paróquia** (`/paroquia-<slug>/`, 147 páginas lidas): forania,
   cidade, data de fundação, telefone, e-mail (desofuscado do `data-cfemail` do Cloudflare),
   Instagram/Facebook, endereço curto + endereço completo com CEP, **lista de "Locais, Capelas e
   Comunidades"** e o clero (pároco, vigários, diáconos).
3. **`https://arquidiocesejuizdefora.org.br/horarios-de-celebracoes/`** — a arquidiocese mantém
   uma busca por paróquia que devolve **tabela estruturada** (Tipo, Dia da Semana, Horário,
   Observações) por igreja/capela. O plugin é o "Search & Filter Light"; os dados vêm de
   `POST /wp-admin/admin-ajax.php` com `action=sf-search`, `data[search-id]=busca`,
   `data[1]=<id da paróquia>`. Foram consultados os 97 valores do `<select>` → 540 locais e
   1.068 linhas de horário.
4. **`/arcebispo-metropolitano/`** — confirma **Dom Marco Aurélio Gubiotti**, arcebispo
   metropolitano desde **7 de março de 2026** (nomeado em 08/01/2026 pelo Papa Leão XIV).
   *Atenção: fontes de terceiros ainda trazem Dom Gil Antônio Moreira.*
5. **`/igreja-catolica-melquita-de-rito-bizantino/`** — identifica a Paróquia São Jorge
   (Santa Helena) como melquita.

## Paróquia de outra jurisdição

`Paróquia São Jorge` (Santa Helena, Juiz de Fora) aparece na busca oficial de horários da
arquidiocese latina, mas o único local dela é a "Igreja Católica Melquita de Rito Bizantino".
Foi gravada com:

```json
"status": "outra-jurisdicao",
"jurisdictionNote": "…Eparquia de Nossa Senhora do Paraíso em São Paulo dos Greco-Melquitas."
```

**Não deve contar** como paróquia latina de Juiz de Fora. Ela traz 3 missas (sáb 19h,
dom 9h e 19h) e o telefone (32) 3212-7878.

## Cobertura vs. números de terceiros

- **Wikipédia** (edição de 08/04/2026): "86 paróquias distribuídas em 37 municípios".
- **Tribuna de Minas** (2019): "91 paróquias espalhadas entre 37 cidades".
- **Lista oficial atual (10/09/2026)**: 94 unidades latinas em 45 localidades (o número maior de
  localidades se explica porque a arquidiocese trata alguns distritos como sede de paróquia).

Os números de terceiros estão defasados; a lista oficial foi adotada como referência.
`coverage.parishesExpected` = 95 (94 latinas + a melquita listada por cortesia).

## Decisões de modelagem

- **Nomes** sem o parêntese de localização (`Paróquia Santa Rita de Cássia (Bonfim – JF)` →
  `Paróquia Santa Rita de Cássia`, bairro `Bonfim`). O importador desambigua homônimas pelo bairro.
  Único ajuste de prefixo: `Paróquia Santo Antônio – Catedral Metropolitana` →
  **`Catedral Metropolitana Santo Antônio`**, conforme a regra de prefixo do README.
- **`city`** = a localidade que a arquidiocese informa. Oito paróquias ficam em distrito e a
  arquidiocese usa o nome do distrito como cidade: Taruaçu, Conceição de Ibitipoca,
  Conceição do Formoso, Dores do Paraibuna, São João da Serra, Carlos Alves,
  São José das Três Ilhas e São Sebastião do Barreado. Já Sarandira e Rosário de Minas,
  também distritos, a fonte registra como "Juiz de Fora/MG" — mantive o que cada ficha diz.
  **Ponto para validação humana.**
- **`website`**: nenhuma paróquia tem site próprio na ficha oficial; 45 têm Instagram, e nesses
  casos gravei a URL do perfil (`https://www.instagram.com/<user>`). Se o Parish quiser `website`
  só para site institucional, esses 45 devem virar `null`.
- **Comunidades**: união da lista da página da paróquia com os locais que aparecem na busca de
  horários, sem duplicar (comparação sem acento/caixa). A matriz é reconhecida pelo prefixo
  (`Matriz …`, `Catedral …`, `Basílica Matriz …`); quando nenhuma casa, entra
  `Matriz <padroeiro>` com o endereço da paróquia.
- **Tipos de horário**: a fonte só usa "Missa" e "Celebração da Palavra". As **61 linhas de
  Celebração da Palavra foram descartadas** — não são missa e `MassSchedule` só aceita
  `MASS`/`CONFESSION`/`ADORATION`/`ROSARY`. A arquidiocese não publica horário de confissão,
  adoração ou terço nessa tabela.
- **Recorrência mensal → `baixa`** (427 de 979). A coluna "Dia da Semana" traz valores como
  "1º Domingo do Mês", "3º Sexta-feira do Mês", "Última Quinta-feira do Mês": gravei o dia da
  semana correspondente e copiei a regra literal em `notes`. Também foram rebaixadas as linhas
  cuja observação declara recorrência não-semanal (ex.: "*As missas são realizadas de 2 em 2
  meses."). **15 linhas com dia "Dia 12/13/15/16/18/19/22/27/28 de cada mês" foram descartadas**:
  não têm dia da semana algum.

## Precisa de validação humana

1. **Arcebispo**: Dom Marco Aurélio Gubiotti (desde 07/03/2026). Se `dioceses.json` ainda trouxer
   Dom Gil Antônio Moreira (arcebispo emérito), precisa de correção — **não alterei esse arquivo**.
2. **Paróquia São Jorge (melquita)** — decidir se entra no Parish e sob qual diocese.
3. **`Paróquia Santa Rita de Cássia` (Santa Rita de Jacutinga)**: a ficha oficial não tem o bloco
   "Sobre", então ficou **sem forania** e a cidade veio do título/endereço. Confirmar a forania.
4. **6 paróquias sem telefone e 7 sem e-mail** na fonte: Nossa Senhora das Dores (Taruaçu),
   Santa Bárbara (Carlos Alves), Nossa Senhora do Livramento (Sarandira), São Sebastião
   (São Sebastião do Barreado), São José (São José das Três Ilhas), Nossa Senhora da Conceição
   (Conceição de Ibitipoca, sem telefone) e Nossa Senhora do Rosário (Granbery, sem e-mail).
5. **13 paróquias sem CEP** — o endereço "Como Chegar" da ficha não trazia o CEP.
6. **Duas paróquias homônimas de Nossa Senhora do Perpétuo Socorro em Juiz de Fora**: a lista de
   paróquias chama uma de "Jardim Esperança" e a busca de horários chama a mesma de "Retiro".
   Adotei o bairro do endereço (**Retiro**, Rua Ir. Emerenciana 141) e mantive a outra em
   **Monte Castelo**. Confirmar.
7. **Duplicatas no `<select>` da busca de horários** (a arquidiocese mantém entradas antigas):
   "Paróquia Senhor dos Passos (Rio Preto)" + "Paróquia Nosso Senhor dos Passos (Rio Preto)" e
   "Quase-Paróquia Santa Maria Eterna" + "…(Humaitá)". Os horários das duas entradas foram
   **unidos** na paróquia correspondente, sem duplicar local.
8. **Observações que mudam o horário real** e ficaram apenas em `notes` (ex.: "A celebração começa
   às 6h20", "*Horário exato às 12h15", "Meia hora antes tem início a Adoração ao Santíssimo",
   "Exceto no 1º e 3º domingo, quando ocorre celebração da Palavra"). Esses ficaram `alta` porque
   a missa acontece no dia/hora gravados na maioria das semanas, mas o texto merece revisão.

## O que ficou completo

Ao contrário de Mariana, **Juiz de Fora saiu 100% coberta nas três prioridades**: lista completa
com endereço e contato, comunidades/capelas de quase todas as paróquias e horários fixos de todas
as 95 unidades, tudo de fonte oficial da própria arquidiocese.
