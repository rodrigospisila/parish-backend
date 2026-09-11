# Diocese de Bacabal (MA) — relatório de pesquisa

- **Arquivo**: `paroquias/MA/bacabal.json`
- **Data da coleta**: 2026-09-11
- **Cobertura**: **24 / 24 paróquias plenas (100%)** + 2 quase-paróquias = 26 fichas
- **Comunidades**: 26 (só as matrizes — a diocese não publica lista de capelas)
- **Horários fixos**: 50, todos `alta`, em 12 das 26 paróquias

## Fontes principais

| Fonte | Uso |
|---|---|
| `https://diocesedebacabal.org.br/paroquias` | Índice completo: 26 fichas agrupadas em 5 foranias, com município |
| `https://diocesedebacabal.org.br/paroquias/<id>/<slug>` (26 páginas) | Forania, endereço, expediente, telefone, e-mail, **grade de missas** e clero com função |
| `https://diocesedebacabal.org.br/municipios` | 26 municípios da diocese |
| `https://www.catholic-hierarchy.org/diocese/dbaca.html` | Nº esperado: **24** (Anuário Pontifício 2023, dados de 2022) |

## Coleta

Site próprio em PHP ("Cúria Online do Brasil"), não é WordPress — sem API REST e sem sitemap; a
primeira requisição devolve até um aviso PHP (`Undefined index: HTTP_ACCEPT_ENCODING`). Mas a
estrutura é limpa e o índice `/paroquias` é completo, com as fichas em `/paroquias/<id>/<slug>`.

As 26 fichas se dividem em **24 paróquias plenas e 2 quase-paróquias** (Virgem do Perpétuo Socorro,
em Brejo de Areia, e Nossa Senhora das Graças, em Satubinha). As 24 batem exatamente com o Anuário.

## Por que os horários entram como `alta`

O site está vivo: a foto da Catedral foi trocada em **10/09/2026** (ontem, pelo nome do arquivo
`catedral-de-santa-teresinha-10-09-2026-07-54-17.jpg`), as fotos do clero são de 11/2025 e as
notícias da home são recentes. Publicação oficial com sinal de atualidade — `alta` pela escala do
README. É a única das quatro circunscrições desta leva do Maranhão em que isso se aplica.

**12 das 26 paróquias publicam grade**; as outras 14 têm o bloco "Horários de Missa" vazio.

## Três horários descartados

O CMS grava `00:00` quando o campo fica em branco, e o site imprime isso como se fosse horário.
Descartei os três casos — não são missas de meia-noite:

- Paróquia Sagrados Corações de Jesus e Maria (Bom Lugar) — quarta-feira `00:00`
- Paróquia Santuário São Benedito (Pedreiras) — segunda e terça-feira `00:00`

## Comunidades: a diocese não lista

Não há página de capelas nem de comunidades. O único dado quantitativo aparece no texto histórico
de algumas fichas — a Catedral de Santa Teresinha diz ser "composta por 24 comunidades sendo 7 na
cidade e 17 na zona rural". Guardei esse número no campo extra `communitiesReportedByParish` (o
importador ignora campos desconhecidos), como pista para o enxame de validação: são 24 comunidades
reais que o dataset não tem nome para registrar. `/guiadiocesano` existe no menu mas está vazio.

## Precisa de validação humana

1. **Os nomes de 3 paróquias divergem entre o índice e os links da home.** A home aponta para
   `…/33/area-pastoral-sao-jose-da-providencia`, `…/34/quase-paroquia-sao-joao-batista` e
   `…/35/quase-paroquia-sao-raimundo`, mas tanto o índice `/paroquias` quanto o título das próprias
   fichas dizem **"Paróquia"**. Adotei "Paróquia" (título atual da ficha), o que faz a conta fechar
   em 24 contra o Anuário — mas os slugs antigos sugerem que Lagoa Grande do Maranhão, São Roberto
   e São Raimundo do Doca Bezerra podem ainda ser área pastoral / quase-paróquia.
2. **Catedral**: a ficha se chama "Catedral de Santa Teresinha" e o link antigo da home é
   "paroquia-catedral-santa-teresinha-do-menino-jesus". O orago completo é Santa Teresinha do
   Menino Jesus.
3. **Paróquia São Francisco de Assis (Lago Verde)** é a única sem nenhum clero cadastrado —
   `priestName: null`.
4. **Pe. Francisco Emerson Paiva Silva** aparece como **pároco** em São Roberto e como **diácono**
   em Poção de Pedras. Uma das duas fichas está desatualizada.
5. **E-mail repetido**: `psfaassis@outlook.com` consta em São Francisco de Assis (Lago Verde) **e**
   em Sagrados Corações de Jesus e Maria (Bom Lugar).
6. **Telefone provavelmente errado**: Sant'Ana Mestra (Pio XII) traz `(98) 3654-0142` e São José
   (Lago da Pedra) traz `(99) 3654-0142` — mesmo número com DDD diferente. Pio XII e Lago da Pedra
   são municípios distintos; um dos dois está errado (o DDD do Maranhão nessa região é 99).
7. **Quase-paróquia Virgem do Perpétuo Socorro (Brejo de Areia)** tem endereço em branco na fonte
   (o campo vem como ", , Brejo de Areia") — `address: null`.
8. **4 dos 26 municípios da diocese não têm paróquia própria**: Altamira do Maranhão, Bernardo do
   Mearim, Lago do Junco e Marajá do Sena. Provavelmente são atendidos por paróquias vizinhas;
   confirmar se não há paróquia faltando na lista.
9. **CEP**: nenhuma ficha publica CEP — todas as paróquias ficaram com `zipCode: null`.
