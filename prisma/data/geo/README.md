# Geolocalização das comunidades

Apoio ao `prisma/geocode-territorio.ts`, que deu pino às 52 mil comunidades do
território em 18/09/2026.

## Arquivos

- `municipios.csv` e `estados.csv` — os 5.570 municípios do IBGE com latitude e
  longitude da sede ([kelvins/municipios-brasileiros](https://github.com/kelvins/municipios-brasileiros)).
  É o que resolve o "centro do município" sem depender de rede.
- `cache-*.json` e `plano-*.json` — gerados pelo script, fora do git. Apagar o
  cache só força a refazer as consultas.

## A precisão do pino (`Community.geoPrecision`)

| Valor | Origem | Entra no "missas por perto"? |
|---|---|---|
| `MANUAL` | pino posto ou conferido por uma pessoa (mapa do território ou cadastro) | sim |
| `STREET` | CEP específico da paróquia ou endereço geocodificado — nível de rua | sim |
| `CITY` | centro do município | **não** |
| nulo | pino legado, anterior ao campo | sim |

`CITY` aparece no mapa do território (`/admin/map`) como *pino aproximado*, que é
a fila de trabalho de quem vai refinar. Fica fora da busca por proximidade porque
quarenta capelas rurais empilhadas na praça da cidade apareceriam todas "a 2 km",
quando estão a 20.

## A armadilha que molda o script

O importador do território grava em **toda** comunidade o CEP — e, na falta de
endereço próprio, o endereço — **da paróquia**. Só a sede paroquial está de fato
naquele CEP. Geocodificar pelo CEP da comunidade daria precisão "de rua" a 12 mil
capelas que não estão ali. Por isso:

- `STREET` por CEP vale **só para a sede**: a comunidade com "matriz" ou
  "catedral" no nome; na falta, "santuário" ou "basílica"; na falta, a comunidade
  única da paróquia.
- Todo o resto vai para o centro do município.

## Camadas e comandos

```bash
npx ts-node prisma/geocode-territorio.ts --fetch          # lê o banco 1x, resolve, grava o plano
npx ts-node prisma/geocode-territorio.ts --apply          # grava (só quem está sem pino)
npx ts-node prisma/geocode-territorio.ts --refine         # endereço das sedes em CITY, 1 req/s no Nominatim
npx ts-node prisma/geocode-territorio.ts --apply-refine   # sobe CITY → STREET
```

1. Sede + CEP específico da paróquia → AwesomeAPI, com BrasilAPI de reserva.
   Uma consulta por CEP distinto (4,6 mil), 99% de acerto.
2. Centro do município pela base do IBGE.
3. Nome de cidade que o IBGE não conhece (distrito gravado como município) → uma
   consulta ao Nominatim **por nome**, com conferência de estado. Cinco grafias
   divergentes estão resolvidas à mão em `APELIDOS`.
4. Refino: endereço da paróquia no Nominatim, só para sedes em `CITY`. Aceita
   apenas `place_rank >= 26` (rua ou mais fino) e resultado a menos de ~60 km do
   centro do município. Amostra de 60: 72% de acerto.

Salvaguardas: nunca toca em pino `MANUAL`, `STREET` ou legado; CEP cuja coordenada
cai longe do município é tratado como erro de digitação e cai para o centro; a
gravação é em lotes de 500 num único `UPDATE`, porque dezenas de milhares de
updates individuais derrubam o proxy do Railway.

## O que ainda falta

- **Capelas com endereço próprio** (cerca de 5,6 mil têm logradouro e número): são
  candidatas a geocodificação por endereço. Com uma `GOOGLE_GEOCODING_API_KEY` o
  `geocode-communities.ts` resolve isso em minutos; pelo Nominatim seriam horas.
- **Capelas rurais** ("Linha Rio Bonito", "Assentamento Libertação Camponesa") não
  têm endereço geocodificável por nenhum serviço: só o pino manual, pelo mapa do
  território, resolve.
