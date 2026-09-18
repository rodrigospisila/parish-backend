# Diocese de Coroatá (MA) — relatório de pesquisa

Data da coleta: **2026-09-18**. Agente de pesquisa (rodada MA — fechamento do Maranhão).

## Resumo

| Item | Valor |
|---|---|
| Unidades no JSON | **25** (23 paróquias + 2 áreas pastorais) |
| Confiança | 22 `alta` / 3 `media` / 0 `baixa` |
| Comunidades | 2 |
| Horários fixos | 34, todos `baixa` |
| Cobertura | 25 encontradas × 23 esperadas (catholic-hierarchy 2023) |

## A diocese não tem nenhuma fonte de lista, exceto a Receita

- **Sem site**: `diocesedecoroata.org.br` não resolve; nenhum domínio alternativo encontrado.
- **O gcatholic não tem página de igrejas para Coroatá.** O código `coro1` (o mesmo do
  `dioceses.json`) devolve a página "Page not found → redirecting"; `coro2` é a **Diocese de
  Coroico, na Bolívia**, e `coro0`/`cora0` não existem. É a única das oito dioceses desta rodada
  sem listagem no gcatholic.
- Restou a **Receita Federal** como única fonte de lista: busca do Mapa das OSC/IPEA por razão
  social "DIOCESE DE COROATA" → **26 inscrições ATIVAS do CNPJ 05.646.203** = 1 cúria + 25
  unidades, com `nome_fantasia`, logradouro, bairro, CEP e telefone.

## O que a Receita revelou

- **Codó tem 7 paróquias** (São Sebastião, Santo Antônio, São Pedro, Santa Rita e Santa Filomena,
  Santa Terezinha, São Francisco, São Raimundo) — a cidade maior da diocese, não a sede.
- **Duas áreas pastorais em Itapecuru-Mirim**, ambas recentes: N. Sra. da Conceição
  (08/11/2022) e **São José e Nossa Senhora da Assunção (14/03/2025)**, esta última em nenhuma
  outra fonte.
- A cúria fica na **Rua Senador Leite, 935, bairro Macaranduba** (o `dioceses.json` já traz o
  logradouro certo).

## Correções de município feitas (emancipação posterior ao CNPJ)

Duas filiais têm o município do cadastro defasado, e ficaram com confiança **`media`**:

| Paróquia | Receita diz | Gravado | Por quê |
|---|---|---|---|
| N. Sra. das Graças e do Bom Caminho, Praça da Amizade, 34 | Coroatá, bairro "PERITORO" | **Peritoró** | Peritoró emancipou-se de Coroatá em 1994; não existe bairro "Peritoró" em Coroatá |
| N. Sra. Aparecida, Rua do Comércio, s/n | Itapecuru Mirim, bairro "MIRANDA" | **Miranda do Norte** | Miranda do Norte emancipou-se de Itapecuru-Mirim em 1994, e o CNPJ é de 09/05/1983. Corroboração: o único registro católico do Mapa das OSC em Miranda do Norte é a "Associação de Jovens de Miranda do Norte", **na mesma Rua do Comércio, complemento "SALÃO PAROQUIAL"** |

**Ambas precisam de validação humana.**

## Registros com nome incerto

| Unidade | Problema |
|---|---|
| **Paróquia de Matões do Norte** (Rua Igreja, 262, Centro, ATIVA desde 24/02/2011) | **Orago desconhecido.** A filial está sem `nome_fantasia` na Receita e nenhuma outra fonte publica o título. Gravei um nome provisório com a cidade — **corrigir na validação** |
| **Paróquia São Sebastião de Codó** (Praça Palmério Cantanhede, 1486) | também está sem `nome_fantasia` na Receita; o orago veio da ficha do Lírio Católico "Igreja São Sebastião", **no mesmo endereço e bairro**. Confiança `alta` |
| **Paróquia N. Sra. da Conceição de Alto Alegre do Maranhão** | o `nome_fantasia` da Receita vem truncado: "PAROQUIA NOSSA DA CONCEICAO" |

## Horários (todos `baixa`)

Só o Lírio Católico publica. 34 horários, de 7 unidades: Santa Rita e Santa Filomena (Codó),
São Raimundo (Codó), São Sebastião (Codó), **Catedral N. Sra. da Piedade** (Coroatá), Área
Pastoral N. Sra. da Conceição (Itapecuru-Mirim), N. Sra. das Dores (Itapecuru-Mirim) e São Mateus
(São Mateus do Maranhão).

Endereços divergentes entre Receita e Lírio, anotados em `notes` e a conferir:

- Catedral: Receita "Praça Dr. Getúlio Vargas, 56" × Lírio "Praça Monsenhor Estrela".
- São Raimundo (Codó): Receita "Rua Afonso Cunha, 1300, bairro São Raimundo" × Lírio
  "Av. Padroeiro São Raimundo, s/n, Trizidela".
- N. Sra. das Dores (Itapecuru-Mirim): Receita "Praça Cônego José Albino Campos" × Lírio
  "Avenida Brasil, 540-562".

## Comunidade vinculada por sinal publicado

A ficha do Lírio **"Igreja N. Sra. do Desterro"** (São Mateus do Maranhão, missa domingo 17:00)
traz **o mesmo Instagram oficial** da Paróquia de São Mateus (`paroquiadesaomateusoficial`), por
isso entrou como comunidade dela — com confiança `baixa`, porque o vínculo vem do handle e não de
uma publicação da paróquia.

## Para o enxame de validação humana

1. **Orago da Paróquia de Matões do Norte** (prioridade 1 — nome provisório em produção).
2. **Cidade de Peritoró e de Miranda do Norte** (prioridade 2).
3. **Endereço da Catedral** (Getúlio Vargas × Monsenhor Estrela).
4. **Párocos, comunidades e ano de ereção**: `null` em todas as 25.
5. **Contagem**: 25 unidades contra 23 paróquias do catholic-hierarchy; conferir se as duas áreas
   pastorais de Itapecuru-Mirim já são paróquias plenas.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

| Campo | Valor atual | Observação |
|---|---|---|
| `address` | "Rua Senador Leite 935" | a Receita acrescenta o bairro **Macaranduba** |
| `phone` | "(99) 3641-1425" | confirmado pela Receita no registro da cúria |
| `sources` | inclui `gcatholic.org/dioceses/diocese/coro1.htm` | **o link de igrejas correspondente (`/churches/local/coro1`) está morto**; o gcatholic não mantém lista de igrejas para Coroatá. A página da diocese em si continua válida |

`bishopName` (Dom Sebastião Bandeira Coêlho), `website: null`, `zipCode` (65415-000) e
`foundedYear` 1977 (ereção da diocese, 26/08/1977) conferem — **não alterar**.
