# Diocese de Brejo (MA) — relatório de pesquisa

Data da coleta: **2026-09-18**. Agente de pesquisa (rodada MA — fechamento do Maranhão).

## Resumo

| Item | Valor |
|---|---|
| Paróquias no JSON | **20** |
| Confiança das paróquias | 20 `alta` |
| Comunidades | 0 (nenhuma fonte publica) |
| Horários fixos | 30, todos `baixa` |
| Cobertura | 20 encontradas × 21 esperadas (catholic-hierarchy 2022) |

## A diocese não tem site

`diocesedebrejo.org.br` não resolve no DNS e não foi encontrado domínio alternativo nem perfil
institucional ativo. O `dioceses.json` já traz `website: null` — **está certo**.

## Fonte que fechou a lista: a Receita Federal

Atenção ao nome: a razão social **não** é "Diocese de Brejo", é **"MITRA DIOCESANA DE BREJO"**
(CNPJ **05.626.932**). Uma busca por "DIOCESE DE BREJO" no Mapa das OSC devolve só 4 linhas, três
delas de outras dioceses (Barreiras/BA e Crato/CE, por causa dos topônimos "Tabocas do Brejo
Velho" e "Brejo Santo"). Com a razão social certa vêm **21 inscrições ATIVAS = 1 cúria + 20
paróquias**, com `nome_fantasia`, logradouro, bairro e CEP de cada uma.

**Duas paróquias que nenhuma outra fonte tem** (nem gcatholic, nem catholic-hierarchy):

| Paróquia | Cidade | Abertura na Receita |
|---|---|---|
| Paróquia Nossa Senhora da Conceição | **Belágua** | 26/11/2025 |
| Paróquia São João Batista | **Paulino Neves** | 15/12/2025 |

A de Paulino Neves é corroborada pelo Lírio Católico, que já publica a grade de missas da
"Igreja São João Batista" na Av. Dr. Paulo Ramos — o mesmo endereço da Receita.

## Cobertura: falta 1 para fechar com o catholic-hierarchy

O catholic-hierarchy conta **21** paróquias em 2022 e eu achei 20. Para caçar a que falta,
varri o Mapa das OSC por `cd_municipio` nos municípios da diocese sem filial da mitra —
**Santo Amaro do Maranhão (2110278), Santana do Maranhão (2110237) e Milagres do Maranhão
(2106672)** — e nenhum deles tem paróquia inscrita. Também não há entrada extra no gcatholic
(que lista só 18 igrejas). Fica como ponto aberto.

## Telefones: cuidado com o número da cúria

A Receita registra **(98) 3472-1151 — o telefone da própria Cúria Diocesana — em 17 das 20
filiais**. Não é o telefone da paróquia: é o do cadastro. Gravei `phone: null` nessas, com a
explicação em `notes`, e só usei número quando havia um específico e corroborado:

- Brejo (Catedral): (98) 3472-0175 — ficha do Lírio, com o Instagram oficial `paroquiadebrejo`.
- Barreirinhas: (98) 99196-2597 — Lírio, Instagram `paroquiadebarreirinhas`.
- Chapadinha / Cristo Rei: (98) 99124-3122 — Lírio, Instagram `cristoreichp` (a Receita registra
  (98) 98100-0288; ficou em `notes`).
- Paulino Neves: (98) 3487-1245 — Lírio.

## Horários (todos `baixa`)

Só o Lírio Católico publica. Entraram 30 horários, de 6 paróquias: São Bernardo (Anapurus),
N. Sra. da Conceição (Araioses), N. Sra. da Conceição (Barreirinhas), Catedral (Brejo),
Cristo Rei (Chapadinha) e São João Batista (Paulino Neves).

### Descartes

| Ficha | Cidade | Motivo |
|---|---|---|
| Capela Nossa Senhora de Fátima, Tv. N. Sra. de Fátima, 25 | Brejo | **grade implausível**: missa às 18:00 *e* 19:00 **todos os sete dias da semana**, numa capela. Regra do README ("desconfie de grade implausível") |
| Capela de Santo Antônio, R. Cel. Ângelo Miranda, 2 | Brejo | sem horário; vínculo paroquial não publicado |

## Para o enxame de validação humana

1. **Orago de Tutóia**: a Receita diz "Paróquia de Nossa Senhora da Conceição"; o gcatholic diz
   "Nossa Senhora de Nazaré". Gravei o nome da Receita. **Conferir.**
2. **A 21ª paróquia** que o catholic-hierarchy conta e ninguém lista.
3. **São Bernardo**: aparece duas vezes na Receita — filial da mitra `05.626.932/0002-49`
   (Rua Barão do Rio Branco, 494) e CNPJ próprio `07.072.408/0001-18` (Rua Barão do Rio Branco,
   486). É a mesma paróquia/santuário; gravada uma vez só.
4. **Párocos, comunidades e ano de ereção**: `null` em todas as 20. Nenhuma fonte pública traz.
5. Confirmar as duas paróquias de dezembro de 2025 (Belágua e Paulino Neves) junto à cúria.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

Nenhuma. `address` ("Residencia Episcopal, Praca Benedito Leite 166"), `zipCode` (65520-000),
`phone` ((98) 3472-1151) e `website: null` conferem com a Receita. `bishopName` (Dom José Valdeci
Santos Mendes, bispo desde 05/05/2010 pelo gcatholic) confere.

`foundedYear` 1971 é a ereção da diocese (14/09/1971) — **não alterar**.
