# Diocese de Viana (MA) — relatório de pesquisa

Data da coleta: **2026-09-18**. Agente de pesquisa (rodada MA — fechamento do Maranhão).

## Resumo

| Item | Valor |
|---|---|
| Entradas de paróquia no JSON | **29** (26 paróquias + 1 santuário-paróquia + 1 quase-paróquia + 1 área missionária) |
| Confiança das paróquias | 29 `alta` |
| Comunidades | 13 (só a Paróquia de Pedro do Rosário publica a sua lista) |
| Horários fixos | 46 — 3 `media` e 43 `baixa` |
| Cobertura | 29 encontradas × 27 esperadas (catholic-hierarchy 2023) |

## Fonte principal

**`https://diocesedeviana.org.br/paroquias` — site WordPress oficial, ATIVO** (tema
"minhaparoquia"; a página foi modificada em 20/04/2023, e o site publica "Santo do dia" e
"Liturgia diária" atualizados em 16/09/2026, portanto está vivo). A listagem organiza as **29
unidades em 7 foranias**, cada uma com ficha própria em `/local/<slug>` contendo endereço com
CEP, pároco, telefone e e-mail institucional (`@diocesedeviana.org.br`).

O tipo de conteúdo `local` **não está exposto na REST** do WordPress (`/wp-json/wp/v2/types` só
mostra `post`, `page`, `attachment` e `mec-events`), então a lista teve de sair do HTML da página
de foranias — os `href` de `/local/…` em ordem de documento dão a forania de cada paróquia.

## ⚠ Armadilha encontrada: a aba "Missas" é conteúdo de demonstração do tema

Seis fichas têm uma aba "Missas". Ao comparar, **três delas repetem exatamente o mesmo texto** —
a mesma grade de domingo a sábado (Boa Esperança, Caçoada, Santa Rosa, Vila Palmeira, Bom Jardim,
Ferreira, Gameleira, Santa Maria, Santa Gianna, Marabá, Sumaúma, Aparecida, Vila Nova, Boca do
Campo, Juçaralzinho, CAEP, CPP, São Luizinho, Regalo, Picadas) e o mesmo bloco
*"Comunidades Eclesiais na sede: 03 / na Zona Rural: 17 / Pontos de Missa na Sede: 01 / na Zona
Rural: 16"*. São **placeholder do tema "minhaparoquia"**, não missa real. Ficaram **fora do JSON**
as grades de:

- Paróquia São Vicente Ferrer (São Vicente Ferrer)
- Quase-paróquia São Sebastião e N. Sra. Aparecida (Povoado Coque, Vitória do Mearim)
- Área Missionária São Francisco de Assis e N. Sra. da Conceição (Buriticupu)
- Paróquia Santa Rita de Cássia e São Francisco de Assis (Buriticupu) — aba vazia

Só **duas fichas trazem grade própria e plausível**, e entraram:

1. **São Pedro Apóstolo e N. Sra. do Rosário (Pedro do Rosário)** — grade com nomes de comunidade
   específicos (Fala Só, Novo Horizonte, Anta, Rua Nova, Núcleo 08, Bela Vista, Nova República,
   Tocos, Lagoa, Pedreiras, Três de Maio). As missas de domingo na matriz (**08:00 e 19:00**) são
   **corroboradas pelo Lírio Católico com o mesmo telefone da paróquia** → `media`. As 12
   comunidades entraram com `media`; as missas mensais delas, `baixa`.
2. **São Bento de Bacurituba** — "Domingos: 19h00" → `media` (fonte oficial sem sinal de
   atualidade).

Demais horários vêm do `liriocatolico.com.br` e são `baixa`: Santuário Santa Luzia (Santa Luzia)
e Paróquia Santa Inês (Santa Inês).

## Igrejas com missa publicada que NÃO foram vinculadas a paróquia

| Igreja | Cidade | Missa (Lírio) | Observação |
|---|---|---|---|
| Igreja Católica de Nossa Senhora da Conceição, Rua Osvaldo Cruz, 185 | Santa Inês | Dom 18:00 | Instagram `imaculadaconceicao.sti`; não consta das 3 paróquias de Santa Inês |
| Capela da Sagrada Família, R. Travassos Furtado | Santa Luzia | Sáb 19:30 | provável capela do Santuário Santa Luzia, mas o vínculo não está publicado |
| Catedral N. Sra. da Conceição (ficha do Lírio sem grade) | Viana | — | a ficha existe mas **não traz nenhum horário** |

## Notas de identificação

- **Paróquia São José Operário — Faísa**: a ficha só diz "Rua São Sebastião s/n, na Estrada MA 006,
  Entroncamento-Arame. Faísa", sem cidade. Confirmado que Faísa pertence a **Santa Luzia (MA)**
  (página oficial da paróquia no Facebook: "Paróquia São José Operário Faisa - Ma | Santa Luzia MA";
  e o gcatholic lista "Santa Luzia | São José Operário (Parish)"). Há uma **segunda** Paróquia São
  José Operário na diocese, em **Tufilândia** (CNPJ próprio 29.071.429/0001-51 na Receita) — são
  duas paróquias distintas, em foranias diferentes (I e II).
- Duas paróquias **Nossa Senhora de Nazaré** (Viana/bairro Nazaré e Vitória do Mearim) e duas
  **São Benedito** (Cajari e Olinda Nova do Maranhão) — homônimas legítimas, desambiguadas no slug.
- A **Receita não fecha a lista desta diocese**: a busca por "DIOCESE DE VIANA" no Mapa das OSC
  devolve só 2 inscrições do CNPJ 06.221.683 (sede e Povoado Coque). As paróquias de Viana têm CNPJ
  próprio — apareceram, por razão social, `PAROQUIA SAO VICENTE FERRER - DIOCESE DE VIANA-MA`
  (05.284.746), `PAROQUIA SAO JOSE OPERARIO TUFILANDIA MA` (29.071.429) e `PAROQUIA DE SAO BENEDITO
  … CAJARI … DIOCESE DE VIANA` (31.043.005). Varrer a Receita paróquia a paróquia não valia o custo
  porque o site oficial já dá a lista completa.
- `foundedYear` das paróquias: o site não publica — `null` em todas.

## Para o enxame de validação humana

1. **Horários**: 43 dos 46 são `baixa`. Viana entra em produção praticamente **sem horário**.
   Vale checar os Instagram/sites das paróquias maiores (Santuário Santa Luzia tem site próprio,
   `http://santuarioluz.com.br`; Santa Inês tem `padroeirasantaines`).
2. **Telefones antigos**: várias fichas trazem números de 8 dígitos sem o 9 inicial
   (ex.: Catedral "(98) 8126-6376 / 8913-7907", São Benedito de Cajari "(98) 8750-5784",
   São Francisco Xavier de Monção "(98) 8422-3469", Imaculada Conceição "(98) 8315-0164",
   São Vicente Ferrer "98 8756-7930", São José Operário de Tufilândia "(98) 9147-2573"). Onde havia
   um número de 9 dígitos na mesma ficha, gravei o de 9; onde só havia o de 8 dígitos, **gravei
   `null`** (Catedral, Monção, Conceição do Lago-Açu, São Vicente Ferrer) para não pôr contato
   inválido em produção. Confirmar os números atuais.
3. **`gcatholic` × diocese**: "Vitória do Mearim | Santo Antônio (Parish)" não está na lista
   oficial; e o gcatholic tem "Bom Jesus das Selvas | São Francisco (Parish) / Paróquia da
   Transfiguração" como uma só igreja. Conferir se existe uma paróquia Santo Antônio em Vitória do
   Mearim além das duas já listadas.
4. **Área Missionária de Buriticupu (Segundo Núcleo)**: o link do site aponta para
   `/local/vida-diocesana`, um slug reaproveitado. Confirmar o status canônico (área missionária,
   quase-paróquia ou comunidade) e o nome oficial.
5. **Bispo**: o catholic-hierarchy registra, na página de Viana, um presbítero com período
   encerrado em **25/10/2025** — conferir se houve mudança recente no governo da diocese (o
   `dioceses.json` e o gcatholic dão Dom Evaldo Carvalho dos Santos, C.M., desde 20/02/2019, e o
   site ainda traz notícia dele). **Não sugiro alteração**, só verificação.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

Nenhuma. `website`, `address`, `zipCode`, `phone` ((98) 3351-1174, o mesmo que a ficha do Lírio dá
para a catedral), `bishopName` e `type` conferem. `email` continua `null` — o site publica só
e-mails por paróquia e um formulário em `/contato`. `foundedYear` 1962 é a ereção da diocese
(30/10/1962) — **não alterar**.
