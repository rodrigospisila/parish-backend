#!/usr/bin/env bash
# Segunda passada no CNEFE (IBGE, Censo 2022), agora como GEOCODIFICADOR: guarda, de cada UF, só os endereços das ruas
# que as nossas comunidades declaram — com número e GPS — e regrava os templos com o TÍTULO da rua, que a primeira
# passada tinha deixado de fora ("RUA SAO JOSE" saía "RUA JOSE").
#
# Antes:   npx ts-node prisma/geocode-enderecos.ts --alvos     (gera cache/enderecos/chaves.txt, chaves-extra.txt e filtro.awk)
# Uso:     bash prisma/data/geo/preparar-cnefe-ruas.sh                 # todos os estados
#          bash prisma/data/geo/preparar-cnefe-ruas.sh PR SE
#          bash prisma/data/geo/preparar-cnefe-ruas.sh --extra [UFs]   # só as ruas de chaves-extra.txt → <uf>-ruas-extra.csv
#          bash prisma/data/geo/preparar-cnefe-ruas.sh --oficiais [UFs]   # ruas dos ENDEREÇOS OFICIAIS achados pelos agentes (chaves-oficiais.txt,
#                                                                     # que cresce a cada onda) → <uf>-ruas-oficiais.csv; guarda o zip em
#                                                                     # cache/enderecos/zips/ e refaz o extrato sempre (é só um awk)
#
# Saída, em prisma/data/geo/cache/:
#   enderecos/<uf>-ruas.csv       COD_MUNICIPIO;CHAVE_DA_RUA;TIPO;NUMERO;LAT;LNG;NIVEL;ESPECIE;ESTABELECIMENTO;LOCALIDADE
#   cnefe/<uf>-religiosos-v2.csv  como o -religiosos.csv, com o título no logradouro
# Retomável: UF que já tem o extrato é pulada. O zip (2 GB no total) é apagado depois de lido.
set -u
BASE="https://ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/Censo_Demografico_2022/Arquivos_CNEFE/CSV/UF"
RAIZ="$(dirname "$0")/cache"
DIR="$RAIZ/enderecos"
CHAVES="chaves.txt"; SUFIXO="ruas"
OFICIAIS=0
if [ "${1:-}" = "--extra" ]; then CHAVES="chaves-extra.txt"; SUFIXO="ruas-extra"; shift; fi
if [ "${1:-}" = "--oficiais" ]; then CHAVES="chaves-oficiais.txt"; SUFIXO="ruas-oficiais"; OFICIAIS=1; shift; mkdir -p "$DIR/zips"; fi
[ -s "$DIR/$CHAVES" ] && [ -s "$DIR/filtro.awk" ] || { echo "faltam $DIR/$CHAVES e filtro.awk — rode antes: npx ts-node prisma/geocode-enderecos.ts --alvos"; exit 1; }

declare -A COD=( [RO]=11 [AC]=12 [AM]=13 [RR]=14 [PA]=15 [AP]=16 [TO]=17 [MA]=21 [PI]=22 [CE]=23 [RN]=24 [PB]=25 [PE]=26 [AL]=27 [SE]=28 [BA]=29 [MG]=31 [ES]=32 [RJ]=33 [SP]=35 [PR]=41 [SC]=42 [RS]=43 [MS]=50 [MT]=51 [GO]=52 [DF]=53 )
UFS=("$@"); [ ${#UFS[@]} -eq 0 ] && UFS=(AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO)

for UF in "${UFS[@]}"; do
  uf=$(echo "$UF" | tr 'A-Z' 'a-z'); cod=${COD[$UF]:-}
  [ -z "$cod" ] && { echo "UF desconhecida: $UF"; continue; }
  ruas="$DIR/$uf-$SUFIXO.csv"; rel="$RAIZ/cnefe/$uf-religiosos-v2.csv"; zip="$DIR/${cod}_${UF}-$SUFIXO.zip"
  if [ "$OFICIAIS" = 1 ]; then zip="$DIR/zips/${cod}_${UF}.zip"; rel="$DIR/zips/$uf-religiosos-descartar.csv"; elif [ -e "$ruas" ]; then echo "$UF: já preparado ($(wc -l < "$ruas") endereços)"; continue; fi

  if [ -s "$zip" ] && unzip -tq "$zip" > /dev/null 2>&1; then echo "$UF: zip já baixado"; else echo "$UF: baixando..."; rm -f "$zip"; fi
  for tentativa in 1 2 3; do
    [ -s "$zip" ] && break
    curl -s -k -L -m 3600 -A "Mozilla/5.0" "$BASE/${cod}_${UF}.zip" -o "$zip" && unzip -tq "$zip" > /dev/null 2>&1 && break
    echo "$UF: tentativa $tentativa falhou"; rm -f "$zip"; sleep 20
  done
  [ -s "$zip" ] || { echo "$UF: falha no download"; continue; }

  unzip -p "$zip" | awk -F';' -v CHAVES="$DIR/$CHAVES" -v RUAS="$ruas.tmp" -v REL="$rel.tmp" -f "$DIR/filtro.awk"
  touch "$ruas.tmp" "$rel.tmp"
  mv "$ruas.tmp" "$ruas"; mv "$rel.tmp" "$rel"
  if [ "$OFICIAIS" = 1 ]; then rm -f "$rel"; else rm -f "$zip"; fi
  echo "$UF: $(wc -l < "$ruas") endereços nas ruas-alvo"
done
echo "RUAS PRONTAS"
