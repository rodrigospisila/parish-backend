# Diocese de Propriá — relatório de pesquisa

- **Slug**: `propria` · **UF**: SE · **Sede**: Propriá · **Província**: Aracaju
- **Pesquisa**: 17/09/2026
- **Bispo**: Dom George Luís Amaral Muniz · **Site**: https://www.diocesedepropria.com (Wix, **vivo** — notícia de 15/09/2026)
- **Cúria**: Travessa Municipal, 117, Centro · 49900-000 · (79) 98171-9112 · diocesedepropriase@gmail.com
- **Território**: 24 municípios em 3 vicariatos — *Bom Jesus dos Navegantes* (Brejo Grande, Ilha das Flores,
  Japaratuba, Japoatã, Neópolis, Pacatuba, Pirambu, Santana do São Francisco), *Imaculada Conceição*
  (Canindé de São Francisco, Gararu, Monte Alegre de Sergipe, Nossa Senhora da Glória, Poço Redondo, Porto
  da Folha) e *Santíssima Eucaristia* (Aquidabã, Canhoba, Cedro de São João, Graccho Cardoso, Itabi, Muribeca,
  Nossa Senhora de Lourdes, Propriá, São Francisco, Telha).

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **31** — todas `alta` (9 + 11 + 11 por vicariato, campo `vicariato`) |
| Comunidades/capelas | 48 = 31 matrizes + 17 locais de missa citados no quadro oficial (todos `alta`) |
| Horários fixos | **128** (todos MASS) — **115 `alta`**, 13 `baixa` |
| Paróquias com horário **carregável** | **30 de 31** (só Canhoba não publica: "consultar agenda da paróquia") |

**Cobertura: 31 de 31.** É a melhor das quatro circunscrições desta rodada: tudo de fonte oficial viva.

## Fonte — uma só, e estruturada

**`https://www.diocesedepropria.com/todas-as-paroquias`**. O site é Wix e a página entrega as três
coleções inteiras em `<script id="wix-warmup-data">` →
`appsWarmupData.dataBinding.dataStore.recordsByCollectionId` (truque do README, funcionou de primeira):
`VICARIATOBOMJESUSDOSNAVEGANTES` (9), `VICARIATOIMACULADACONCEICAO` (11) e
`VICARIATOSANTISSIMAEUCARISTIA` (11). O `schemas` ao lado dá o nome de cada campo: PARÓQUIA, CIDADE,
PÁROCO, VIGÁRIO, **HORÁRIO DAS MISSAS**, HORÁRIO DE FUNCIONAMENTO DA SECRETARIA, ENDEREÇO, CEP, CONTATO,
DATA DA CRIAÇÃO e "Padroeiro e festa".

Cada registro traz `_updatedDate` — gravado em `sourceLastModified`. Distribuição: 13 registros de 09/2025,
1 de 10/2025, 9 de 11/2025 e 8 de 03–08/2026. Com o site ativo e registros tocados nos últimos 12 meses,
os horários entram como **`alta`**.

Nenhum agregador foi usado. Para registro: o `liriocatolico.com.br` tem 10 fichas no território e, cotejado
com o site oficial, **acerta Porto da Folha e Monte Alegre mas erra Propriá e Nossa Senhora da Glória**
(sáb 06h30 × 06h; dom 17h × 17h30; ter/qua/qui 19h na catedral × 19h30/18h/19h em igrejas diferentes) — mais
uma razão para manter agregador isolado em `baixa`. O `buscamissa.com.br` não cobre nenhum dos 24 municípios.

## Prova de completude — filiais do CNPJ

As paróquias são filiais do CNPJ **13.374.525** da diocese. Varredura em `minhareceita.org` de `/0001` a
`/0055`: existem 40 filiais, **31 delas paroquiais e todas ATIVAS** (`/0002`, `/0007`, `/0010`–`/0025`,
`/0027`, `/0028`, `/0030`–`/0040`); as outras são a cúria, o seminário São Geraldo, a Cáritas, a Ação Social,
a livraria, o jornal "A Defesa" e três imóveis; de `/0041` a `/0055` **não existe nada**. As 31 casam uma a
uma com os 31 registros do site (CNPJ de cada uma em `cnpj`). `catholic-hierarchy` dá 30 paróquias em 2023;
a 31ª é **São José, no povoado São José da Caatinga (Japaratuba), criada em 14/02/2025** (filial `/0040`,
aberta em 28/03/2025).

## Como as grades foram gravadas

O campo HORÁRIO DAS MISSAS é texto livre e muda de forma de paróquia para paróquia ("Domingo: 08h e 19h";
local como cabeçalho seguido dos dias; "Terça a sexta-feira: 19h30 - Igreja Matriz"; "Domingo:" seguido de
uma linha por missa). **Transcrevi as 31 grades à mão** no script de montagem, em vez de confiar num parser
genérico, e conferi cada uma contra o JSON do Wix. Regras:

- "Matriz", "Igreja Matriz", "Catedral Diocesana", "na Catedral" → comunidade-matriz.
- Outro local citado → comunidade própria (`alta`), com nota de que é *local de missa citado no quadro de
  horários, não a lista completa de capelas*. São 17: em Propriá o **Carmelo da Imaculada Conceição**
  (missa diária às 07h), o **Santuário Nossa Senhora das Graças**, a **Igreja do Rosário** e a Comunidade
  Matadouro; em Cedro de São João, São Sebastião, "Cruirizeiro" (*sic*), Poço dos Bois, **Telha**, Povoado Bela
  Vista e Povoado São Pedro; em Poço Redondo, Capela N. Sra. da Saúde e Igreja São José; e mais Capela Santa
  Terezinha (Porto da Folha), Igreja Nova (N. Sra. da Glória), Conjunto Maria do Carmo (Propriá), Capela São
  Francisco (Itabi) e Santuário Eucarístico (N. Sra. de Lourdes).
- "Todos os dias: 07h" virou 7 entradas; "Terça a sexta-feira" virou 4.
- **13 horários `baixa`**, todos com a frase original em `notes`:
  - recorrência mensal — "Primeira sexta-feira do mês" (Neópolis, Poço Redondo, N. Sra. Aparecida e São José
    Esposo, e as três missas de Cedro de São João), "4º Domingo: 10h" (Japoatã), "Última terça do mês, Missa
    dos Homens" (Lagoa Bonita);
  - **data fixa do mês** — "Dia 12 e dia 19 de cada mês, missa dos afilhados… 19h30" (N. Sra. Aparecida e São
    José Esposo): `dayOfWeek: null`, como manda a instrução;
  - **missa itinerante, sem local fixo** — "Sexta-feira: 19h - Setores da Paróquia" (catedral) e "Domingo 17h -
    Comunidades" (Itabi);
  - **horário alternado** — "Domingo 11h ou 19h — consultar programação" (Lagoa Bonita): os dois ficaram `baixa`.
- Não gravados, por não terem hora: "Uma vez por mês nos povoados" (Graccho Cardoso) e "Sábado: (comunidades)"
  (Itabi).

## Pontos que precisam de validação humana

1. **Data de criação "01/01/1970"** na Paróquia N. Sra. do Perpétuo Socorro e São Miguel Arcanjo (povoado São
   Miguel, Propriá): é a **data-zero do sistema** (época Unix), não a fundação. `foundedYear` ficou `null`. As
   outras 29 datas parecem genuínas (duas duplas coincidentes — Ilha das Flores e Graccho Cardoso em
   18/04/1976; N. Sra. de Lourdes e Itabi em 10/04/1977 — são criações conjuntas plausíveis, e a Receita abre
   os CNPJs nos mesmos anos). Pirambu não tem data publicada.
2. **Endereço trocado no site**: o registro de **Santa Luzia (povoado Lagoa da Volta)** traz no campo endereço
   "Pov. Lagoa do Rancho" — que é o povoado da paróquia vizinha (São José). Gravei o endereço da Receita
   (Praça José Francisco de Sá, 27, Povoado Lagoa da Volta).
3. **CEP trocado no site**: Neópolis aparece com 49880-000 (que é de Canhoba); gravei 49980-000, da Receita.
   Japaratuba (N. Sra. da Saúde) não tem CEP no site; veio da Receita.
4. **N. Sra. de Lourdes (município homônimo)** só publica as missas do **Santuário Eucarístico** (qua, sex e
   sáb às 7h) — **nenhuma missa dominical publicada**. Conferir.
5. **Canhoba** não publica horário ("Consultar agenda da paróquia").
6. **Telefones com DDD de outro estado**: Santana do São Francisco (82, Alagoas) e povoado São Miguel (77,
   Bahia). Copiados como publicados — são celulares, provavelmente do pároco.
7. **11 paróquias só publicam Instagram como contato** (sem telefone): Ilha das Flores, São José da Caatinga,
   Neópolis, Pirambu, Lagoa da Volta, Lagoa do Rancho, Mãe dos Homens, Graccho Cardoso, Muribeca, São
   Francisco e Canhoba → `phone: null`, perfil em `instagram`. **Nenhuma paróquia publica e-mail.**
8. **"Igreja Nova"** (N. Sra. da Glória) e **"Cruirizeiro"** (Cedro de São João) são os nomes exatos do site — o
   primeiro sem nome próprio, o segundo com provável erro de digitação ("Cruzeiro"). Não corrigi.
9. **Telha** é município, mas aparece como local de missa da Paróquia São João Batista de Cedro de São João
   (domingo 17h) — não tem paróquia própria. **Malhada dos Bois e Amparo do São Francisco** não constam da
   lista de municípios da Wikipédia, mas o site noticia atividade do vicariato em Malhada dos Bois; nenhuma
   filial de CNPJ nesses três municípios.
10. **Nomes normalizados por mim**: o site escreve em caixa alta e sem prefixo ("SANTO ANTÔNIO (CATEDRAL
    DIOCESANA)" → **Catedral Santo Antônio**; "SÃO FRANCISCO" → **Paróquia São Francisco de Assis**, pelo campo da
    festa e pela Receita; "Monte Alegre" → município **Monte Alegre de Sergipe**). Povoado/bairro-sede foi para
    `neighborhood`. "Padre" virou "Pe."; a observação "(Administrador Paroquial)" de Japaratuba foi para `notes`;
    vigários em `vicarName`.
11. **Matrizes com nome por convenção minha** ("Matriz <padroeiro>"), com o endereço publicado da paróquia.
12. Capelas e santuários que só o Lírio conhece e que **não entraram por não dar para saber a paróquia**:
    Santuário da Divina Misericórdia (N. Sra. da Glória, que tem 3 paróquias), Capela Senhor dos Pobres (Porto
    da Folha), Capela Menino Jesus Esperança dos Homens e Capela N. Sra. de Fátima (Poço Redondo, 2 paróquias).
