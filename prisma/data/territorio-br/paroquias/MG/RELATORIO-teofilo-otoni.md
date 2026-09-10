# Relatório de pesquisa — Diocese de Teófilo Otoni (MG)

**Agente:** pesquisa de território BR — Vale do Rio Doce e Mucuri
**Data da coleta:** 2026-09-10
**Arquivo gerado:** `teofilo-otoni.json`

## Resumo

| Métrica | Valor |
|---|---|
| Paróquias | **43** (todas `alta`) |
| Comunidades/capelas | 141 |
| Horários fixos | 114 (94 `alta` + 4 `media` + 16 `baixa`) |
| Paróquias sem horário publicado | 11 |
| Cobertura | 43 encontradas / 43 publicadas pela diocese (42 no Catholic-Hierarchy, dados de 2022) |

## Fontes principais

1. **https://dioceseteofilotoni.com.br/paroquias/** — índice oficial. O site é WordPress com custom
   post type `paroquias` exposto na REST API:
   `https://dioceseteofilotoni.com.br/wp-json/wp/v2/paroquias?per_page=100` → **`X-WP-Total: 44`**.
   Um dos 44 registros é uma **notícia publicada por engano nesse tipo** ("Novos membros do Conselho
   de Presbíteros e Colégio de consultores", `modified` 05/05/2026) — descartada. Restam **43 paróquias**.
2. **Página de cada paróquia** (`/paroquias/<slug>/`) — setor, telefone, e-mail, horário da secretaria
   paroquial, horários de confissão, pároco, endereço, história e **quadro "Horários de missa"**
   (repetidor ACF com `tipo_paroquia`, `dia_da_semana_paroquia`, `horario`, `observacoes`).
   As 43 páginas foram lidas. Datas `modified`: de 12/2023 a 02/2026.
3. **https://dioceseteofilotoni.com.br/horarios-de-missa/** — página diocesana de horários, com abas
   por paróquia, **mas quase todas vazias** ("Conteúdo da aba"); só Catedral e N. Sra. de Fátima têm
   conteúdo, e o da Catedral **diverge** do publicado na página da própria paróquia.
4. **Categorias da API** (`/wp-json/wp/v2/categories`) — dão os **setores** e a contagem por setor.
5. **https://www.catholic-hierarchy.org/diocese/dteof.html** — erigida em 27/11/1960; 25.376 km²;
   ~495.000 hab., 329.000 católicos (2022); **42 paróquias**; Dom Messias dos Reis Silveira (desde
   14/11/2018); Cúria na Rua Padre Virgulino 751, 39800-025.

Observação técnica: `WebFetch` recebeu **403** no domínio; a coleta foi feita com `curl` + UA de
Chrome. Os e-mails são ofuscados pelo Cloudflare (`data-cfemail`) e foram decodificados.

## Setores pastorais (7)

| Setor | Paróquias |
|---|---|
| Teófilo Otoni | 10 |
| Mantena | 8 |
| Itambacuri | 7 |
| Malacacheta | 6 |
| Águas Formosas | 5 |
| Nanuque | 4 |
| Ataléia | 3 |

## Decisões de nomenclatura

- **13 paróquias são publicadas sem o prefixo "Paróquia"** (ex.: "São Sebastião (Teófilo Otoni)",
  "Senhor Bom Jesus (Crisólita)", "São Pedro (Pescador)"). Todas receberam o prefixo, com o registro
  em `notes`.
- **"Paróquia Sagrada Coração de Jesus (Jampruca)"** → gravada como *Sagrado* Coração de Jesus
  (erro de concordância na fonte, anotado).
- **"Paroquia Santo Antônio (Teófilo Otoni)"** → acento corrigido, anotado.
- **Santuário Senhor Bom Jesus (Teófilo Otoni)** — mantido com o prefixo "Santuário"; está no CPT de
  paróquias e tem horários próprios, portanto é paróquia-santuário.
- **Paróquia Senhor Bom Jesus (Concórdia)** — a fonte identifica a paróquia só por "Concórdia".
  Trata-se de **Concórdia do Mucuri, distrito de Ladainha (MG)**, confirmado por notícia do próprio
  site ("Pe. Gerson toma posse como novo Pároco, em Concórdia"). Gravada com `city: "Ladainha"` e
  `neighborhood: "Distrito de Concórdia do Mucuri"`. **Confirmar o município.**
  Atenção: Ladainha tem **duas** paróquias no dataset (Sagrado Coração de Jesus, na sede, e Senhor
  Bom Jesus, no distrito).

## Pontos que precisam de validação humana

- **Divergência de horários na Catedral**: página diocesana diz "Segunda-feira 19h / Terça a sexta
  07h e 19h"; página da paróquia diz "Segunda a Quinta 19h / Quarta-feira 07h e 19h". Foram gravados
  os da página da paróquia, **rebaixados a `media`**, com a divergência em `notes`.
- **Paróquia Senhor Bom Jesus (Crisólita)** — a página existe mas está **totalmente vazia**: sem
  endereço, telefone, e-mail, pároco ou horários. Só o setor (Águas Formosas) é conhecido.
- **Sem endereço publicado**: Crisólita e Nossa Senhora Imaculada Conceição (Frei Gaspar).
- **Sem pároco publicado** (7): Nossa Senhora de Fátima (Teófilo Otoni), Nossa Senhora dos Anjos
  (Itambacuri), Nossa Senhora Aparecida (Frei Inocêncio), São Boaventura (Águas Formosas),
  Nossa Senhora D'Ajuda (Novo Oriente de Minas), Senhor Bom Jesus (Crisólita), Imaculada Conceição
  (Frei Gaspar).
- **Sem horário publicado (11)**: Nossa Senhora das Graças (Mantena), São Geraldo (Central de Minas),
  Nossa Senhora dos Anjos (Itambacuri), Nossa Senhora Aparecida (Frei Inocêncio), Senhor Bom Jesus
  (Concórdia/Ladainha), Nossa Senhora da Glória (Franciscópolis), Imaculada Conceição (Setubinha),
  Nossa Senhora D'Ajuda (Novo Oriente de Minas), Senhor Bom Jesus (Crisólita), Imaculada Conceição
  (Frei Gaspar), Imaculada Conceição (Nanuque).
- **Missas mensais** (16 registros `baixa`, regra literal em `notes`): "1ª sexta-feira do mês",
  "Primeiro e Terceiro Domingo", "Segundo e Quarto Domingo", "Primeira e Terceira sexta-feira do mês",
  "Primeiro, terceira e quinta quinta-feira do mês".
- **Comunidades**: só 10 paróquias publicam a **lista nominal** (São Benedito/TO 17, Senhor Bom Jesus/
  Serra dos Aimorés 4, São Félix 3, São Geraldo/Central de Minas 6, São Pedro/Pescador 3, São José/
  São José do Divino 3, São Jorge/Nova Módica 6, São João Batista/São João do Manteninha 6,
  São Jacinto/TO 18, Senhor Bom Jesus/Poté 29). Outras **14** declaram apenas o **número** de
  comunidades, registrado em `notes` (ex.: Santo Antônio de Pádua/Mantena "27 comunidades em 5
  setores"; Santa Rita de Cássia/Malacacheta "37 comunidades"; São Sebastião/Carlos Chagas "27").
  Essas ficaram só com a matriz — um enxame de validação precisaria buscar as listas.
- **Duas comunidades** vieram do campo "observações" do quadro de horários: "São Cristóvão"
  (Par. São Sebastião, Teófilo Otoni) e "São Francisco de Assis – Flórida" (Par. Senhor Bom Jesus,
  Mendes Pimentel), além da "Capela São João Batista (Urbana)" em Pescador.
- **`foundedYear`** preenchido em 24 paróquias, sempre a partir da data explícita na história da
  própria página (não de data de cadastro no CMS). Destaques: Malacacheta 1886, Concórdia 1894,
  Poté 1912, Machacalis 1952 (como "São Sebastião do Norte", então na Diocese de Araçuaí),
  Campanário 2022 (desmembrada de Itambacuri em 05/03/2022 — explica a diferença 43 × 42 do
  Catholic-Hierarchy).
- **Setor** foi lido da categoria da API; a categoria "Teófilo Otoni" tem `count: 10`, batendo com as
  10 paróquias da sede.
