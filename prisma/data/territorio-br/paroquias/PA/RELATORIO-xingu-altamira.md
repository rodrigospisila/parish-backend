# Relatório — Diocese de Xingu-Altamira (PA)

Pesquisa: 18/09/2026. Arquivo: `xingu-altamira.json`.

## Resultado

| | |
|---|---|
| Unidades pastorais | **18** (13 paróquias, 5 áreas pastorais) |
| Confiança das unidades | 16 `alta`, 2 `media`, 0 `baixa` |
| Comunidades | 26 (15 `alta`, 5 `media`, 6 `baixa`) |
| Horários fixos | 26 (2 `media`, 24 `baixa`) — **nenhum `alta`** |
| Cobertura | 18/18 |

## Fontes principais

1. **Site oficial — `https://xingualtamira.com.br`** (plataforma Cúria Online, versão nova, com URLs limpas;
   o `dioceses.json` tem `website: null`). **Está parado desde 17/07/2020** — é a última notícia publicada.
   - `/historia` → **a melhor fonte**: texto oficial ("12 paróquias e 05 Áreas Pastorais, situadas em 10
     municípios") + **uma tabela com as 17 unidades, município e data de fundação**.
   - `/paroquias` → 13 fichas (`/paroquias/63..75/<slug>`): fundação, pároco, atendimento, endereço,
     bairro, CEP, telefone, e-mail, festa do padroeiro e grade de missa por dia da semana.
   - `/horariosdemissa` → grade consolidada: só **5 paróquias** publicam horário.
   - `/curia` → endereço, telefone e e-mail da Cúria.
2. **Wikipédia** (`Diocese de Xingu-Altamira`) — única fonte a listar a **13ª paróquia**, N. Sra. Aparecida
   da Transamazônica.
3. **`avozdoxingu.com.br`, 13/09/2026** — "Padre Gerfeson Mendes toma posse como novo pároco de Vitória do
   Xingu": confirma a paróquia da Transamazônica (km 140 da BR-230, Uruará), diz que o padre ficou três anos
   nela (logo, existe desde ~2023) e dá o pároco **atual** de Vitória do Xingu.
4. **`catholic-hierarchy.org`** (12 paróquias em 2022; os 10 municípios) e **`gcatholic.org`**
   (12 igrejas paroquiais, atualizado em 01/01/2026).
5. **Portal extinto da Prelazia do Xingu** (`prelaziadoxingu.com.br`, Joomla — o domínio **não existe mais**,
   NXDOMAIN no registro.br) recuperado pelo **Arquivo da Internet**: índice das 16 paróquias e áreas da antiga
   prelazia, endereço e pároco da Catedral, comunidades do Perpétuo Socorro e as cartas do pároco de Souzel
   (2017–2018), com horários e comunidades.
6. `liriocatolico.com.br` (agregador) — 5 fichas no território (4 em Altamira, 1 em Porto de Moz).
7. **Receita Federal / Mapa das OSC — não fecharam a lista aqui** (ver abaixo).

## A Receita não serve para esta diocese

Diferente de Itaituba, Castanhal ou Bragança: o CNPJ **04.892.592** (DIOCESE DE XINGU-ALTAMIRA, início em
13/09/1971 — herdado da Prelazia do Xingu) tem **apenas 2 estabelecimentos**: a Cúria e o *Centro de Formação
Bethânia*. E a busca avançada do Mapa das OSC/IPEA por razão social nos **10 municípios** da diocese
(Altamira, Anapu, Brasil Novo, Gurupá, Medicilândia, Placas, Porto de Moz, Senador José Porfírio, Uruará e
Vitória do Xingu) **não encontrou nenhuma paróquia** — nem com CNPJ próprio, nem como filial. O único
resultado em Altamira foi a filial da **Prelazia de Itaituba** em Castelo de Sonhos (ver
`RELATORIO-itaituba.md`). Conclusão: nesta diocese as paróquias não têm inscrição própria; a lista teve de
fechar pelo cruzamento site + Wikipédia + gcatholic + catholic-hierarchy.

## Horários: o ponto fraco

**Nenhum horário entrou como `alta`.** Só há um bloco `media`:

- **Paróquia São Brás (Porto de Moz)** — domingo 19:30 e terça 19:30, iguais na página oficial e na ficha do
  Lírio Católico (base de 02/09/2026): duas fontes independentes que coincidem.

Tudo o mais é `baixa`, por um de três motivos:

- **Publicado pela diocese, mas em 2020** (portal parado): Imaculada Conceição (Altamira), Imaculada Mãe dos
  Pobres (Medicilândia), N. Sra. Auxílio dos Cristãos (Vitória do Xingu), N. Sra. Aparecida (Placas).
- **Só no agregador**: Catedral Sagrado Coração de Jesus, Santuário N. Sra. de Nazaré, Igreja São Lázaro e
  Paróquia N. Sra. do Perpétuo Socorro — todas em Altamira. A ficha oficial da Catedral tem a tabela de
  horários **em branco**.
- **Texto anterior a 2020**: Paróquia São Francisco Xavier (Souzel), cuja grade vem da carta do pároco de
  fevereiro de 2018 no portal antigo.

**Oito das 13 paróquias e as 5 áreas pastorais não têm nenhum horário publicado em nenhuma fonte.**

## Armadilhas encontradas

- **"80h00"**: a diocese publica o horário de domingo da Paróquia N. Sra. Aparecida (Placas) como "80h00".
  Li como 08:00, mas registrei `baixa` com a advertência — **não carregar sem confirmar**.
- **CEP de outra cidade**: a mesma ficha de Placas traz CEP 68371-000, que é de Altamira (Placas é
  68138-000); e o campo "Telefone" está preenchido com o texto "Nossa Senhora Aparecida". CEP e telefone
  ficaram `null`.
- **E-mail com acento**: a ficha de Vitória do Xingu publica `auxíliodoscristaos@gmail.com`; gravei sem acento.
- **Datas malformadas**: Paróquia Santa Luzia (Anapu) aparece com fundação "12/13/1998" (mês 13) — gravei só
  o ano, 1998. Catedral e São Francisco Xavier trazem "00/00/0000" na ficha e data completa na tabela de
  história; prevaleceu a tabela.
- **Registro-fantasma do CMS**: o `alt` de uma foto do clero da Catedral diz "Arquidiocese de Goiânia" — é
  sobra do template da plataforma, não dado da diocese.
- **Divergência entre fontes sobre Anapu**: o `gcatholic.org` registra a igreja de Anapu como *Nossa Senhora
  de Fátima* (nome que ele também dá à de Uruará); o site da diocese, a Wikipédia e o portal antigo da
  prelazia dizem **Santa Luzia**. Ficou Santa Luzia.
- **Pároco velho na ficha**: a ficha de Vitória do Xingu ainda traz o pároco de 2020; a reportagem de
  13/09/2026 dá o atual. Guardei o antigo em `archived.priestName2020`. Os outros 11 nomes de pároco vêm das
  fichas de 2020 e **muito provavelmente estão desatualizados**.
- **Pacajá não é desta diocese**: o Lírio Católico tem a "Paróquia Cristo Rei do Universo" em Pacajá, mas
  Pacajá não está entre os 10 municípios da Xingu-Altamira nem no gcatholic. Deve ser da Diocese de Cametá —
  **deixei de fora**; o agente de Cametá precisa checar.

## Precisa de validação humana

1. **Toda a grade de horários.** Dos 26 horários, 24 são `baixa`. Se o Parish precisar de horário no Xingu,
   isso só sai por contato direto ou pelas redes sociais das paróquias (a diocese tem Instagram
   `@diocesedexingu` e Facebook `DioceseXingu`, que não consegui ler nesta rodada).
2. **Paróquia N. Sra. Aparecida da Transamazônica** (`media`): confirmar a data de ereção, o endereço exato e
   o pároco atual (o anterior saiu em setembro de 2026).
3. **Área Pastoral N. Sra. de Guadalupe** (`media`): a tabela oficial diz Altamira, o texto da mesma página
   diz que Vitória do Xingu tem uma área pastoral, e o portal antigo a situava em **Belo Monte** (vila de
   Vitória do Xingu). Adotei Vitória do Xingu — conferir.
4. **Os 11 párocos das fichas de 2020.** Só dois têm corroboração: Pe. Vandeir Lima Alves (Catedral, também
   no portal antigo) e Pe. Gerfeson Mendes dos Santos (Vitória do Xingu, notícia de 2026).
5. **Endereços faltando**: sete das 13 paróquias não têm endereço publicado (Santa Luzia/Anapu, Corpo e
   Sangue de Cristo/Brasil Novo, Santo Antônio/Gurupá, N. Sra. de Fátima/Uruará, e parcialmente Perpétuo
   Socorro e a paróquia da Transamazônica), e quatro das cinco áreas pastorais não têm nenhum dado além do
   nome, do município e da data de fundação.
6. **Comunidades**: a diocese nunca publicou lista. As 8 comunidades que não são matriz vieram do portal
   extinto da prelazia (2016–2018) e do agregador. É a maior lacuna do arquivo — numa diocese de
   247.501 km² com comunidades ribeirinhas, de estrada (Transamazônica) e indígenas.
7. **Igreja São Lázaro e Santuário N. Sra. de Nazaré** (Altamira): o agregador não diz a paróquia; atribuí
   provisoriamente à Catedral (no caso do Santuário, porque o portal antigo guardava a foto dele na pasta de
   comunidades da Catedral).

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- `website`: está `null`; o correto é **`https://xingualtamira.com.br`** (site oficial, embora parado desde
  julho de 2020).
- `email`: está `null`; a página da Cúria publica **`diocesexingualtamira@outlook.com`**.
- `phone`: está `(93) 3515-2494` (vem do catholic-hierarchy); a página da Cúria e a Receita dão
  **`(93) 3515-1761`**.
- `address`: "Av. Joao Pessoa 1212, Centro" está correto — só falta o acento ("Av. João Pessoa, 1212").
  `zipCode` 68371-040 confere com a Receita.
- `foundedYear`: está **1934** (ano da Prelazia do Xingu). A diocese foi criada em **06/11/2019** pela bula
  *Tamquam fidei nomen*; 1934 é a origem da prelazia que lhe deu território. Como o `type` gravado é
  "Diocese", vale decidir qual das duas datas o campo representa.
- `bishopName`: "Dom João Muniz Alves, O.F.M." está correto (confirmado em notícia de setembro de 2026).
