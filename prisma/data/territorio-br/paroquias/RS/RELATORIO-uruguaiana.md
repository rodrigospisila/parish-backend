# RELATÓRIO — Diocese de Uruguaiana (RS)

- **Arquivo**: `paroquias/RS/uruguaiana.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: pesquisa de território (PROMPT-pesquisa.md)

## Resumo

| Métrica | Valor |
|---|---|
| Entradas em `parishes` | 17 (todas paróquias) |
| Paróquias com confiança **alta** | 17 |
| Paróquias com confiança **media** | 0 |
| Paróquias com confiança **baixa** | 0 |
| Comunidades/capelas | 0 (nenhuma fonte pública as lista) |
| Horários fixos | 70 (61 `alta`, 9 `baixa`) |
| Paróquias com horário publicado | 14 de 17 |
| Cobertura | 17 / 17 (100 %) |

> **Cenário excelente para paróquias e horários, nulo para comunidades.** O site oficial publica
> ficha completa de cada paróquia (endereço, CEP, telefone, e-mail, pároco, ano de fundação) e um
> quadro diocesano de horários de missa — mas **não lista uma única capela/comunidade**.

## Método

1. `https://www.diocesedeuruguaiana.org.br/paroquias` — índice oficial, agrupado por município,
   com **17 links de ficha**. Todas as 17 fichas foram lidas
   (`.../paroquias/<slug>`): cada uma traz "A Paróquia" (ano de fundação + clero), "Horários"
   (MISSA e ATENDIMENTO) e "Contato" (endereço, CEP, CNPJ, telefone, e-mail, secretária).
2. `https://www.diocesedeuruguaiana.org.br/espiritualidade/missas` — quadro diocesano que repete,
   em uma única página, os horários de missa de todas as paróquias (usado como corroboração).
3. `.../diocese/institucional` e `.../contato` — dados da Mitra (CNPJ, endereço, telefones, e-mails,
   governo diocesano).
4. Corroboração de cobertura: catholic-hierarchy.org, gcatholic.org e Wikipédia (pt).

## Cobertura — 17 encontradas para 16 "esperadas"

| Fonte | Paróquias |
|---|---|
| Site oficial da diocese (10/09/2026) | **17** |
| catholic-hierarchy.org (est. 2022/2023) | 16 (+ 268 "missões") |
| gcatholic.org (atualizado 01/01/2026) | 16 (+ 1 capelania militar) |
| Wikipédia (pt) | 16 |

A diferença é explicada: a **Paróquia São José Operário, de Barra do Quaraí, foi fundada em 2023**
e ainda não entrou nas três fontes secundárias. Por isso `parishesExpected` foi registrado como
**17**, e não 16 — a lista oficial é mais recente que os anuários.

Municípios com paróquia: Alegrete (3), Uruguaiana (4), São Borja (2), Barra do Quaraí, Itacurubi,
Itaqui, Maçambará, Manoel Viana, Quaraí, Santiago e São Francisco de Assis (1 cada).

## Comunidades: nenhuma

O catholic-hierarchy contabiliza **268 "missões"** na diocese, mas **nenhuma fonte pública
publica os nomes**. O site diocesano não tem seção de capelas; as fichas de paróquia não citam
comunidades. Todas as 17 paróquias ficaram com `communities: []` — o importador criará a
igreja-matriz automaticamente, e os horários referenciam `"Matriz"`.

## Horários

- **14 das 17 paróquias** têm horários fixos publicados, tanto na ficha quanto no quadro
  `espiritualidade/missas` (dupla publicação oficial → confiança `alta`).
- **Sem horário publicado** (campos "MISSA" vazios na ficha e no quadro diocesano):
  - Paróquia Nossa Senhora da Conceição — **Santiago**
  - Paróquia Sagrado Coração de Jesus — **Maçambará**
  - Paróquia São José Operário — **Barra do Quaraí**
- **9 horários ficaram `baixa`**: são missas de **recorrência mensal** ("1ª quarta-feira do mês",
  "1ª e 3ª quinta-feira do mês", "1ª sexta-feira do mês"), registradas com nota explicativa porque
  o schema só comporta recorrência semanal.
- `horariodemissa.com.br` tem **1 única igreja cadastrada em toda a diocese** (Catedral, dados de
  01/01/2014) e **não foi usado**. `missas.com.br` não trouxe nada.

## Pontos para o enxame de validação

1. **CEP da Cúria divergente dentro do próprio site**: a página `Institucional` informa
   `Rua Santana, 2612 – CEP 97501-504`; o rodapé e a página `Contato` informam `97510-471`.
   Adotou-se **97501-504** (coerente com o CEP da Catedral, na mesma rua, nº 2646).
2. **Nome da Catedral**: o site chama de "Paróquia Sant'Ana - Catedral"; gcatholic registra
   "Catedral Senhora Sant'Ana" e a Wikipédia "Catedral Sant'Ana". Gravado como
   **`Catedral Sant'Ana`** (slug `santana-uruguaiana`), seguindo a regra de prefixo do README.
3. **Nomes abreviados no site foram expandidos**: "Paróquia N. S. da Conceição Aparecida" →
   `Paróquia Nossa Senhora da Conceição Aparecida`; "Paróquia S. João Batista" (Uruguaiana) →
   `Paróquia São João Batista`. Confirmar se a diocese usa mesmo a forma extensa.
4. **Duas paróquias homônimas**: `Paróquia São João Batista` existe em Quaraí e em Uruguaiana —
   são paróquias distintas, diferenciadas pelo slug (`-quarai` / `-uruguaiana`).
5. **Telefones sem o 9 inicial / com ponto**: o site grafa "(55) 9 8443.5123", "(55) 3412.1861 e
   9 9613.2147". Foram normalizados para `(55) 98443-5123` e `(55) 3412-1861` (o segundo número,
   quando havia dois, não foi gravado).
6. **Paróquia São José Operário (Barra do Quaraí)** não publica telefone nem e-mail — campos nulos.
7. **Adorações sem horário informado**: a Catedral ("quinta-feira às 7h15min e Adoração ao
   Santíssimo") e a Paróquia São Miguel Arcanjo ("quinta às 16h ... e durante o dia Adoração ao
   Santíssimo") anunciam adoração sem hora de início/fim. **Não foram criados registros
   `ADORATION`** para elas — só uma nota no horário da missa. A Paróquia São Francisco de Borja,
   que informa "das 6h até 16h45min", tem registro `ADORATION` próprio.
8. **Novena não registrada**: a Paróquia Nossa Senhora do Carmo tem "Novena à N. Sra. do Carmo"
   às quartas, 19h — não existe tipo correspondente no schema (`MASS`/`CONFESSION`/`ADORATION`/
   `ROSARY`); ficou apenas como nota no horário das 16h.
9. **Horário de verão**: Paróquia Imaculada Conceição (São Borja) e Paróquia Nossa Senhora
   Conquistadora (Alegrete) informam que as missas noturnas mudam de horário no verão/inverno.
   Registradas as do horário normal, com a variação em `notes`.
10. **Fora do arquivo, de propósito**:
    - **Santuário Diocesano de Nossa Senhora Conquistadora** (Uruguaiana) — ainda **em
      construção**, com missa apenas mensal, sempre no dia 15. Não é paróquia.
    - **Capelania Militar de Uruguaiana**, registrada pelo gcatholic — não é paróquia.
11. **Página com erro de PHP**: `.../diocese/santuario-diocesano` devolve avisos
    `Notice: Undefined offset` no rodapé — o site tem falhas, mas as fichas de paróquia estão íntegras.
12. **`neighborhood` quase sempre nulo**: o site raramente informa bairro (só "Cidade Alta", em
    Alegrete). Os endereços vieram completos, mas sem bairro.
