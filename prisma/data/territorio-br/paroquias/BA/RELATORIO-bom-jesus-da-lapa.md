# Diocese de Bom Jesus da Lapa — relatório de pesquisa

- **Slug**: `bom-jesus-da-lapa` · **UF**: BA · **Sede**: Bom Jesus da Lapa · **Província**: Vitória da Conquista · **Regional**: Nordeste 3
- **Pesquisa**: 18/09/2026
- **Bispo**: Dom Rubival Cabral Britto, O.F.M. Cap. (desde 13/03/2024)
- **Cúria**: Av. São Vicente de Paulo, 304, Centro, Cx. Postal 20 · 47600-000 · (77) 3481-2086 ·
  WhatsApp (77) 9 9826-0922 · diocesebjlapa@gmail.com
- **Site oficial**: <https://diocesedebomjesusdalapa.com.br> — vivo, **mas invadido** (ver abaixo)
- **Território**: 15 municípios

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **18** — todas `alta` |
| Registros no arquivo | 19 (as 18 + o Santuário do Bom Jesus da Lapa, `nao-paroquial` + `loadAsParish`) |
| Comunidades | **19** — só as matrizes; **nenhuma capela encontrada** |
| Horários fixos | **48** (27 MASS · 16 ROSARY · 4 CONFESSION · 1 ADORATION) — 47 `alta`, 1 `media` |
| Paróquias com algum horário | **1 de 19** (só o Santuário) |
| Horários carregáveis (`alta`/`media`) | **48** |

**Cobertura: 18 encontradas / 20 declaradas pelo gcatholic (24 pelo catholic-hierarchy).**

## Dois problemas graves no site oficial

1. **O menu "Paróquias" é um placeholder** — o link é literalmente `href="#"`. A diocese **não publica
   lista de paróquias, endereço de paróquia nem horário de missa em página nenhuma.**
2. **O site está invadido por spam de SEO.** O rodapé de *todas* as páginas traz um bloco
   "Recolher/Expandir Links Úteis" com **centenas de links de sites de aposta** (`dc777`, `bet5989`,
   `999tg`, `superslot7`, `peteca777`…). O conteúdo editorial parece íntegro, mas é um WordPress
   comprometido. **A diocese precisa ser avisada** — e é prudente não tratar o domínio como confiável
   sem revisão.

Efeito colateral: os permalinks das fichas de padre (`/_padres_seminaristas/<slug>/`) devolvem **404**.

## Como a lista foi montada

1. **`/padres`** — listagem JetEngine com **35 fichas de presbítero**, cada uma com *Situação
   Canônica*, ***Paróquia***, incardinação e e-mail. A página só carrega 10 por vez; li as 35 pelo
   `wp-admin/admin-ajax.php` (`action=jet_engine_ajax&handler=listing_load_more`, com a `signature`
   do atributo `data-nav` da própria página). Foi a **única fonte oficial** de vínculo padre↔paróquia.
2. **Receita Federal** — o CNPJ da mitra **não** estava óbvio: o que aparece primeiro é o das
   "OBRAS SOCIAIS DA DIOCESE" (13.713.615), que só tem 12 filiais e cobre 8 paróquias. O correto é
   **MITRA DIOCESANA DE BOM JESUS DA LAPA, CNPJ 01.190.562**, achado varrendo as organizações
   religiosas dos 15 municípios no **Mapa das OSC/IPEA** (que aqui funcionou, ao contrário do que se
   viu em outras dioceses baianas). Varredura de `/0001` a `/0032`: **23 inscrições**, nada além.
3. **gcatholic** (`/churches/local/bomj0`, atualizado em 28/03/2026) — 23 igrejas por cidade, com
   marca "(Parish)". Confirmou nome e cidade de 17 delas.
4. **`santuariodobomjesusdalapa.com`** — site próprio do Santuário, com a grade semanal completa.

### As 23 filiais da Mitra

| Tipo | Quantidade |
|---|---|
| Sede | 1 |
| **Paróquias ATIVAS** | **18** |
| Santuário do Bom Jesus da Lapa | 1 |
| Loja Santuário Bom Jesus | 1 |
| Centro de Treinamento de Líderes (Bom Jesus da Lapa e Correntina) | 2 |

**As 18 paróquias casam uma a uma com o campo "Paróquia" das fichas de padre.** O gcatholic tem 17
delas: falta-lhe a **Nossa Senhora do Rosário do Distrito do Rosário (Correntina)**, criada em 2016.

### As que faltam para 20 (gcatholic) ou 24 (catholic-hierarchy)

Não foram localizadas. Candidatas são as igrejas que o gcatholic lista **sem** a marca "(Parish)":
N. Sra. do Perpétuo Socorro (Bom Jesus da Lapa), N. Sra. Aparecida (Carinhanha), e Imaculada
Conceição / Sagrada Família / São Lázaro (Correntina). Há ainda a **"Área Missionária"** dentro da
Paróquia São José de Carinhanha, com vigário próprio (Pe. Edvaldo Tomaz de Aquino) — pode ser uma das
"2 missions" que o gcatholic conta à parte.

## O Santuário — a única grade da diocese

O Santuário do Bom Jesus da Lapa (Gruta descoberta em 1691, 335 anos celebrados em 08/2026) é
**pró-catedral** e está confiado aos Redentoristas (Missão Redentorista da Bahia, CNPJ 14.103.410),
com **8 padres**. O gcatholic o marca "Pro-Cathedral, Shrine" e **não** "(Parish)" — por isso entrou
como `status: "nao-paroquial"` + **`loadAsParish: true`**, pela regra do README (igreja não paroquial
com missa publicada entra).

Grade oficial (site próprio, notícia mais recente de 27/08/2026 ⇒ `alta`), **todos os dias**:

> 06h30 Terço Devocional ao Bom Jesus · **06h45 missa** · **09h missa** · 15h Terço da Divina
> Misericórdia · **17h missa** · **19h missa**
> **11h missa** só aos sábados e domingos (de segunda a sexta, 11h é a Novena ao Bom Jesus)
> 19h: segunda = Terço dos Homens · terça = Terço das Mulheres · quinta = Adoração ao Santíssimo
> Confissões: **fins de semana, 8h30–11h e 15h30–17h**

Decisões tomadas:
- A **Novena das 11h (seg–sex)** e os **batizados das 11h** não viraram horário (não são missa).
- A grade semanal escreve "06:30h – Terço do Bom Jesus **e Santa Missa**", enquanto o resumo da
  "Programação Diária" separa 6h30 (terço) de 6h45 (missa). Gravei **terço 06:30 + missa 06:45**,
  com a divergência em `notes`.
- **Único `media` do arquivo**: na quinta-feira a grade semanal lista "15:00h Santa Missa" e **não**
  lista 17h, enquanto o rodapé do mesmo site lista missa às 17h todos os dias. Gravei 17h.
- As quatro **romarias** (Terra e Águas 05–07/07, Bom Jesus 28/07–06/08, N. Sra. da Soledade
  08–15/09, N. Sra. Aparecida 12/10) são datas festivas e **não** entraram.

O Lírio Católico (ficha 9967) corrobora parcialmente — 17h e 19h em dias úteis, 11h no fim de semana
— mas divergindo em 08:30 vs 09:00 e omitindo o resto; por ser agregador sem data de conferência,
não foi usado como fonte.

## Armadilha encontrada — homônimo em Wix (vale para o próximo agente)

Uma busca por "Paróquia Nossa Senhora das Vitórias Santa Maria da Vitória horário de missas" devolve
`pnsvitorias.wixsite.com/pnsv/horrios-de-missas`, com uma grade **completa e convincente** (matriz +
4 comunidades). O rodapé desse site diz:

> 2015 – PARÓQUIA NOSSA SENHORA DAS VITÓRIAS / **AV. DA SAUDADE, 814 / VILA NOSSA SENHORA DAS
> VITÓRIAS / MAUÁ / SP**

É **outra paróquia, em Mauá/SP**, e o resumo do buscador atribuiu a grade dela à paróquia baiana.
**Nada desse site entrou no dataset.** A ficha real do `horariodemissa.com.br` (`igreja.php?k=KGNZU`)
confirma endereço e telefone da paróquia baiana — Rua Manoel Coelho, 21, Centro, (77) 3483-1240 —
mas é de **25/05/2013** e traz "(Nenhum horário de Missa informado)".

## Comunidades: zero

Nem a diocese nem qualquer paróquia publica lista de capelas/comunidades. Os 19 registros de
comunidade do arquivo são **só as matrizes**. Numa diocese de 56.880 km² e 15 municípios rurais, o
número real deve ser de várias centenas — é a maior lacuna desta diocese.

## Pontos para o enxame de validação

1. **Horário de missa de 18 paróquias** — nenhuma publica. Só o Santuário tem grade.
2. **Comunidades/capelas** — nenhuma encontrada.
3. **Nome da paróquia catedral** — a ficha do pároco no site da diocese diz "Paróquia Bom Jesus" e
   "Pároco da Catedral"; a Receita e o gcatholic dizem **Nossa Senhora do Carmo**. Gravei
   N. Sra. do Carmo. O gcatholic ainda a classifica como "**Future** Cathedral", com a função de
   catedral exercida pelo Santuário (pró-catedral) — vale confirmar qual é a situação hoje.
4. **As 2 (ou 6) paróquias que faltam** para bater com gcatholic / catholic-hierarchy.
5. **Paróquia São João Batista de Coribe**: a Mitra registra o CNPJ em **Coribe**, mas a filial
   homônima das Obras Sociais (13.713.615/0012) registra o **mesmo endereço** (Rua Getúlio Vargas,
   108) em **São Félix do Coribe**. Gravei Coribe, que é o que o site e o gcatholic dizem.
6. **"Paróquia São José de Serra do Ramalho"** — a ficha do Pe. Francisco Ermelindo Gomes, CM, o dá
   como vigário de "São José de Serra do Ramalho", sem o "Operário". Não existe segunda paróquia de
   São José no município, nem na Receita nem no gcatholic; tratei como a mesma (São José Operário).
7. **Telefones**: gravei só o do Santuário ((77) 3481-2883). A Receita traz o telefone da catedral
   malformado ("774810848", 9 dígitos) e repete o da cúria em várias filiais — nada disso entrou.
8. **Site invadido** (spam de aposta no rodapé) — avisar a diocese.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- `email`: hoje `null` → **`diocesebjlapa@gmail.com`** (página oficial da Cúria).
- `address`: hoje `"Curia Diocesana, Av. Sao Vicente de Paulo s/n"` → o número é **304** e há
  **Caixa Postal 20**: "Av. São Vicente de Paulo, 304, Centro, Cx. Postal 20".
- `phone` `(77) 3481-2086` e `zipCode` `47600-000` **conferem**; acrescentar o WhatsApp
  **(77) 9 9826-0922**.
- `website` e `bishopName` conferem — mas registrar que o site está com **injeção de links de
  aposta** no rodapé.
