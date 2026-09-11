# Diocese de Caxias do Maranhão (MA) — relatório de pesquisa

- **Arquivo**: `paroquias/MA/caxias-do-maranhao.json`
- **Data da coleta**: 2026-09-11
- **Cobertura**: **31 / 31 paróquias (100%)** — 29 `alta`, 2 `media`
- **Comunidades**: 52 (31 matrizes + 21 capelas, todas de uma única paróquia)
- **Horários fixos**: **0** — a diocese não publica nenhum

## Fontes principais

| Fonte | Uso |
|---|---|
| `https://diocesedecaxiasdomaranhao.org/wp-json/wp/v2/pages?per_page=100` | 93 páginas; 37 com título de paróquia. Traz o `content.rendered` de cada ficha |
| Fichas em `?page_id=<N>` | Endereço, CEP, telefone, e-mail, pároco de 29 paróquias |
| `…/2024/06/19/capelas-sbeneditocx/` | As 21 capelas da Paróquia São Benedito (Caxias), em 4 setores, com bairro |
| `https://pt.wikipedia.org/wiki/Diocese_de_Caxias_do_Maranhão` | Lista de paróquias **por município** — o artigo cita a própria página `/paroquias/` da diocese |
| `https://www.catholic-hierarchy.org/diocese/dcxdm.html` | Nº esperado: **31** (Anuário Pontifício 2024, dados de 2023) |

## Como a lista foi fechada

O site **não tem índice navegável de paróquias**: `/paroquias/` mostra uma paróquia só (Aldeias
Altas) e a página "PADRES" está "Em Construção!". Não há tipo personalizado, nem sitemap de
paróquias — cada ficha é uma página comum do WordPress, sem link entre elas. A API REST de `pages`
resolveu: filtrando os títulos que começam por "Paróquia/Catedral/Matriz" saíram 37 páginas.

Dessas 37:
- **29 com conteúdo** e dados completos;
- **2 pares duplicados** — Fortuna ("Nossa Senhora de Lurdes" id 3771, de 2024, e "Nossa Senhora de
  Lourdes" id 1357, de 2018) e São Domingos do Maranhão (ids 3758 e 1354). Ficou a ficha mais
  recente de cada;
- **6 páginas vazias** (ids 3619, 3621, 3623, 3625, 3627, 3633) — só título, sem corpo.

Quatro das vazias são títulos que já existem com conteúdo em outra página. **Duas são paróquias
reais que só existem ali**, e é a Wikipédia (citando a página `/paroquias/` da diocese) que dá o
município:

- **Paróquia São Pedro e São Paulo — Timon** (id 3633): sem ela Timon teria 4 paróquias, e tanto a
  Wikipédia quanto a contagem do Anuário pedem 5.
- **Paróquia São Benedito — Sucupira do Riachão** (id 3623): único registro do município, que a
  Wikipédia lista com uma paróquia.

Com as duas, 31 — exatamente o número do Anuário Pontifício 2024. Elas entram como `media` (sem
endereço, telefone, e-mail nem pároco). Todas as outras 29 são `alta`.

A Wikipédia também lista **Aldeias Altas fora da sua contagem por município**, mas a paróquia existe
e tem ficha completa e recente no site (atualizada em 06/11/2025). Ela entra.

## Horários: zero, por decisão consciente

**Nenhuma das 31 fichas publica horário de missa.** A busca interna do site por "horário missa" só
devolve notícias antigas (horários de Finados de 2021, missas diocesanas da pandemia em 2020). Não
há página de horários na diocese.

Não recorri a agregadores: pela escala do README, agregador sozinho é `baixa` e não carrega; e
cobrir 31 paróquias por agregador custaria muito para entregar dado de qualidade pior que a base
oficial já levantada. Fica o mesmo caminho de Pouso Alegre, Caratinga, Almenara e Leopoldina:
**a diocese entra em produção sem horário**.

## Comunidades: só uma paróquia publica

Apenas a **Paróquia São Benedito (Caxias)** tem página de capelas, e é ótima: 21 comunidades em 4
setores pastorais (Sagrada Família, Unidos pelo Amor, Luz das Missões, Missionários do Reino), cada
uma com histórico e bairro. As outras 30 entram só com a matriz.

## Precisa de validação humana

1. **São Pedro e São Paulo (Timon)** e **São Benedito (Sucupira do Riachão)** — confirmar endereço,
   telefone e pároco. Hoje só existe o nome, e a página oficial delas está vazia.
2. **Nome em Fortuna**: a ficha nova grafa "Lurdes" e a antiga "Lourdes". Adotei "Lurdes", da ficha
   de 2024. A Wikipédia também usa "Lurdes".
3. **Nome em Jatobá**: a ficha diz "Paróquia São Francisco" e a Wikipédia "Paróquia São Francisco
   de Assis". Mantive o da fonte oficial.
4. **E-mail repetido**: `paroquianazare@hotmail.com` aparece tanto em Nossa Senhora de Nazaré quanto
   em Nossa Senhora do Perpétuo Socorro (Volta Redonda), ambas em Caxias. Uma das duas está errada.
5. **Pároco repetido**: Pe. José Pedro consta em Passagem Franca **e** em Barão de Grajaú;
   Pe. Ricardo Rios em Gonçalves Dias **e** na ficha antiga de Fortuna. Pode ser acúmulo real ou
   ficha desatualizada.
6. **Telefone malformado** em Parnarama: a ficha traz "(99) 9824-8195" com 8 dígitos no celular.
7. **Três administradoras/administradores não presbíteros** aparecem como responsáveis:
   Ir. Helena Maria Tessarim (Jatobá), Ir. Rosângela Macêdo (Gov. Luiz Rocha) e o
   Diác. Nicolau de Jesus Bezerra (São João do Sóter). Está correto na fonte — são administradores
   paroquiais, não párocos — e ficou registrado assim em `priestName`.
8. **Duas "Comunidade Santa Rita" na Paróquia São Benedito**, em bairros diferentes (Pequizeiro e
   São Francisco). Renomeei a segunda para "Comunidade Santa Rita do Bairro São Francisco" para não
   se fundirem na carga; o nome na fonte é só "Comunidade Santa Rita".
9. As fichas de 5 paróquias não foram tocadas desde 2018 (ids 1357, 1354, 1369). Foram substituídas
   ou mantidas conforme o caso, mas o dado é velho.
10. **CNPJ não consultado**: não localizei o CNPJ da Mitra Diocesana de Caxias do Maranhão — as
    buscas devolvem a Mitra de **Caxias do Sul** (RS), e o `casadosdados` está atrás de Cloudflare.
    Como a lista já fechou em 31/31 contra o Anuário, a varredura de filiais na Receita não era
    necessária; fica registrada como caminho para enriquecer endereço e CEP das fichas incompletas.
