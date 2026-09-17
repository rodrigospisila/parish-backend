# Relatório — Diocese de Patos (`patos`, PB)

Pesquisa em 11/09/2026.

## Fontes

| Fonte | Papel |
|---|---|
| **https://diocesedepatospb.org.br/foranias/** | **Única fonte oficial da lista.** Traz as 7 foranias com o nome e o município de cada paróquia e área pastoral. **Não traz endereço, telefone, e-mail, pároco nem ano de criação** — e o site não tem página por paróquia. |
| https://diocesedepatospb.org.br (rodapé) e catholic-hierarchy.org | Cúria (Rua Peregrino Filho, 76, Centro, 58700-450, (83) 3421-2250) e bispo (Dom Eraldo Bispo da Silva). |
| https://www.horariodemissa.com.br | Endereço, bairro e telefone de 21 paróquias e os poucos horários existentes. |

## Cobertura

| Métrica | Valor |
|---|---|
| Entradas | **41** — 38 paróquias e 3 áreas pastorais |
| Municípios | **31** |
| Confiança | **41 alta** (nome e município são de fonte oficial) |
| Com endereço/bairro | 21 (todos do agregador) |
| Com telefone | 21 (todos do agregador) |
| Com CEP / e-mail / pároco / ano de fundação | **0** |
| Comunidades/capelas | **0** |
| Horários fixos | **22**, em 5 paróquias — **todos `baixa`** |

Foranias: Vale do Sabugi (6), Malta (3), Serra de Teixeira (5), Vale das Espinharas (14),
Serra de Princesa Isabel (5), Vale do Piancó (5), Serra do Cariri (3).

A `Paróquia de Nossa Senhora da Guia` de Patos foi renomeada para **`Catedral Nossa Senhora da
Guia`** (é a sé diocesana; o agregador a chama "Catedral Diocesana Nossa Senhora da Guia").

## O que ficou faltando

1. **Contato de 20 paróquias e CEP/e-mail/pároco/ano de todas as 41.** A Diocese simplesmente não
   publica. É a circunscrição com a lista mais pobre desta rodada — embora a lista em si esteja
   completa e seja oficial.
2. **Horários.** A Diocese não publica grade. O horariodemissa.com.br tem 21 fichas na diocese mas
   **só 5 com horário cadastrado** (Santo Antônio/Patos, N. Sra. da Conceição/São Mamede, Santa
   Luzia/Santa Luzia, São Sebastião/Catingueira e N. Sra. do Livramento/Livramento). **36 das 41
   paróquias ficam sem nenhum horário**, e os 22 existentes são `baixa`.
3. **Comunidades/capelas: zero.**

## Precisa de validação humana

1. **Divergência de dedicação em Manaíra.** A Diocese lista "Paróquia de Nossa Senhora das Dores –
   Manaíra"; o horariodemissa.com.br registra "Paróquia Divino Espírito Santo" no Centro de Manaíra,
   telefone (83) 3458-1040. **Não foram casadas** — conferir qual é a matriz.
2. **Duas paróquias com a mesma dedicação e telefone em Patos**: `santo-antonio-patos` e
   `sao-pedro-patos` aparecem no agregador com o mesmo telefone (83) 3421-2534. Um dos dois está
   errado.
3. **`Paróquia Nossa Senhora da Conceição – Água Branca`** é chamada "Paróquia Imaculada Conceição"
   pelo agregador; **`Paróquia Imaculada Conceição de Maria – Imaculada`** aparece como "Paróquia
   Nossa Senhora da Conceção" (com erro de digitação); **`Paróquia Santa Maria Madalena – Teixeira`**
   aparece como "Paróquia Santa Madalena". Mantive o nome da Diocese e casei o contato/horário.
4. **Erros de digitação na própria página da Diocese**: "Paroquia Sao Jose – Cacimbas" (sem acentos)
   e "Area Pastoral" (sem acento) — corrigidos na gravação.
5. **Buscar uma fonte melhor**: vale procurar um anuário/guia diocesano em PDF ou as redes sociais
   das paróquias — do jeito que está, o app mostrará 41 paróquias sem endereço nem horário em 31
   municípios.
