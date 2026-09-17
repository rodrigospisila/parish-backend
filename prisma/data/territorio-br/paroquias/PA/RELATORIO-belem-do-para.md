# Relatório — Arquidiocese de Belém do Pará (`belem-do-para`)

Pesquisa em 2026-09-17. Arquivo: `belem-do-para.json`.

## Resultado

| Item | Valor |
|---|---|
| Entradas no arquivo | **113** — 101 paróquias (Catedral, Basílica de Nazaré, 7 paróquias-santuário, 92 paróquias), 8 áreas missionárias, 4 reitorias |
| Confiança das entradas | 113 `alta` · 0 `media` · 0 `baixa` |
| Comunidades | 119 (113 igrejas-sede + 6 comunidades/capelas da Paróquia de Nazaré) |
| Horários fixos | 781 — 779 `alta`, 2 `baixa` (773 missas, 3 adorações, 5 terços) |
| Entradas sem horário | 10 (ver "Valor de preenchimento 00:00") |
| Cobertura | **101/101 paróquias** e 113/113 circunscrições pastorais declaradas pela própria arquidiocese |
| Municípios | Belém 72 · Ananindeua 26 · Marituba 9 · Benevides 4 · Santa Bárbara do Pará 2 |

## Fonte principal — o buscador oficial tem uma API interna

A página `https://arquidiocesedebelem.com.br/paroquias-e-missas/` é um buscador (plugin WordPress próprio,
`bdoctopass-master`) que não traz nada no HTML. Os dados vêm de
`POST /wp-admin/admin-ajax.php` com `action=bdgetparishes` e `data[locationType]=city`, `data[city]=` vazio:
**uma chamada devolve as 113 fichas** em JSON, com nome, clero (pároco, vigários, reitor), endereço em
formato Google Places, telefones, e-mail, coordenadas, região episcopal e a grade de missas por dia da
semana (índice 0 = domingo, igual ao do dataset). Repetindo a chamada com cada ID do filtro de cidade
(679 Ananindeua, 680 Belém, 692 Benevides, 689 Benfica, 721/720/722 distritos de Icoaraci, Mosqueiro e
Outeiro, 688 Marituba, 719 Santa Bárbara) obtive a cidade oficial de cada ficha.

O tipo de conteúdo das paróquias não é público na REST do WordPress nem aparece no sitemap, então não há
data de modificação por ficha. Sinais de atualidade usados para classificar tudo como `alta`:

1. `page-sitemap.xml`: `paroquias-e-missas` e `a-arquidiocese` modificadas em **2026-02-16**; o site
   publicou notícia em 15/09/2026.
2. O clero do buscador reflete **10 das 11** transferências anunciadas em 28/12/2025
   (`/transferencias-de-padres-2026/`).
3. Conferência por amostragem contra os sites das próprias igrejas: **Catedral** (rodapé de
   catedraldebelem.com.br) e **Basílica de Nazaré** (basilicadenazare.com.br) — grades idênticas às da API.

### Prova de completude

A página oficial "A Arquidiocese" declara: *"93 paróquias, oito Áreas Missionárias, sete Paróquias
Santuários, quatro Reitorias e uma Basílica Santuário, somando, ao todo, 113 Circunscrições Pastorais"* —
exatamente a composição devolvida pela API (93 + 7 + 1 = 101 paróquias; + 8 + 4 = 113). A Wikipédia repete
101 paróquias + 8 áreas missionárias. O Anuário Pontifício 2024 (catholic-hierarchy) registra 103 paróquias
em 2023; a diferença de 2 não é explicada por nenhuma fonte e fica superada pela declaração oficial de 2026.

O cadastro da Receita (`minhareceita.org`, CNPJ-base **04.814.851**, 103 ordens varridas, 96 ativas) **não
serve de prova de completude aqui**: paróquias confiadas a ordens religiosas (Basílica/Barnabitas,
Capuchinhos, Trindade, São Raimundo etc.) não são filiais da mitra, e 6 filiais ativas são de paróquias que
desde 2004 pertencem à Diocese de Castanhal (Vigia, Terra Alta, Salinópolis, São João de Pirabas, duas em
Santa Maria do Pará). Além disso, em 7 dos ~20 casos comparáveis o número do imóvel e/ou o CEP da Receita
**divergem** do endereço oficial (Praça Vera Cruz 262 × 682; Rua Cristo Redentor 174 × 231; Tv. Mauriti
CEP 66093-681 × 66095-360), e o CEP 66630-505 se repete em 5 bairros diferentes. Uso adotado, conservador:
gravei o campo `cnpj` nas 87 fichas casadas e preenchi o endereço **apenas** nas 7 fichas cuja ficha oficial
veio sem logradouro (`addressSource: "receita-federal"`, com nota). A "data de início" do CNPJ não foi usada
como ano de fundação.

## Decisões de normalização

- **Nome**: tirei a numeração ("1." … "9.") e o sufixo de desambiguação ("- Jurunas", "– Benfica",
  "- Marituba"), que foi para `neighborhood`/`city` — o importador já acrescenta o bairro a homônimas da
  mesma cidade. O nome literal da fonte ficou em `notes`. Homônimas na mesma cidade: N. Sra. da Conceição
  (Cidade Velha / Carananduba), N. Sra. de Fátima (Fátima / Campina de Icoaraci), Santa Teresinha do Menino
  Jesus (Águas Lindas / Jurunas / Tenoné), São Francisco de Assis (São Brás / Campina de Icoaraci / Tapanã
  II) e, em Ananindeua, Sagrado Coração de Jesus (Distrito Industrial / Júlia Seffer).
- **Cidade**: Icoaraci, Mosqueiro e Outeiro são distritos de Belém e Benfica/Murinin são de Benevides —
  `city` recebe o município e o distrito vai no bairro.
- **Igreja-sede**: cada ficha ganhou uma comunidade `isMatriz: true` ("Matriz …", "Santuário …", a
  Catedral, a Basílica; nas reitorias, o nome da igreja que consta no endereço oficial; nas áreas
  missionárias, "Sede da Área Missionária …", para não inventar nome de igreja).
- Campos extras: `pastoralRegion` (região episcopal), `clergy` (lista completa), `addressOfficial` (texto
  literal), `latitude`/`longitude` (104 fichas), `cnpj`, `sourceLastModified`.
- Reitorias entram como entradas normais (têm grade de missa publicada e o prefixo "Reitoria" já é aceito).

## Valor de preenchimento 00:00 — NÃO é missa

Dez fichas trazem só `domingo 00:00`, claramente o valor obrigatório do CMS. **Nenhum horário foi gravado**
para elas: Áreas Missionárias N. Sra. da Esperança, N. Sra. do Cenáculo, N. Sra. Maria Mãe da Igreja, Santo
Agostinho e São João Bosco; Paróquias Menino Jesus (Santa Bárbara), N. Sra. do Perpétuo Socorro (Canaã,
Marituba), Santíssima Trindade (Ananindeua), São Clemente e São José Esposo de Maria (Outeiro).

## Comunidades

A arquidiocese **não publica** comunidades/capelas por paróquia. Só a Paróquia de Nazaré as publica no site
próprio (5 comunidades com endereço, ano de fundação e agenda semanal + a Capela Bom Pastor, onde é a missa
das 9h de segunda a quinta). As demais ficaram apenas com a igreja-sede. A recorrência mensal da Comunidade
Santa Bernardete ("primeira quinta-feira do mês, 19h – Adoração") entrou como `baixa`.

## Pontos para validação humana

1. **Paróquia São Benedito (Sacramenta)** — o buscador ainda lista o Pe. Antonio Arcanjo Cruz como pároco,
   mas as transferências de 28/12/2025 nomeiam o Pe. Marcílio Cézar Silva de Almeida. Gravei o que o
   buscador diz; é a única das 11 transferências não refletida.
2. **São Pedro Pescador (Baía do Sol, Mosqueiro)** — quinta-feira traz literalmente `19:59` (erro de
   digitação?). Gravado como `baixa` com nota.
3. **N. Sra. do Perpétuo Socorro (Telégrafo)** — a terça-feira (dia da novena perpétua) só tem `05:30`; é
   provável que faltem os demais horários do dia.
4. **Cidade divergente entre o filtro e o endereço**: Área Missionária São Paulo Apóstolo (filtro:
   Ananindeua; endereço e coordenadas: Marituba — adotado Marituba) e Paróquia Cristo Redentor (filtro:
   Ananindeua; endereço "Belém-Pará", CEP 66670 — adotado Belém; o CEP publicado "66.670-90" está truncado e
   foi completado, 66670-902, pela filial da Receita, que tem o mesmo endereço textual). Santo Antônio de Pádua, N. Sra. da Conceição de Carananduba e São Francisco das Ilhas têm
   duas cidades marcadas no filtro.
5. **Horários repetidos na mesma ficha** (removida a repetição): Perpétuo Socorro dom 17:30, Santa Maria
   Mãe de Deus dom 07:00, Santa Teresinha da Amazônia dom 08:30 — pode ser a mesma hora em dois locais
   (matriz e comunidade), informação que a API não traz.
6. **Paróquia São Miguel (Cremação)** — o site próprio (paroquiasaomiguelcremacao.com.br) publica uma grade
   diferente, mas o texto cita o "Ano de São José" (2020–2021); prevaleceu a API da arquidiocese.
7. **Reitoria N. Sra. Mãe da Divina Providência** — o endereço oficial aponta para a "Igreja São João Paulo
   II", Travessa Mauriti (Pedreira), e o e-mail é da Comunidade Católica Caju; existe também a Paróquia São
   João Paulo II (Souza). Conferir o nome da igreja.
8. **Endereços**: 57 fichas têm logradouro sem número e 61 não têm CEP (a fonte usa o formato do Google
   Places; 104 têm coordenadas). Três continuam sem logradouro: N. Sra. do Perpétuo Socorro (Canaã), São José dos Verdejantes e
   Reitoria das Mercês. Sete endereços vieram da Receita (podem estar desatualizados).
9. **E-mails suspeitos** mantidos como na fonte: `paro.quiansgracas@hotmail.com`,
   `paroqiasaojoseoperario@gmail.com` e o e-mail pessoal `anagomesferreira@outlook.com` (São Francisco de
   Assis – Icoaraci). Telefones vêm com vários números no mesmo campo, separados por " / ".
10. **Ano de fundação**: nenhuma fonte consultada publica; `foundedYear` ficou nulo em todas.

## Fontes

- https://arquidiocesedebelem.com.br/paroquias-e-missas/ (+ `wp-admin/admin-ajax.php`, `action=bdgetparishes`)
- https://arquidiocesedebelem.com.br/a-arquidiocese/ · `/page-sitemap.xml` · `/transferencias-de-padres-2026/`
- https://www.catedraldebelem.com.br/ · https://www.basilicadenazare.com.br/paroquia-de-nazare/ (horários e comunidades)
- https://paroquiasaomiguelcremacao.com.br/ (só conferência)
- https://minhareceita.org/04814851000129 e filiais 0002–0103
- https://www.catholic-hierarchy.org/diocese/dbele.html · https://pt.wikipedia.org/wiki/Arquidiocese_de_Belém_do_Pará
