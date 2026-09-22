# Plano de validação dos pinos "precisos"

> **Só executar sob ordem do Rodrigo.** Este arquivo é o plano; nada aqui roda sozinho.
> Escrito em 21/09/2026, depois de dois pinos "precisos" de Curitiba aparecerem a
> quadras da igreja.

## O que aconteceu

| Caso | Pino que tínhamos | Onde estava | O que o Censo diz | O botão "Buscar pelo endereço" |
|---|---|---|---|---|
| Matriz N. Sra. das Vitórias — R. Cel. Luiz José dos Santos, 2515 | `cep` | a **367 m** da igreja | acha "PAROQUIA NOSSA SENHORA DAS VITORIAS" na rua → **53 m** | erra por **2,1 km** |
| Santuário Santa Rita de Cássia — R. Padre Dehon, 728 | `cep` | a **~1 km** | acha o **nº 728** exato | erra por ~350 m |

Não é defeito pontual, é o que essas duas origens **são**:

- **`cep`** devolve o meio do logradouro daquele CEP; **`osm-endereco`** (Nominatim) devolve o
  meio da rua, porque o OpenStreetMap quase não tem número de casa no Brasil. As duas são
  "nível de rua": certas na vizinhança, erradas na porta. E a tela chamava isso de "pino preciso".
- Medido contra o endereço com número no Censo: metade dos pinos por CEP está a mais de 150 m da
  porta, **18% a mais de 500 m, 8% a mais de 1 km**. No `osm-endereco`: 39%, 16% e 5%.
- O botão do editor usa o mesmo Nominatim, em busca livre — pior ainda.

## O universo (21.274 pinos hoje contados como precisos)

| Grupo | Pinos | Com missa | O que se sabe |
|---|---|---|---|
| A. conferido por gente (`manual`, `gps`) | 25 | 6 | é a referência |
| **B1. pino de rua que o Censo leva até a porta** | **3.097** | 2.042 | refino pronto (`--apply-refino`), anda 210 m na mediana |
| B2. pino de rua que o Censo desmente por > 1,5 km | 216 | ~110 | duas coordenadas, falta quem decida → fila de revisão |
| B3a. pino de rua que o Censo **confirma** (< 60 m) | 1.468 | ~890 | validado por uma base independente |
| B3b. pino de rua sem resposta do Censo (rua não achada, sem número, só o meio da rua) | 1.403 | ~850 | ninguém conferiu |
| B4. pino de rua sem endereço de rua legível | 584 | 390 | só o CEP sustenta o pino |
| C. endereço no Censo (número/templo) | 3.592 | 1.760 | auditado: 97% a até 1 km, 84% a até 150 m |
| D1. casado pelo nome, duas fontes concordam | 4.349 | 2.317 | auditado: 94% a até 1 km, < 1% acima de 5 km |
| **D2. casado pelo nome, uma fonte só** | **6.100** | 2.053 | estimado 1–5% no templo errado (pior em paróquia de distrito) |
| E. legado (origem desconhecida) | 428 | 67 | há lixo: pinos a centenas de km |

## Etapa 0 — sem agentes, já pronto (aguarda ordem)

1. **Refino dos 3.097 pinos de rua** pelo endereço no Censo: `npx ts-node prisma/geocode-enderecos.ts --apply-refino`.
   Só mexe em `cep`/`osm-endereco`; só quando o Censo chega ao número ou ao templo; só quando os
   dois concordam na vizinhança (≤ 1,5 km). Cópia de segurança e `--desfazer`, como sempre.
2. **Chamar as coisas pelo nome na tela**: "na porta" × "na rua (pode estar a quadras)". Pino de
   rua continua valendo para o "missas por perto", mas deixa de se passar por conferido.
3. **Trocar o botão "Buscar pelo endereço"**: primeiro a sugestão do Censo (rua + número); o
   Nominatim vira reserva, com o aviso de que devolve o meio da rua; e um atalho "abrir no Google
   Maps" para a pessoa olhar e voltar — sem copiar dado do Google para o banco.
4. **Fila de revisão** no mapa do território (em construção): os 216 do B2, os conflitos e as
   fontes únicas recusadas viram sugestão de um clique, por ordem de impacto (com missa primeiro).

## Etapa 1 — agentes de validação

**O que um agente faz que o pipeline não faz:** lê a página da paróquia e da diocese, a Wikidata,
o mapa aberto. **O que ele NÃO faz:** gravar pino. Agente produz *evidência*; quem grava é um
script determinístico, com as mesmas travas das cargas, ou uma pessoa na fila de revisão.

### Fila, por impacto

| Onda | Quem | Pinos | Por quê |
|---|---|---|---|
| 1 | B2 + B3b + B4 + E, **com missa** | ~1,4 mil | é o que o fiel usa hoje para achar missa |
| 2 | D2 com missa em município de 2+ paróquias | ~1,2 mil | onde o casamento por nome erra mais |
| 3 | o resto de B3b/B4/D2/E | ~6 mil | sem missa cadastrada: menor impacto |
| amostra | 300 de C e 300 de D1, sorteados por UF | 600 | medir o erro real do que consideramos bom |

### O lote

Um agente recebe ~25 comunidades **da mesma diocese** (o site diocesano serve a todas): id, nome,
paróquia, endereço, cidade/UF, pino atual, origem, grupo e as candidatas que já temos.

Fontes permitidas, nesta ordem:

1. **Site da paróquia / da diocese** — o endereço oficial (confere com o nosso?) e, quando há mapa
   embutido, a coordenada que a própria paróquia publicou (`!3d…!4d…`, `q=lat,lng`, `ll=`).
2. **Wikidata / Wikipedia** — coordenada (P625) de catedral, basílica, santuário, igreja histórica. CC0: pode guardar.
3. **OpenStreetMap** — templo com aquele nome perto do pino. Licença ODbL: serve de **confirmação**, não de coordenada gravada.
4. Página oficial no Facebook/Instagram — só o **endereço** em texto.

Proibido: raspar Google Maps/Places (contrato), agregadores sem autorização, inventar coordenada.

Saída por comunidade (JSON, com esquema validado):

```json
{ "id": "...", "veredito": "confirma | endereco-diferente | pino-longe | sem-evidencia",
  "enderecoOficial": "Rua ..., 123 - Bairro", "coordenada": { "lat": 0, "lng": 0, "origem": "site-paroquia | wikidata" },
  "confirmaOsm": true, "evidencias": [{ "url": "https://...", "trecho": "o literal que sustenta" }] }
```

### Verificação adversarial (o que aprendemos no território)

Dois alertas de agente na carga do território eram falsos. Então: um **segundo agente** reabre cada
URL e confere que o literal está lá (endereço, parâmetro do mapa). O que não se confirma é descartado.
Nada de "o site diz" sem o trecho.

### Do veredito ao pino (script, não agente)

| Evidência verificada | O que acontece |
|---|---|
| coordenada a ≤ 150 m do pino atual, ou OSM confirma o templo ali | pino **validado** (`geoVerifiedAt`, origem da evidência) — sai das filas |
| endereço oficial ≠ o nosso | corrige o endereço → passa pelo geocodificador do Censo → refino ou fila |
| coordenada a > 150 m do pino atual | vira **sugestão** na fila de revisão, com o link da evidência; se coincidir (≤ 100 m) com uma candidata do Censo/Overture, grava sozinho |
| sem evidência | fica como está, marcado "não validado" — candidato ao GPS pelo app |

Falta criar: `Community.geoVerifiedAt` / `geoVerifiedBy` (um migration) e a origem `agente:*` nas sugestões.

### Piloto antes de escalar

Arquidiocese de Curitiba + Diocese de Ponta Grossa (o Rodrigo conhece as duas; os dois erros vieram
de Curitiba). ~400 pinos, 16 lotes. Critério para seguir: o Rodrigo confere 30 sorteados — **≥ 28
certos**, e nenhuma coordenada inventada. Abaixo disso, ajusta-se o prompt e repete-se o piloto.

### Ritmo e custo (estimativa, a confirmar no piloto)

- 4 agentes por vez (acima disso a sessão toma 429, como na carga do território); uma fila de gravação por vez.
- ~25 comunidades por lote, ~10–15 min por lote → ~100 comunidades a cada 15 min.
- Onda 1 (~1,4 mil): ~56 lotes + verificação ≈ 4 h de relógio, da ordem de 15 milhões de tokens.
- Ondas 1 + 2: ~2,6 mil pinos, ≈ 7–8 h, da ordem de 30 milhões de tokens. A onda 3 só depois de medir o ganho das duas primeiras.

## Resultado do piloto (22/09/2026)

Curitiba + Ponta Grossa: 400 comunidades em 21 lotes, 4 agentes por vez, ~2,8 milhões de tokens e ~2 h de relógio.

- Os agentes acharam **endereço oficial para 342 comunidades** (sites das dioceses listam paróquias e comunidades) e
  **coordenada publicada para 21** (iframes de Google Maps em sites próprios, Wikidata). A diocese de Ponta Grossa usa
  Google My Maps, que não expõe coordenada; a Arquidiocese de Curitiba só linka busca por endereço.
- Verificação literal por script: **477 de 483 evidências confirmadas** (o resto: Facebook que não abre, trecho curto).
  O agente verificador não foi necessário.
- OpenStreetMap ficou fora: o Overpass respondeu 504/timeout o dia todo. No lugar, confirmação por templo do Censo ou
  da Overture de fonte **independente** da que gerou o pino (mesmo padroeiro, ≤ 150 m).
- Aplicado (com cópia de segurança): **127 pinos conferidos** (75 por templo independente, 42 por endereço oficial +
  Censo, 10 por coordenada publicada), **11 pinos legados a 240–2.575 km do próprio município** devolvidos ao centro dele,
  **11 sugestões novas** na fila (coordenadas publicadas a 0,2–3,9 km do pino atual) e **1 pino gravado por duas fontes**
  (São Pedro e São Paulo/Tingui: site da paróquia coincide com a Overture, pino por CEP estava a 5,7 km).
- Ficaram em CSV para gente olhar: 20 capelas com endereço oficial diferente do nosso (herdado da matriz) e 5 legados
  longe da localidade oficial.
- Lições: iframe com zoom aberto devolve o centro do mapa, a quilômetros da igreja (guarda: coordenada fora do município
  é descartada); "Praça da Matriz"/slug genérico do site da Arquidiocese devolve o endereço da Cúria (guarda no verificador);
  a condição  em SQL é falsa para NULL — a primeira gravação pulou os legados.
- **Amostra de 30** para conferência humana: . Critério: ≥ 28 certas.

## Etapa 2 — gente

O que nem o Censo nem os agentes resolvem só se resolve no lugar: fila de revisão aberta a dioceses e
paróquias (cada uma vê as suas) e botão "estou na igreja" no app, que grava o GPS (`geoSource: gps`).
É também o único caminho para as ~17 mil comunidades sem nenhuma pista automática.

## Como saber se deu certo

- % de pinos **validados** (por gente ou por evidência verificada) entre os que têm missa — hoje ≈ 0,1%.
- Erro medido na amostra de 600 (C e D1): meta ≤ 2% acima de 1 km.
- Fila de revisão zerada para quem tem missa.
