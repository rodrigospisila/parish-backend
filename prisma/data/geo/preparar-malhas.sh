#!/usr/bin/env bash
# Baixa do IBGE a malha municipal de cada UF (GeoJSON), para saber em que município
# cai uma coordenada vinda de fonte que não traz o código do IBGE (Overture, OSM).
#
# Qualidade "intermediaria": a "minima" simplifica demais a divisa, e um templo perto
# da linha cairia no município vizinho — onde pode existir outra capela do mesmo santo.
#
#   bash prisma/data/geo/preparar-malhas.sh          # todos os estados
#   bash prisma/data/geo/preparar-malhas.sh PR SE
#
# Retomável: UF que já tem malha válida é pulada.
set -u
DEST="$(dirname "$0")/cache/malhas"
mkdir -p "$DEST"
declare -A COD=( [RO]=11 [AC]=12 [AM]=13 [RR]=14 [PA]=15 [AP]=16 [TO]=17 [MA]=21 [PI]=22 [CE]=23 [RN]=24 [PB]=25 [PE]=26 [AL]=27 [SE]=28 [BA]=29 [MG]=31 [ES]=32 [RJ]=33 [SP]=35 [PR]=41 [SC]=42 [RS]=43 [MS]=50 [MT]=51 [GO]=52 [DF]=53 )
UFS=("$@"); [ ${#UFS[@]} -eq 0 ] && UFS=(AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO)

for UF in "${UFS[@]}"; do
  cod=${COD[$UF]:-}; [ -z "$cod" ] && { echo "UF desconhecida: $UF"; continue; }
  out="$DEST/$UF.json"
  if [ -s "$out" ] && head -c 40 "$out" | grep -q FeatureCollection; then echo "$UF: já tem"; continue; fi
  for tentativa in 1 2 3; do
    curl -s -k -L -m 600 "https://servicodados.ibge.gov.br/api/v3/malhas/estados/$cod?intrarregiao=municipio&formato=application/vnd.geo%2Bjson&qualidade=intermediaria" -o "$out.tmp"
    if head -c 40 "$out.tmp" | grep -q FeatureCollection; then mv "$out.tmp" "$out"; echo "$UF: $(du -k "$out" | cut -f1) KB"; break; fi
    echo "$UF: tentativa $tentativa falhou"; rm -f "$out.tmp"; sleep 5
  done
done
echo "MALHAS PRONTAS"
