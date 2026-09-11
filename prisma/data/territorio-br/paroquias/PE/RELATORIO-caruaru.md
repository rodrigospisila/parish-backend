# Diocese de Caruaru (PE) — relatório de pesquisa

- **Agente**: pesquisa de território, 2026-09-11
- **Arquivo**: `paroquias/PE/caruaru.json`
- **Cobertura**: **46 / 48 paróquias** + 2 quase-paróquias + 6 áreas pastorais + 1 capela
- **Comunidades**: 75 · **Horários fixos**: 279 (247 `alta`, 3 `media`, 29 `baixa`), sendo 18 de confissão
- 46 das 55 entradas têm horário; 9 estão sem grade porque a fonte oficial traz a linha em branco.

## Fontes principais

O site é **Wix** e a listagem visível está incompleta: das seis foranias, só três estão publicadas
(Nossa Senhora das Dores, São Francisco de Assis e Santo Amaro — 25 paróquias de Caruaru,
Taquaritinga do Norte, Santa Cruz do Capibaribe e Toritama), e a página da Forania Santo Amaro só
renderiza 3 dos 8 cartões.

O que resolveu foi a **base de dados por trás da página "Encontre sua Missa"**:

| Fonte | URL | O que deu |
|---|---|---|
| Encontre sua Missa | `/encontremissa` | coleção Wix `HorariosMissas`, **57 registros** (agosto/2025) com paróquia, cidade, endereço e grade de domingo a sábado + coluna "1ª Sexta" |
| Foranias (3 páginas) + 12 páginas de item dinâmico | `/foraniadasdores`, `/foraniasaofrancisco`, `/foraniasantoamaro` e `/…/<paróquia>` | coleções `Paroquias-Quase-Paroquias-Areas*`, **23 registros** com endereço, telefone, e-mail, pároco, data de criação, horários de confissão e **lista de comunidades** |
| Dados Estatísticos | `/dados-estat%C3%ADsticas` | 48 paróquias, 2 quase-paróquias, 6 áreas pastorais, 19 municípios, 1.013.494 habitantes |
| Wikipédia — Diocese de Caruaru | — | 46 paróquias e 6 áreas pastorais (corrobora o total encontrado) |

### Truque de coleta (novo, vale para qualquer site Wix)

Os dados de um site Wix vêm em `<script type="application/json" id="wix-warmup-data">`, no campo
`platform.appsWarmupData.dataBinding`, que traz **as coleções inteiras já carregadas**
(`dataStore.recordsByCollectionId`) **e o schema com os `displayName` de cada campo**. Foi assim que
se descobriu que `description_fld` = Domingo, `image_fld` = Segunda, `image_fld1` = Terça,
`image_fld_1` = Quarta, `image_fld_11` = Quinta, `image_fld_111` = Sexta, `image_fld_1111` = Sábado
e `image_fld_1112` = "1ª Sexta" — nomes de coluna que nenhum leitor automático adivinharia.
`/sitemap.xml` lista os sitemaps `dynamic-<pagina>_p_<uuid>_0_5000-sitemap.xml`, que dão as URLs de
todos os itens dinâmicos de cada coleção.

## Decisões de modelagem

- **Nome oficial**: a base de horários usa sufixos de desambiguação ("Paróquia Santo Antônio -
  Agrestina", "…- Nova Caruaru", "…- Alto Bonito"). O sufixo saiu do `name`: quando é o município,
  virou `city`; quando é distrito/bairro, virou `neighborhood`. Onde a página da forania traz o
  nome completo, ele prevaleceu (ex.: "Paróquia Santa Teresinha do Menino Jesus e seus pais, os
  Santos Luiz e Zélia", "Paróquia da Natividade do Senhor", "Paróquia Coração Eucarístico").
- **2 quase-paróquias** (São José, no Alto do Moura/Caruaru, e Sagrado Coração de Jesus, em
  Toritama) entram com o prefixo "Quase-paróquia" e **não contam** em `parishesFound`.
- **6 áreas pastorais** (São João Batista/Encruzilhada-Bezerros, Nossa Senhora da
  Salette/Caruaru, Nossa Senhora de Lourdes e São João Paulo II/Gravatá, Nossa Senhora do
  Livramento/Trapiá-Riacho das Almas, Santa Rita de Cássia/Santa Cruz) entram com
  `status: "nao-paroquial"` + `loadAsParish: true` — são unidades pastorais pré-paroquiais com
  administrador e missa própria, e a diocese as publica lado a lado com as paróquias.
- **Capela São Sebastião** (Maurício de Nassau, Caruaru) entra do mesmo jeito: não é paróquia, mas
  tem grade diária publicada. **Igreja do Monte Bom Jesus** virou *comunidade da Catedral*, porque é
  assim que a própria página da Catedral a apresenta.
- **Municípios**: gravado "São Caetano" (grafia IBGE); a fonte escreve "São Caitano" nos endereços.
- **Coluna "1ª Sexta"** vira horário de sexta-feira com `confidence: "baixa"` e nota — é recorrência
  mensal, que o `MassSchedule` não modela.
- **Comunidades**: as 29 não-matriz vêm das páginas de item das paróquias de Caruaru
  (Guadalupe 7, São Paulo Apóstolo 7, São José 2, São Francisco 2, Catedral 1, Rosário 1) e a
  maioria celebra em rodízio mensal — daí os 29 horários `baixa`.
- **Confissões**: 18 horários `CONFESSION` com `notes` de horário final ("até 12:00"), extraídos das
  páginas de item. Só existem para as paróquias com página publicada.

## Pontos que precisam de validação humana

1. **Faltam até 2 paróquias.** A página oficial de estatísticas diz 48; a base de horários e a
   Wikipédia dizem 46. As 2 restantes não aparecem em nenhuma página do site. Estão fora das três
   foranias publicadas (Caruaru bate: 18 paróquias; Taquaritinga/Santa Cruz/Toritama batem: 7).
2. **Paróquia São João Batista (Caruaru)** — a base registra `cidade = Caruaru` mas o endereço é
   "Vila Pelada — São Caitano, PE, 55130-000" (CEP de São Caetano). A página da Forania São
   Francisco (que é de Caruaru) a lista. Gravada em Caruaru, `confidence: "media"`, com nota.
   Confirmar o município.
3. **Endereço divergente entre as duas fontes oficiais**:
   - Nossa Senhora das Graças/Cidade Jardim — página da paróquia: "Rua Maria Adelaide de Andrade,
     100, Cidade Jardim"; base de horários: "R. Onze — Cedro, 55020-515". O CEP gravado é o da base
     e o logradouro é o da página. **Ruas diferentes — conferir.**
   - Sagrada Família — "Kennedy" (página) *vs* "Jardim Boa Vista" (base). Gravado Kennedy.
   - Nossa Senhora de Fátima — "Av. Caruaru, Boa Vista" (página) *vs* "Av. Caruaru, 284-328, Jardim
     Boa Vista, 55038-270" (base).
4. **CEP malformado na fonte** — Paróquia São Francisco de Assis (Caruaru): "São Francisco
   55.006-04". `zipCode` ficou `null` e a string permanece dentro de `address`.
5. **Divergência de grade entre as duas fontes oficiais** — a Catedral, por exemplo, aparece como
   "Segunda a Sexta: 12h e 17h" na página da paróquia e como "Segunda 17h / Terça a Sexta 12h e 17h"
   na base de horários. Prevaleceu a base (estruturada e consistente para toda a diocese).
6. **Sem grade publicada** (9 entradas, linha em branco na base): Nossa Senhora do Ó (Altinho),
   São João Batista (Barra de Guabiraba), São Sebastião (Alto Bonito), Área Pastoral São João
   Batista (Encruzilhada), Paróquia São João Batista (Vila Pelada), Área Pastoral Nossa Senhora de
   Lourdes (Gravatá), São Caetano (São Caetano), Santo Amaro e São José/Pão de Açúcar
   (Taquaritinga do Norte).
7. **Telefone/pároco só para 23 das 55 entradas** — as demais dependem da diocese publicar as
   foranias que faltam. É o maior buraco de contato deste arquivo.
8. **"Paróquia Nossa Senhora Aparecida - Santa Cruz"** tem a célula de sábado preenchida com string
   vazia na base (não é `null`) — sem horário, portanto, mas é sinal de campo iniciado e não
   concluído.
