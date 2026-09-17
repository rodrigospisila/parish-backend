# Relatório — Diocese de Cajazeiras (`cajazeiras`, PB)

Pesquisa em 11/09/2026.

## Fontes

| Fonte | Papel |
|---|---|
| **6 páginas de forania do site oficial** — `https://diocesedecajazeiras.com.br/forania-de-cajazeiras/`, `-catole-do-rocha`, `-itaporanga`, `-pombal`, `-sao-joao-do-rio-do-peixe`, `-sousa` | **Fonte principal.** Por paróquia: data de criação, pároco, vigário, endereço completo, CEP e e-mail. |
| https://diocesedecajazeiras.com.br/governo-diocesano/ | Bispo diocesano (Dom Francisco de Assis Gabriel dos Santos). |
| https://www.horariodemissa.com.br | Única fonte de horários. |

**Duas armadilhas do site:**
1. A página `/paroquias/` do menu responde **404** — só as 6 páginas de forania funcionam.
2. Os **e-mails são ofuscados pelo Cloudflare** (`class="__cf_email__" data-cfemail="…"`); aparecem
   como "[email protected]" no texto. Foram decodificados do atributo `data-cfemail`
   (XOR com o primeiro byte) — sem isso, 62 e-mails se perderiam.

O domínio `diocesedecajazeiras.org.br` (citado em buscas) **não responde**; o certo é
`diocesedecajazeiras.com.br`.

## Cobertura

| Métrica | Valor |
|---|---|
| Entradas | **64** — 60 paróquias, 1 quase-paróquia, 2 áreas pastorais e 1 santuário |
| Municípios | **53** |
| Confiança | **64 alta** |
| Com endereço | 64 |
| Com CEP | 63 |
| Com e-mail | 62 |
| Com pároco | 64 |
| Com data de criação | 63 (de 1772 a 2014) |
| Comunidades/capelas | **0** |
| Horários fixos | **65**, em 11 paróquias — **todos `baixa`** |

A Diocese se descreve com "61 paróquias, 1 quase-paróquia e 2 áreas pastorais" = 64. Bate
exatamente com o que foi extraído (contando o Santuário Bom Jesus Eucarístico de Sousa como
paróquia, que é como a Forania de Sousa o lista).

## O que ficou faltando

1. **Horários.** A Diocese não publica grade. O horariodemissa.com.br tem 54 fichas na diocese, mas
   **só 11 com horário cadastrado**. **53 das 64 paróquias ficam sem nenhum horário**, e os 65
   registrados são `baixa` (fonte única não oficial).
2. **Comunidades/capelas: zero.** As páginas de forania não as publicam.
3. **Telefone:** só 18 das 64 têm — as páginas costumam trazer só o e-mail.

## Precisa de validação humana

1. **`nossa-senhora-dos-milagres-bernardino-batista`** — a página da Forania de São João do Rio do
   Peixe não traz a data de criação (o campo "Data de Criação:" está vazio e o valor seguinte é o
   rótulo "Pároco:").
2. **`sagrada-familia-cajazeiras`** ficou **sem CEP** (único caso) — a página não informa.
3. **Endereços pouco específicos**: 17 paróquias têm apenas "Rua da Matriz, s/n" e 4 "Praça da
   Matriz, s/n". É o que a Diocese publica.
4. **`santo-antonio-marizopolis`** tem como endereço apenas "Casa Paroquial, s/n".
5. **Erros de digitação da fonte corrigidos** (registrar para não reverter): "Paróquia São Gerado
   Majella" → **São Gerardo Majella**; "Paróquia Sagrada Familia" → **Sagrada Família**;
   "Quase-Paróquia" → **Quase-paróquia**; "Sant'ana" → **Sant'Ana**.
6. **`Paróquia São Francisco de Assis` de Riacho dos Cavalos e `Paróquia São Francisco de Assis` de
   Poço Dantas dividem o mesmo e-mail** (`psparoquiasaofrancisco11@gmail.com`) nas páginas da
   Diocese — provavelmente um copia-e-cola errado numa das duas.
7. **Três paróquias em Pombal** (São Judas Tadeu, N. Sra. do Bom Sucesso e São Pedro) e **três em
   Sousa** (São João Batista, Sant'Ana e o Santuário) — conferir se São Gonçalo (distrito de Sousa)
   deve mesmo ficar com `city = "Sousa"`.
8. **`Santuário Bom Jesus Eucarístico Aparecido de Sousa`** é listado pela Forania de Sousa junto
   com as paróquias e tem pároco e horários; entrou como paróquia. Confirmar se é paróquia-santuário
   ou reitoria.
