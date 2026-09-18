# Relatório — Arquidiocese de Santarém (`santarem`)

Pesquisa em 2026-09-17. Arquivo: `santarem.json`.

## Resultado

| Item | Valor |
|---|---|
| Unidades | **48** — 35 paróquias (contando a Catedral) + 13 áreas pastorais/missionárias, em 12 regiões pastorais |
| Confiança das unidades | 48 `alta` · 0 `media` · 0 `baixa` |
| Comunidades | 136 (47 igrejas-sede + 89 igrejas/comunidades) — 135 `alta`, 1 `media`; a arquidiocese declara **803 comunidades**, que não publica |
| Horários | 244 — 97 `alta` · 106 `media` · 41 `baixa` (204 missas, 32 adorações, 8 terços), em 40 das 48 unidades |
| Cobertura | **48/48** — site = Wikipédia (35 + 13) = Receita (48 filiais ativas); Anuário Pontifício 2024: 46 (dado de 2023) |
| Municípios | Santarém 33 · Monte Alegre 5 · Prainha 3 · Almeirim 2 · Aveiro 2 · Belterra 2 · Mojuí dos Campos 1 |

## Fonte principal — fichas do site oficial (plataforma Cúria Online)

`https://www.arquidiocesedesantarem.org.br/paroquias` lista as 48 unidades por região pastoral; cada ficha
(`/paroquias/<id>/<slug>`) traz região, endereço com bairro, expediente, telefone, e-mail, a grade "Horários de
Missa" (um bloco da sede e um bloco por igreja, com o bairro no título) e o clero com o cargo. A página
`/horariosmissa` é só outra visão dos mesmos dados. Baixei as 48 fichas com `curl` e extraí tudo por expressão
regular (sem leitura por modelo); a grade foi convertida por regras e conferida linha a linha contra o texto.

**Atualidade** — o site não data as fichas, então procurei sinais:

- o clero das fichas reflete os Comunicados da Chancelaria de 16/01, 10/04 e **17/08/2026** (Jacamim, Fordlândia,
  Boim, Divina Misericórdia, Arapiuns, São Mateus, São Lucas) — li os comunicados, publicados como imagem;
- duas notas da Ascom sobre a Copa do Mundo (12/06 e 03/07/2026) citam os horários **habituais** de sábado e
  domingo de 13 paróquias, e todos batem com as fichas (Catedral 8h30/19h, Aparecida 8h/19h, Santíssimo 7h,
  São Sebastião 8h/19h, Sagrada Família 7h30/19h, São Raimundo 8h30, Belterra 7h30, Monte Alegre 7h etc.);
- o site próprio da Paróquia N. Sra. de Guadalupe (`pguadalupe.com.br`, avisos de ago/2026) repete a mesma grade;
- três fichas tiveram a imagem trocada há menos de 12 meses (Lago Grande 03/2026, Prainha 12/2025, Jacamim 11/2025).

Critério adotado para os horários: `alta` nas 17 fichas com confirmação específica (nota de 2026, site da
paróquia ou edição ≤ 12 meses) e na Igreja Frei Rainério; `media` nas outras (fonte oficial ativa, sem sinal
específico da ficha); `baixa` para recorrência mensal, "Missa ou Celebração da Palavra" e inferências.

### Prova de completude pela Receita

CNPJ-base **05.713.128** (ARQUIDIOCESE DE SANTAREM): 50 ordens, **todas ativas** — a Cúria (0001), o Seminário
São Pio X (0046) e **48 filiais que casam uma a uma com as 48 fichas do site**. Nenhuma filial-fóssil. As duas
mais novas explicam a diferença para o Anuário Pontifício (46): Área Pastoral N. Sra. de Nazaré Mãe de Jesus
(0049, 17/02/2025) e Paróquia N. Sra. das Graças, bairro Santa Clara (0050, 03/06/2025). O CNPJ de cada unidade
está no campo `cnpj`. CEP: usei o da Receita nos municípios de CEP único e, em Santarém, só quando a rua coincide
com a da ficha e o CEP não é genérico (ficaram sem CEP: São Raimundo Nonato, Cristo Ressuscitado, Cristo Salvador,
São José, Jacamim, Lago Grande, Arapixuna e Boim).

## Tratamento da grade

- "N. Sra." expandido; "Igreja X (Bairro: Y)" virou comunidade `Igreja X` com `neighborhood: Y`; "Com." → "Comunidade".
- **"Celebração da Palavra" não é missa e não entrou** (Aveiro, Prainha, Santa Maria do Uruará): a comunidade
  foi gravada com a frase em `notes`. "Missa ou Celebração da Palavra" (6 comunidades de Alter do Chão) → `baixa`.
- Novena/trezena sem missa não entrou (não há tipo); "Missa e Novena…" entrou como missa com o texto em `notes`;
  "Adoração e Missa" gerou um registro de cada tipo; "Terço dos Homens"/"Oração do Terço" → `ROSARY`.
- **Armadilha do 00:00**: a Igreja São Cristóvão (Paróquia do Rosário) tem "Domingo 00h00" sem rótulo — marcador
  vazio do CMS, descartado (nota na paróquia).
- Horário sem rótulo (10 registros: 8 igrejas da Paróquia Cristo Libertador; 19h30 e 21h00 de domingo em São
  Francisco de Assis) → `media` com nota. Em Cristo Libertador, a nota de 03/07/2026 confirma três desses horários.
- Recorrência mensal (33 registros `baixa`): quase toda a Área Pastoral São Lucas (12 igrejas, 3 padres), as
  primeiras sextas-feiras, Cristo Bom Pastor e Fordlândia (domingo alternando 8h/19h conforme a semana).
- 1 horário sem dia da semana: "Todo dia 22 de cada mês tem Novena e Missa de Santa Rita de Cássia, às 19h30".
- Comunidade N. Sra. do Carmo (Saubal, Guadalupe): a ficha diz "09h30 Missa"; o site da paróquia confirma o
  horário mas publica a escala — padre só no 2º e no 4º domingo. Ficou `baixa`.
- Um defeito meu, corrigido antes de gravar: "Desat**adora** dos Nós" casava com "adora" e gerava adorações
  falsas; a regra passou a exigir início de palavra.

## Igreja-sede

O importador toma como matriz a comunidade de nome "Matriz/Catedral/Santuário" ou, na falta, a **primeira** da
lista — então a sede vai sempre em primeiro lugar: "Matriz <orago>" nas paróquias e, nas áreas pastorais sem
igreja nomeada, "Sede da Área Pastoral …" (mesma convenção de Belém/Bragança). Sede com nome próprio tirado da
fonte: São Lucas → Igreja Sagrado Coração de Jesus (texto da ficha); N. Sra. da Glória → igreja homônima (texto da
ficha); **São Paulo Apóstolo → "Matriz Santo Antônio"** e Divina Misericórdia → Igreja Santa Clara, em Centro
Grande (Comunicados de 2026); Santo Arnaldo Janssen → Comunidade São Francisco. Área Pastoral N. Sra. de Nazaré
Mãe de Jesus → Igreja N. Sra. de Nazaré, por inferência (`media`): é a igreja de Boa Vista do Cuçari que a ficha
da Paróquia Santa Maria Mãe de Deus ainda lista como comunidade sua — tirei-a de lá para não duplicar.

## Comunidades

O site não lista as 803 comunidades: só aparecem as igrejas com horário. Acrescentei duas listas publicadas em
notícias oficiais — as 11 comunidades da Paróquia São Paulo Apóstolo (Semana da Família, 06/08/2025) e as 8
ribeirinhas do Distrito N. Sra. da Conceição da Paróquia Cristo Bom Pastor (Jornada Missionária, 30/07/2025) — e
a Igreja São Tomé (Mulata), de Monte Alegre, citada na nota de 03/07/2026. O site tem 486 notícias; uma varredura
completa renderia mais nomes.

## Pontos para validação humana

1. **Sem nenhum horário (8)**: Área Missionária São Rafael Arcanjo (BR-163, km 72), Áreas Pastorais N. Sra. de
   Nazaré Mãe de Jesus, Santo Arnaldo Janssen, São João Paulo II, Divina Misericórdia, Santa Clara e São
   Raimundo Nonato (Monte Alegre) e Paróquia Santo Inácio de Loyola (Boim — ficha sem telefone nem e-mail).
2. **Paróquia São Mateus** — a ficha não diz qual das seis igrejas é a matriz (endereço da paróquia em Nova
   Vitória, mesmo bairro da Igreja Cristo Rei); sem marcação, o importador cria "Matriz São Mateus" e pode
   duplicar a Cristo Rei. Vigário: a ficha diz Pe. Edward Guc; o Comunicado de 10/04/2026, Pe. José Mapang Pukan.
3. **São Francisco de Assis (Caranazal)** — confirmar as missas de domingo às 19h30 e 21h00 (sem rótulo).
4. **Mojuí dos Campos** publica só terça e sábado 19h30 (nenhuma missa de domingo). **Jacamim**: a ficha diz
   km 20; o Comunicado de 17/08/2026, km 22.
5. **Área São Lucas, Igreja São Raimundo (Vigia)**: linha de sábado com texto "3º e 5º domingo".
6. E-mails a conferir: `saojoaobatista-@hotmail.com` (hífen antes da arroba); São Mateus e Santa Maria Mãe de
   Deus ainda usam e-mail de "área pastoral". Área Santo Arnaldo Janssen: telefone com DDD 96.
   Divina Misericórdia e Cristo Rei (Monte Alegre) têm o mesmo telefone.
7. Site morto não gravado: `www.paroquiaperpetuosocorro.org.br` (não resolve); o e-mail desse domínio ficou.
8. Endereço divergente Receita × site: São Raimundo Nonato (Praça do Centenário × Tv. Silva Jardim, 32), Cristo
   Salvador (Rua Talha Mar × Av. Pardal), São Francisco de Monte Alegre (nº 148 × nº 70), Fordlândia (a Receita
   ainda diz "Praça da Matriz, Aveiro").
9. `foundedYear` nulo em todas: o site não publica, e a data de abertura da filial na Receita só serve de
   indício (Santo Antônio/Laguinho 2022; N. Sra. das Graças/Santa Clara 2025).
10. **`dioceses.json` (não alterei)**: o CEP está 68005-**040**; site, Receita e papel timbrado dão **68005-060**.
    Falta o e-mail: `curia.stm@gmail.com`. Telefones no papel timbrado de 2026: (93) 3522-1668 / 3522-5605; o
    site dá (93) 98412-3579. O endereço "C.P. 133" pode virar "Rua Wilson Dias da Fonseca, 632 – Centro". O
    arcebispo assina "Dom Irineu Roman, **CSJ**" (o arquivo tem "C.S.I."). O site registrado na
    catholic-hierarchy (`diocesedesantarem.org.br`) é o domínio antigo.

## Fontes

- https://www.arquidiocesedesantarem.org.br/paroquias · 48 fichas `/paroquias/<id>/<slug>` · `/horariosmissa` · `/contato`
- Notícias 888 (12/06/2026) e 896 (03/07/2026) sobre horários; 809, 851 e 914 (Comunicados da Chancelaria de 2026); 651, 725 e 733
- https://minhareceita.org/05713128000116 e filiais 0002–0050
- https://pguadalupe.com.br (site da Paróquia N. Sra. de Guadalupe)
- https://pt.wikipedia.org/wiki/Arquidiocese_de_Santarém · https://www.catholic-hierarchy.org/diocese/dsntm.html · https://cnbbn2.com.br/arquidiocese-de-santarem/
