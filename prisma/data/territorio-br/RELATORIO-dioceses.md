# Relatório — circunscrições eclesiásticas católicas do Brasil (`dioceses.json`)

Data da pesquisa: 2026-09-09 (verificação de sites concluída na madrugada de 2026-09-10). Agente: Claude (pesquisa automatizada
com curl/Node sobre fontes públicas; sem inferência de dados — campo desconhecido = `null`).

## Resultado

- **281 circunscrições** gravadas em `dioceses.json` (esperado 2026 segundo a Wikipédia: 281 — bate).
- Confiança: alta = 279, media = 2.

### Total por tipo

| Tipo | Qtde |
|---|---|
| Diocese | 218 |
| Arquidiocese | 48 |
| Prelazia | 7 |
| Eparquia | 4 |
| Ordinariado | 2 |
| Administração Apostólica | 1 |
| Exarcado | 1 |

Observações sobre `type`: a **Arquieparquia** ucraniana de Curitiba está com `type: "Eparquia"` (o nome preserva "Arquieparquia");
a **Administração Apostólica Pessoal São João Maria Vianney** (Campos/RJ) usa o valor `"Administração Apostólica"`, que não está no
enum sugerido — o importador (`import-territorio.ts`) trata `type` como string livre, mas convém confirmar antes da carga.

### Total por regional da CNBB

| Regional | Qtde |
|---|---|
| Norte 1 | 9 |
| Norte 2 | 14 |
| Norte 3 | 8 |
| Nordeste 1 | 10 |
| Nordeste 2 | 21 |
| Nordeste 3 | 26 |
| Nordeste 4 | 8 |
| Nordeste 5 | 12 |
| Leste 1 | 11 |
| Leste 2 | 29 |
| Leste 3 | 4 |
| Centro-Oeste | 13 |
| Oeste 1 | 7 |
| Oeste 2 | 8 |
| Noroeste | 7 |
| Sul 1 | 46 |
| Sul 2 | 20 |
| Sul 3 | 18 |
| Sul 4 | 10 |

### Total por UF

| UF | Qtde |
|---|---|
| AC | 2 |
| AL | 3 |
| AM | 10 |
| AP | 1 |
| BA | 23 |
| CE | 10 |
| DF | 2 |
| ES | 4 |
| GO | 11 |
| MA | 12 |
| MG | 29 |
| MS | 7 |
| MT | 9 |
| PA | 14 |
| PB | 5 |
| PE | 10 |
| PI | 8 |
| PR | 20 |
| RJ | 11 |
| RN | 3 |
| RO | 3 |
| RR | 1 |
| RS | 18 |
| SC | 10 |
| SE | 3 |
| SP | 46 |
| TO | 6 |

(DF = Arquidiocese de Brasília + Ordinariado Militar; SP inclui as eparquias maronita e melquita e o Exarcado armênio; MG inclui o Ordinariado Oriental.)

### Por rito

- latino: 275
- null: 1
- ucraniano: 2
- maronita: 1
- melquita: 1
- armenio: 1

O Ordinariado para os Fiéis de Rito Oriental no Brasil atende a vários ritos orientais sem hierarquia própria; `rite` ficou `null`.

### Preenchimento dos campos

| Campo | Preenchidos / 281 |
|---|---|
| website | 247 |
| address | 276 |
| zipCode | 276 |
| phone | 276 |
| email | 49 |
| bishopName | 271 |
| foundedYear | 281 |
| province | 275 |

## Fontes e método

1. **CNBB — Dioceses** (https://www.cnbb.org.br/dioceses/): a página embute um mapa JavaScript `regionalMap` (regional → lista de
   circunscrições) com 280 entradas; foi a fonte primária de nome e regional. Complementos oficiais da CNBB usados:
   - https://www.cnbb.org.br/igreja-no-brasil-ganha-nova-diocese-papa-leao-xiv-criou-a-diocese-de-baturite-no-ceara/ (Diocese de Baturité, 2026, Regional Nordeste 1 — **ausente** no mapa da página "Dioceses");
   - https://www.cnbb.org.br/diocese-sao-jose-do-rio-preto-elevada-arquidiocese/ (elevação de São José do Rio Preto a arquidiocese metropolitana em 22/05/2025, sufragâneas Barretos, Catanduva, Jales e Votuporanga — a página "Dioceses" ainda a lista como diocese);
   - https://www.cnbb.org.br/regional-norte-3-da-boas-vindas-dioceses-incorporadas/ (56ª AG, 20/04/2018: Diocese de Conceição do Araguaia e Prelazia de São Félix passaram ao Regional Norte 3 — o mapa da página "Dioceses" ainda as coloca em Norte 2 e Oeste 2).
2. **Wikipédia pt — "Circunscrições eclesiásticas católicas do Brasil"** (https://pt.wikipedia.org/wiki/Circunscri%C3%A7%C3%B5es_eclesi%C3%A1sticas_cat%C3%B3licas_do_Brasil):
   tabelas por regional/província eclesiástica (província e ano de criação), seções de Igrejas orientais, outras jurisdições e sés vacantes; artigo de cada circunscrição citado em `sources` quando existente.
3. **catholic-hierarchy.org** (lista https://www.catholic-hierarchy.org/country/dbr2.html + página de cada circunscrição): tipo, estado, metropolita, regional ("Conference Region"), endereço postal, telefone, site, bispos, datas de ereção.
4. **gcatholic.org** (lista https://gcatholic.org/dioceses/country/BR.htm + página de cada circunscrição, atualizado 2026-08-30): tipo, rito, província eclesiástica, catedral (cidade-sede), site, prelados atuais, histórico.
5. **Sites oficiais**: os 265 sites indicados por gcatholic/catholic-hierarchy foram testados (HTTP) em 09/09/2026; e-mails só foram aceitos quando publicados na home **e** no domínio do próprio site.

Regras aplicadas: nome oficial em português conforme a CNBB (corrigidos erros evidentes de digitação — lista abaixo); `city` = cidade da
catedral (gcatholic), com fallback para a cidade do endereço da cúria (catholic-hierarchy); `province` = província eclesiástica da
Wikipédia, cruzada com gcatholic e catholic-hierarchy; `foundedYear` = ano da primeira ereção da sé na sua linhagem (seção
"Historical Details" do catholic-hierarchy), cruzado com o gcatholic; `bishopName` = ordinário titular ("Dom …"); sé vacante ⇒ `null`
(administradores apostólicos não entram no campo). `confidence` = **alta** quando nome/tipo/sede batem em CNBB + pelo menos uma
segunda fonte; **media** nos dois casos abaixo.

## Nomes normalizados (CNBB → arquivo)

- CNBB: "Diocese de Teixeira de Freitas – Caravelas" -> "Diocese de Teixeira de Freitas-Caravelas"
- CNBB: "Arquidiocese do Ordinariado Militar do Brasil" -> "Ordinariado Militar do Brasil"
- CNBB: "Arquidiocese de Vitória do Espírito Santo" -> "Arquidiocese de Vitória"
- CNBB: "Diocese de Cachoeiro do Itapemirim" -> "Diocese de Cachoeiro de Itapemirim"
- CNBB: "Diocese de Campanha" -> "Diocese da Campanha"
- CNBB: "Diocese de Itabira - Coronel Fabriciano" -> "Diocese de Itabira-Fabriciano"
- CNBB: "Ordinariado para os fiéis de Rito Oriental sem Ordinário próprio" -> "Ordinariado para os Fiéis de Rito Oriental no Brasil"
- CNBB: "Diocese de Primavera do Leste - Paranatinga" -> "Diocese de Primavera do Leste-Paranatinga"
- CNBB: "Diocese de Rondonópolis - Guiratinga" -> "Diocese de Rondonópolis-Guiratinga"
- CNBB: "Diocese de São Luís de Cáceres" -> "Diocese de São Luiz de Cáceres"
- CNBB: "Prelado de São Félix" -> "Prelazia de São Félix"
- CNBB: "Diocese da Santíssima Conceição Araguaia" -> "Diocese da Santíssima Conceição do Araguaia"
- CNBB: "Diocese de Ponta Pedras" -> "Diocese de Ponta de Pedras"
- CNBB: "Diocese de Xingu – Altamira" -> "Diocese de Xingu-Altamira"
- CNBB: "Prelazia de Alto Xingu- Tucumã" -> "Prelazia de Alto Xingu-Tucumã"
- CNBB: "Arquidiocese de Paraíba" -> "Arquidiocese da Paraíba"
- CNBB: "Igreja particular Arquieparquia Metropolia Católica Ucraniana São João Batista" -> "Arquieparquia de São João Batista em Curitiba dos Ucranianos"
- CNBB: "Eparquia da Imaculada Conceição do Rito Ucraniano" -> "Eparquia da Imaculada Conceição em Prudentópolis dos Ucranianos"
- CNBB: "Diocese de Piraí - Volta Redonda" -> "Diocese de Barra do Piraí-Volta Redonda"
- CNBB: "Diocese de Duque de Caixas" -> "Diocese de Duque de Caxias"
- CNBB: "Diocese de São José do Rio Preto" -> "Arquidiocese de São José do Rio Preto"
- CNBB: "Eparquia Nossa Senhora do Paraíso em São Paulo dos Grego-Melquitas" -> "Eparquia de Nossa Senhora do Paraíso em São Paulo dos Greco-Melquitas"
- CNBB: "Enxarca Apostólico para os Fiéis do Rito Armênico Residentes na América Latina e Caribe" -> "Exarcado Apostólico para os Fiéis de Rito Armênio Residentes na América Latina e México"

Nomes que diferem da Wikipédia (mantida a forma da CNBB/oficial):

- "Ordinariado Militar do Brasil" (Wikipédia: "Ordinariato Militar do Brasil")
- "Diocese de Viana" (Wikipédia: "Diocese de Viana (Brasil)")
- "Diocese de São João Del Rei" (Wikipédia: "Diocese de São João del Rei")
- "Ordinariado para os Fiéis de Rito Oriental no Brasil" (Wikipédia: "Ordinariato para os Fiéis de Rito Oriental no Brasil")
- "Diocese da Santíssima Conceição do Araguaia" (Wikipédia: "Diocese de Santíssima Conceição do Araguaia")
- "Diocese de Bom Jesus do Gurguéia" (Wikipédia: "Diocese de Bom Jesus do Gurgueia")
- "Arquieparquia de São João Batista em Curitiba dos Ucranianos" (Wikipédia: "Arquieparquia de São João Batista em Curitiba")
- "Diocese de Palmas-Francisco Beltrão" (Wikipédia: "Diocese de Palmas e Francisco Beltrão")
- "Arquidiocese de São Sebastião do Rio de Janeiro" (Wikipédia: "Arquidiocese do Rio de Janeiro")
- "Diocese de Erexim" (Wikipédia: "Diocese de Erechim")
- "Eparquia de Nossa Senhora do Líbano em São Paulo dos Maronitas" (Wikipédia: "Eparquia de Nossa Senhora do Líbano em São Paulo")
- "Eparquia de Nossa Senhora do Paraíso em São Paulo dos Greco-Melquitas" (Wikipédia: "Eparquia de Nossa Senhora do Paraíso em São Paulo")
- "Exarcado Apostólico para os Fiéis de Rito Armênio Residentes na América Latina e México" (Wikipédia: "Exarcado Apostólico da América Latina e México")

Slugs especiais: `ucraniana-sao-joao-batista-curitiba`, `ucraniana-imaculada-conceicao-prudentopolis`, `maronita-nossa-senhora-do-libano-sao-paulo`,
`melquita-nossa-senhora-do-paraiso-sao-paulo`, `armenio-america-latina-e-mexico`, `ordinariado-militar`, `ordinariado-rito-oriental`, `sao-joao-maria-vianney`.

## Registros com confiança "media"

- Ordinariado para os Fiéis de Rito Oriental no Brasil (media)
- Exarcado Apostólico para os Fiéis de Rito Armênio Residentes na América Latina e México (media)

- Exarcado armênio: na CNBB consta como "Enxarca Apostólico para os Fiéis do Rito Armênico Residentes na América Latina e Caribe"; jurisdição
  multinacional (Brasil, México, Uruguai), sé vacante desde 06/11/2024; administrador apostólico para o Brasil (desde 02/03/2026): Cardeal Odilo Scherer.
  Sede (São Paulo, Catedral Armênia São Gregório Iluminador) só pelo gcatholic. Não consta no catholic-hierarchy como entidade brasileira.
- Ordinariado Oriental: sede registrada como Belo Horizonte/MG porque o ordinário atual é Dom Walmor Oliveira de Azevedo (arcebispo de BH) e a
  CNBB o lista no Regional Leste 2; o endereço postal do catholic-hierarchy ainda é o da cúria do Rio de Janeiro (ordinário anterior) e foi descartado.

## Sés vacantes e observações sobre bispos (2026-09-09)

- Diocese de Rio Branco: sé vacante; administrador apostólico: Antônio Fontinele de Melo (Apostolic Administrator)
- Diocese de Palmeira dos Índios: sé vacante
- Diocese de Itabira-Fabriciano: sé vacante
- Arquidiocese de Cuiabá: sé vacante
- Diocese de Ponta de Pedras: sé vacante
- Diocese de Oeiras: sé vacante
- Diocese de União da Vitória: sé vacante
- Diocese de Guajará-Mirim: sé vacante
- Diocese de Limeira: sé vacante
- Exarcado Apostólico para os Fiéis de Rito Armênio Residentes na América Latina e México: sé vacante; administrador apostólico: Odilo Pedro Scherer (Apostolic Administrator for Brazil)
- Diocese de Porto Nacional: bispo eleito (ainda não empossado)

Divergências entre gcatholic e catholic-hierarchy no nome do bispo (usado o gcatholic, mais recente):

- Diocese de Santo André: bispo GC=Bishop Pedro Carlos Cipollini (Bishop) CH=Pedro Carlos Cipolini (Bishop)

## Divergências de ano de criação entre fontes (valor adotado = catholic-hierarchy, salvo indicação)

- Diocese da Santíssima Conceição do Araguaia: ano CH=1976 GC=1911 wiki=1979
- Diocese de Marabá: ano CH=1911 GC=1969 wiki=1979
- Diocese de Xingu-Altamira: ano CH=2019 GC=1934 wiki=2019
- Diocese de Cristalândia: ano CH=1956 GC=1924 wiki=2019
- Arquidiocese de Olinda e Recife: ano CH=1614 GC=1611 wiki=1910
- Diocese de Floresta: ano CH=1964 GC=1910 wiki=1910
- Diocese de Pesqueira: ano CH=1910 GC=1918 wiki=1910
- Arquidiocese de São Luís do Maranhão: ano CH=1614 GC=1677 wiki=1922

- Marabá: adotado **1969** (sé transferida/renomeada de Conceição do Araguaia para Marabá; CH "Name Changed 1969", GC "Established 1969").
- Xingu-Altamira: adotado **1934** (Prelazia do Xingu; o CH só registra a ereção da diocese em 2019).
- Nos demais casos (Conceição do Araguaia, Cristalândia, Olinda e Recife, Floresta, Pesqueira, São Luís do Maranhão) as fontes modelam
  a linhagem de forma diferente (renomeações/transferências de sé); vale validação humana se o ano for exibido ao usuário.

## Sites oficiais

- Sites substituídos por versão atual verificada (domínio antigo morto, sequestrado ou 404): 28
- Diocese de Humaitá: http://www.diocesedehumaita.org.br -> https://diocesedehumaita.com.br (site registrado no gcatholic/CH (http://www.diocesedehumaita.org.br) inacessível/404 em 09/09/2026; variante de domínio encontrada e verificada pelo título da página ("Home | Diocese de Humaitá"))
- Prelazia de Lábrea: http://prelaziadelabrea.org.br -> https://prelaziadelabrea.com.br (site registrado no gcatholic/CH (http://prelaziadelabrea.org.br) inacessível/404 em 09/09/2026; variante de domínio encontrada e verificada pelo título da página ("Página Inicial | Prelazia de Lábrea"))
- Arquidiocese de Feira de Santana: http://arquifeira.org -> https://arquidiocese-fsa.org.br (arquifeira.org (gcatholic/CH) hoje redireciona para site de moda (domínio sequestrado))
- Arquidiocese de São Luís do Maranhão: http://www.arquidiocesedesaoluis.org -> https://arquislz.org.br (arquidiocesedesaoluis.org (gcatholic/CH) hoje redireciona para site de loteria (domínio sequestrado))
- Diocese de Pinheiro: http://www.diocesedepinheiro.com -> https://diocesedepinheiro.com.br (site registrado no gcatholic/CH (http://www.diocesedepinheiro.com) inacessível/404 em 09/09/2026; variante de domínio encontrada e verificada pelo título da página ("Diocese de Pinheiro &#8211; Site oficial da Diocese de Pinheiro"))
- Arquidiocese de Uberaba: http://www.arquidiocesedeuberaba.org.br -> https://arquidiocesedeuberaba.com.br (www.arquidiocesedeuberaba.org.br (gcatholic/CH) sem DNS em 09/09/2026; domínio .com.br verificado (título "Arquidiocese de Uberaba"))
- Diocese da Campanha: http://www.diocesedacampanha.org.br -> https://diocesedacampanha.org.br (site registrado no gcatholic/CH (http://www.diocesedacampanha.org.br) inacessível/404 em 09/09/2026; variante de domínio encontrada e verificada pelo título da página ("Home | Diocese da Campanha - MG | &quot;Igreja de Campanha tecendo..."))
- Diocese de Governador Valadares: http://www.diocesevaladares.com.br -> https://diocesevaladares.com.br (site registrado no gcatholic/CH (http://www.diocesevaladares.com.br) inacessível/404 em 09/09/2026; variante de domínio encontrada e verificada pelo título da página ("Home | Diocese de Valadares"))
- Diocese de São João Del Rei: http://www.diocesedesaojoaodelrei.com.br -> https://diocesedesaojoaodelrei.com.br (site registrado no gcatholic/CH (http://www.diocesedesaojoaodelrei.com.br) inacessível/404 em 09/09/2026; variante de domínio encontrada e verificada pelo título da página ("Diocese de São João del Rei &#8211; Sob a Proteção de Nossa Senhora do Pilar"))
- Diocese de Uberlândia: http://www.dioceseuberlandia.org.br -> https://diocesedeuberlandia.org.br (www.dioceseuberlandia.org.br (gcatholic/CH) sem DNS; novo domínio)
- Diocese de Dourados: http://www.diocesededourados.com.br -> https://diocesededourados.org.br (www.diocesededourados.com.br (gcatholic/CH) sem DNS; novo TLD)
- Arquidiocese de Belém do Pará: http://www.arquidiocesedebelem.com.br -> https://arquidiocesedebelem.com.br (site registrado no gcatholic/CH (http://www.arquidiocesedebelem.com.br) inacessível/404 em 09/09/2026; variante de domínio encontrada e verificada pelo título da página ("Arquidiocese de Belém – Fé, missão e serviço"))
- Diocese de Castanhal: http://www.diocesedecastanhal.com -> https://diocesedecastanhal.com.br (site registrado no gcatholic/CH (http://www.diocesedecastanhal.com) inacessível/404 em 09/09/2026; variante de domínio encontrada e verificada pelo título da página ("Diocese de Castanhal – Igreja Católica no Pará"))
- Diocese de Afogados da Ingazeira: http://www.dioceseafogadosdaingazeira.com.br -> https://dioceseafogadosdaingazeira.org.br (site registrado no gcatholic/CH (http://www.dioceseafogadosdaingazeira.com.br) inacessível/404 em 09/09/2026; variante de domínio encontrada e verificada pelo título da página ("Início - Diocese de Afogados da Ingazeira"))
- Diocese de Caruaru: http://www.diocesedecaruaru.com.br -> https://www.diocesedecaruarupe.com (diocesedecaruaru.com.br (gcatholic/CH) hoje redireciona para site de apostas (domínio sequestrado))
- Diocese de Nazaré: https://www.diocesedenazare.com/ -> https://diocesedenazare.org.br (site registrado no gcatholic/CH (https://www.diocesedenazare.com/) inacessível/404 em 09/09/2026; variante de domínio encontrada e verificada pelo título da página ("Início - Diocese de Nazaré"))
- Diocese de Pesqueira: http://www.diocesedepesqueira.com.br -> https://diocesedepesqueira.com.br (site registrado no gcatholic/CH (http://www.diocesedepesqueira.com.br) inacessível/404 em 09/09/2026; variante de domínio encontrada e verificada pelo título da página ("Home | Diocese de Pesqueira"))
- Diocese de Umuarama: http://www.diocesedeumuarama.org.br -> https://diocesedeumuarama.org.br (site registrado no gcatholic/CH (http://www.diocesedeumuarama.org.br) inacessível/404 em 09/09/2026; variante de domínio encontrada e verificada pelo título da página ("Home - Diocese de Umuarama | Umuarama - PR"))
- Arquidiocese de São Sebastião do Rio de Janeiro: http://www.arquidiocese.org.br -> https://arqrio.org.br (arquidiocese.org.br (gcatholic/CH) redireciona para 127.0.0.1)
- Arquidiocese de Passo Fundo: http://www.arquidiocesedepassofundo.com.br -> https://arquidiocesedepassofundo.com.br (site registrado no gcatholic/CH (http://www.arquidiocesedepassofundo.com.br) inacessível/404 em 09/09/2026; variante de domínio encontrada e verificada pelo título da página ("Arquidiocese de Passo Fundo | Passo Fundo - RS"))
- Diocese de Erexim: http://www.diocesedeerexim.org.br -> https://diocesedeerexim.org.br (www.diocesedeerexim.org.br (gcatholic/CH) sem DNS; apex funciona)
- Diocese de Santo Ângelo: http://www.diocesedesantoangelo.org -> https://www.diocesedesantoangelo.com.br (site registrado no gcatholic/CH (http://www.diocesedesantoangelo.org) inacessível/404 em 09/09/2026; variante de domínio encontrada e verificada pelo título da página ("Diocese de Santo Ângelo"))
- Diocese de Propriá: http://www.diocesedepropria.org -> https://www.diocesedepropria.com (site registrado no gcatholic/CH (http://www.diocesedepropria.org) inacessível/404 em 09/09/2026; variante de domínio encontrada e verificada pelo título da página ("INÍCIO | DIOCESE DE PROPRIÁ"))
- Arquidiocese de Ribeirão Preto: http://www.arquidioceserp.org.br -> https://arquidioceserp.org.br (site registrado no gcatholic/CH (http://www.arquidioceserp.org.br) inacessível/404 em 09/09/2026; variante de domínio encontrada e verificada pelo título da página ("Arquidiocese de Ribeirão Preto &#8211; Apresentamos o site da Arquidiocese de Ribeirão Preto (SP). U"))
- Arquidiocese de Sorocaba: http://www.arquidiocesesorocaba.org.br -> https://arquidiocesesorocaba.org.br (site registrado no gcatholic/CH (http://www.arquidiocesesorocaba.org.br) inacessível/404 em 09/09/2026; variante de domínio encontrada e verificada pelo título da página ("Arquidiocese de Sorocaba | Boas vindas ao Portal da Arquidiocese"))
- Diocese de Amparo: http://www.diocesedeamparo.org.br -> https://diocesedeamparo.org.br (site registrado no gcatholic/CH (http://www.diocesedeamparo.org.br) inacessível/404 em 09/09/2026; variante de domínio encontrada e verificada pelo título da página ("Diocese de Amparo | Boas vindas ao Portal da Diocese de Amparo"))
- Diocese de Itapeva: http://www.dioceseitapeva.com.br -> https://dioceseitapeva.com.br (site registrado no gcatholic/CH (http://www.dioceseitapeva.com.br) inacessível/404 em 09/09/2026; variante de domínio encontrada e verificada pelo título da página ("Home | Diocese de Itapeva"))
- Diocese de Santos: http://www.diocesedesantos.com.br -> https://www.diocesedesantos.org.br (www.diocesedesantos.com.br (gcatholic/CH) sem DNS; novo TLD)
- Redirecionamentos absorvidos (URL final adotada): 21
- Diocese de Penedo: http://diocesedepenedo.webnode.com -> https://diocesedepenedo.webnode.page
- Arquidiocese de Feira de Santana: http://arquifeira.org -> https://figurelovefashion.com
- Diocese de Bonfim: http://diocesedebonfim.org -> https://diocesedebonfim.org.br
- Diocese de Ilhéus: http://diocesedeilheus.com.br -> https://www.instagram.com/diocesedeilheus
- Diocese de Formosa: http://diocesedeformosa.org.br -> https://diocesedeformosa.com.br
- Arquidiocese de São Luís do Maranhão: http://www.arquidiocesedesaoluis.org -> https://4dlottoresult.net
- Arquidiocese de Montes Claros: http://arquimoc.com -> https://arquimoc.org
- Diocese de Rondonópolis-Guiratinga: http://www.diocesederondonopolis.org.br -> https://dioceseroogga.org.br
- Diocese de Caruaru: http://www.diocesedecaruaru.com.br -> https://bruxo10.bet
- Arquidiocese de Maringá: http://www.arquimaringa.org.br -> http://arquidiocesedemaringa.org.br
- Diocese de Guarapuava: http://www.diopuava.org.br -> https://diopuava.org
- Diocese de Ponta Grossa: http://www.diocesepontagrossa.com.br -> https://www.diocesepontagrossa.org.br
- Arquidiocese de São Sebastião do Rio de Janeiro: http://www.arquidiocese.org.br -> http://127.0.0.1
- Diocese de Cachoeira do Sul: http://www.diocesenet.com.br -> https://congelado.k8.com.br
- Diocese de Montenegro: http://www.diocesemontenegro.com.br -> https://www.diocesemontenegro.org.br
- Diocese de Novo Hamburgo: http://www.mitranh.org.br -> https://diocesenh.org.br
- Arquidiocese de Chapecó: http://www.diocesechapeco.org.br -> https://arquidiocesechapeco.com.br
- Arquidiocese de Joinville: http://www.diocesejoinville.com.br -> https://www.arquidiocesejoinville.com.br
- Arquidiocese de Aparecida: http://www.arquidioceseaparecida.org.br -> https://arqaparecida.org.br
- Arquidiocese de Campinas: http://www.arquidiocesecampinas.com -> https://www.arquidiocesecampinas.com.br
- Arquidiocese de São José do Rio Preto: http://www.bispado.org.br -> https://arquidiocesesjrp.org.br
- Sites descartados (inacessíveis em 09/09/2026, sem substituto encontrado — `website: null`): 17
- Diocese de Irecê: http://www.dioceseirece.com.br/ (status 0)
- Diocese de Jequié: http://www.diocesedejequie.com.br (status 0)
- Diocese de Serrinha: http://diocesedeserrinha.com.br (status 0)
- Diocese de Crateús: http://www.diocesedecrateus.net.br (status 0)
- Diocese de Itapipoca: http://www.diocesedeitapipoca.org.br (status 0)
- Diocese de Limoeiro do Norte: http://www.diocesedelimoeiro.org/ (status 0)
- Diocese de Brejo: http://diocesedebrejo.com.br (status 0)
- Diocese de Grajaú: http://www.diocesegrajau.org.br (status 0)
- Diocese de Coxim: http://www.diocesedecoxim.com.br (status 0)
- Prelazia de São Félix: http://prelaziasfaraguaia.com.br (status 0)
- Diocese de Abaetetuba: http://www.semeando.org.br (status 0)
- Diocese de Guarabira: http://www.diocesedeguarabira.org.br (status 0)
- Diocese de Mossoró: http://diocesedemossoro.blogspot.com (status 404)
- Diocese de Bagé: http://diocesedebage.com.br (status 0)
- Diocese de Caraguatatuba: http://www.diocesecaraguatatuba.com.br (status 0)
- Diocese de Lins: http://diocesedelins.org (status 0)
- Eparquia de Nossa Senhora do Líbano em São Paulo dos Maronitas: http://www.igrejamaronita.org.br (status 0)
- Sites mantidos apesar de resposta de erro (bloqueio anti-robô 403/429 ou erro temporário 5xx): 13
- Arquidiocese de Belém do Pará: http://www.arquidiocesedebelem.com.br (status 503)
- Arquidiocese de Cascavel: http://arquicascavel.org.br (status 429)
- Arquidiocese de Londrina: http://arquidioceselondrina.com.br (status 429)
- Diocese de Apucarana: http://www.diocesedeapucarana.com.br (status 500)
- Diocese de Umuarama: http://www.diocesedeumuarama.org.br (status 522)
- Arquidiocese de Niterói: http://www.arqnit.org.br (status 403)
- Diocese de Itaguaí: http://dioceseitaguai.org.br (status 500)
- Arquidiocese de Passo Fundo: http://www.arquidiocesedepassofundo.com.br (status 522)
- Arquidiocese de Santa Maria: http://www.arquism.com (status 429)
- Diocese de Santa Cruz do Sul: http://www.mitrascs.com.br (status 400)
- Arquidiocese de Botucatu: http://arquidiocesebotucatu.org.br (status 403)
- Arquidiocese de Sorocaba: http://www.arquidiocesesorocaba.org.br (status 522)
- Diocese de Bauru: http://www.bispadobauru.org.br (status 403)
- Sem site conhecido em nenhuma fonte: 17
- Diocese de Alto Solimões
- Diocese de Parintins
- Diocese de São Gabriel da Cachoeira
- Prelazia de Tefé
- Diocese de Baturité
- Diocese de Balsas
- Diocese de Coroatá
- Ordinariado para os Fiéis de Rito Oriental no Brasil
- Diocese de Corumbá
- Diocese de Xingu-Altamira
- Prelazia de Alto Xingu-Tucumã
- Prelazia de Marajó
- Diocese de Floriano
- Diocese de São Raimundo Nonato
- Eparquia da Imaculada Conceição em Prudentópolis dos Ucranianos
- Eparquia de Nossa Senhora do Paraíso em São Paulo dos Greco-Melquitas
- Exarcado Apostólico para os Fiéis de Rito Armênio Residentes na América Latina e México
- Erro de dado no gcatholic: a página da Diocese de Alto Solimões aponta o site da Prelazia de Alto Xingu-Tucumã; anulado.
- Alguns "sites" são blogs/redes oficiais (blogspot, webnode) ou redirecionam para Instagram/Facebook (Ilhéus, Santa Cruz do Sul); mantidos como estão.

## Dúvidas e pendências para validação humana

- Confirmar o tratamento de `type = "Administração Apostólica"` e de `rite = null` (Ordinariado Oriental) no importador.
- Diocese de Baturité (criada em 01/01/2026): sem endereço, telefone ou site nas fontes; bispo Dom Luis Gonzaga Silva Pepeu, O.F.M. Cap.
- Endereços/telefones vêm do catholic-hierarchy (sem acentos, possivelmente desatualizados); e-mails só para 49 circunscrições.
- Arquidiocese de Vitória: CNBB usa "Arquidiocese de Vitória do Espírito Santo"; adotado "Arquidiocese de Vitória" (forma usada pela própria arquidiocese, Wikipédia, CH e GC); slug `vitoria`.
- Diocese de São Luiz de Cáceres: CNBB grafa "São Luís"; adotada a grafia das demais fontes (`sao-luiz-de-caceres`).
- Orçamento de WebSearch da sessão esgotou durante a busca de sites atuais; 17 circunscrições ficaram sem site apesar de possivelmente terem um novo domínio.

## Arquivos gerados

- `dioceses.json` — 281 registros (este relatório descreve a versão de 2026-09-09).
- `RELATORIO-dioceses.md` — este arquivo.
