# Relatório — Diocese de Abaetetuba (`abaetetuba`)

Pesquisa em 2026-09-17. Arquivo: `abaetetuba.json`.

## Resultado

| Item | Valor |
|---|---|
| Entradas | **29** — 27 paróquias + 2 áreas missionárias |
| Confiança | 16 `alta` · 11 `media` · 2 `baixa` (as áreas missionárias) |
| Comunidades | 27 (só a igreja-matriz de cada paróquia — **a diocese não publica comunidades**) |
| Horários | 42, **todos `baixa`** (39 missas + 3 confissões, de fichas de agregador de 2013–2018) |
| Cobertura | **27/27** — Receita e Wikipédia coincidem; Anuário Pontifício 2026 traz 23 (dado de 2025) |
| Municípios | Abaetetuba 9 · Barcarena 4 · Tomé-Açu 4 · Acará 3 · Tailândia 3 · Concórdia do Pará 2 · Bujaru 1 (+1 área) · Moju 1 (+1 área) |

## Situação das fontes — a diocese está sem site

- O portal oficial `semeando.org.br/portal` **não responde** (timeout). O Arquivo da Internet guarda a página
  "Endereços das Paróquias" (atualizada em 05/07/2012, capturada em 09/01/2019): **16 paróquias** com endereço,
  telefone e clero de 2012. Nada mais de útil foi capturado (só história, bispos e seminários).
- Hoje a diocese só publica em redes sociais (`instagram.com/dioceseabaetetuba`, Facebook), que exigem login;
  a página de links `beacons.ai/diocesedeabaetetuba` devolve 403 (Cloudflare).
- A página do Regional Norte 2 (`cnbbn2.com.br/diocese-de-abaetetuba/`) dá bispo, e-mail e contatos da Cúria,
  mas ainda fala em "19 paróquias".
- `anuariocatolico.com.br` não resolve (domínio fora do ar).

## Como a lista foi fechada — Receita × Wikipédia

1. **Receita Federal** (`minhareceita.org`, CNPJ-base **04.784.013**, 30 ordens varridas até a 80): Mitra + **27
   filiais de paróquia ATIVAS** (duas baixadas: Obras Sociais e o Seminário). O cadastro está vivo — 4 filiais
   são de 2024 e **6 foram abertas em 18/03/2026** (Santo Antônio de Tailândia, N. Sra. de Fátima de Quatro
   Bocas, N. Sra. de Guadalupe de Concórdia, Jesus Bom Pastor da Alça Viária, São João Paulo II de Barcarena e
   São João Batista e Imaculada Conceição do Acará).
2. **Wikipédia** (editada em 11/09/2026): "27 paróquias e 2 áreas missionárias, divididas em 4 regiões
   episcopais" — São João XXIII (a fonte grafa "XXII"), São João Paulo II, Servo de Deus Ângelo Frosi e São
   Paulo VI.
3. As duas listas **coincidem uma a uma** (27 ↔ 27), com diferenças só de denominação, registradas em `notes`.

Critério de confiança: as 16 que também constam do portal oficial de 2012 → `alta`; as 11 posteriores (Receita +
Wikipédia, duas fontes independentes) → `media`; as 2 áreas missionárias (N. Sra. da Divina Providência, em
Bujaru, e São João Batista, em Moju) só aparecem na Wikipédia, sem endereço → `baixa`.

Decisões de nome (o nome adotado é o da fonte oficial quando existe):
- "Paróquia São Paulo" (portal e Receita — "São Paulo - Estradas de Abaetetuba"); a Wikipédia diz "São Paulo Apóstolo".
- "Paróquia São Pedro" (Concórdia); a Wikipédia diz "São Pedro e São Paulo".
- "Paróquia São José" (Vila dos Cabanos); a Receita diz "São José Trabalhador".
- "Paróquia São Joaquim e Sant'Ana" (Bujaru): Receita e Wikipédia; o portal de 2012 dizia só "São Joaquim".
- "Paróquia São João Batista e Imaculada Conceição" (Acará): nome da Receita; a Wikipédia abrevia para "São João Batista".
- A Receita qualifica três paróquias de Abaetetuba pelo território: "Estradas de Abaetetuba" (São Paulo),
  "Ilhas de Abaetetuba" (N. Sra. Rainha da Paz — a paróquia ribeirinha) e "Vila de Beja" (São Miguel Arcanjo).

## Endereços, telefones e clero

- **Endereço**: o do portal oficial de 2012 quando existe (`addressSource: "portal-oficial-2012"`); senão, o da
  Receita (`"receita-federal"`), com acentos restaurados. O endereço da Receita fica sempre em `addressReceita`
  — em vários casos difere do portal (Acará: Praça Felipe Patroni × Rua Marechal Deodoro da Fonseca, 100;
  Moju: Praça da Matriz × Tv. Diogo Henderson; Tomé-Açu: Av. 1º de Setembro, 191 × Rua Darlindo Veloso),
  possivelmente igreja × casa paroquial.
- **Telefone**: os únicos publicados são os de 2012 (fixos 3751-xxxx e celulares de 8 dígitos). **Não foram
  para `phone`** — ficaram em `phoneHistoric` e nas notas — para não expor número morto no app. A Receita repete
  o celular da Cúria, (91) 99371-6175, em quase todas as filiais.
- **Pároco**: a lista de 2012 tem 14 anos; `priestName` ficou nulo em todas.
- Campo `cnpj` gravado nas 27 paróquias; `pastoralRegion` segundo a Wikipédia.

## Horários — nenhum confiável

Só o agregador `horariodemissa.com.br` tem algo (16 fichas nos 8 municípios, 7 com grade). Conferi a data de
cada ficha individual: **todas de 2013 a 2018** (Catedral 18/10/2016; Moju 10/03/2018; Concórdia 09/03/2018; as
demais de 2013). Pela regra pré-pandemia, os 42 horários entram como `baixa`, com o ano na nota. Recorrências
mensais ("Primeira Sexta-feira", "última segunda do mês") levam a regra literal em `notes`.
`buscamissa.com.br` não cobre nenhum município desta diocese. Um site Wix que a busca sugeria para a "Paróquia
São Francisco Xavier" é da homônima de **Itaquera (SP)** — descartado.

## Pontos para validação humana

1. **Horários e comunidades**: obter junto às paróquias/Instagram — especialmente a Catedral
   (`@catedraldeconceicao.oficial`) e Barcarena (`@paroquiafcoxavier`). A paróquia das Ilhas (N. Sra. Rainha da
   Paz) atende dezenas de comunidades ribeirinhas sem lista publicada.
2. **Jesus Bom Pastor** — a Receita a registra em **Acará** (Alça Viária, Ramal do Batatal); a Wikipédia, em
   Barcarena. Gravei Acará.
3. **São João Paulo II (Barcarena)** — o CEP do cadastro (67407-418) não é de Barcarena; ficou nulo.
4. **Concórdia do Pará** — o portal de 2012 dava CEP 68695-000 (que é de Tailândia); usei o da Receita (68685-000).
5. **Áreas missionárias** de Bujaru e Moju: confirmar existência, sede e endereço.
6. **Cúria**: `dioceses.json` e a Receita dão Rua Padre Luiz Varela, 1636; a CNBB N2 dá Avenida 15 de Agosto,
   400 – Centro (Caixa Postal 10), tel. (91) 99371-6175, e-mail diocesedeabaetetuba@gmail.com (com o CEP
   digitado errado, "68400-000"). Gravei o endereço da Receita e o e-mail da CNBB N2. **`dioceses.json` (não
   alterei)** está com `website: null`, o que continua correto.
7. `foundedYear` nulo em todas — a data da Receita é a do cadastro, não a da criação canônica.

## Fontes

- https://minhareceita.org/04784013000150 e filiais 0002–0030
- https://pt.wikipedia.org/wiki/Diocese_de_Abaetetuba
- https://web.archive.org/web/20190109002812/http://www.semeando.org.br/portal/index.php/paroquias.html?tmpl=component&print=1&page=
- https://cnbbn2.com.br/diocese-de-abaetetuba/ · https://www.catholic-hierarchy.org/diocese/dabae.html
- https://www.horariodemissa.com.br/ (fichas `igreja.php?k=…` de Abaetetuba, Moju, Barcarena, Tailândia, Acará, Concórdia do Pará, Tomé-Açu e Bujaru)
