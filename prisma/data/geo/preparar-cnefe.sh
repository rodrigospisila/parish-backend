#!/usr/bin/env bash
# Prepara o CNEFE (Cadastro Nacional de Endereços para Fins Estatísticos, Censo 2022,
# IBGE) para o casamento de pinos das comunidades.
#
# O CNEFE é público e traz TODOS os endereços do país com coordenada de GPS coletada
# pelo recenseador — inclusive na zona rural, onde nenhum geocodificador chega. São
# ~106 milhões de linhas (2 GB compactados); daqui saem dois extratos pequenos por UF:
#
#   <uf>-religiosos.csv   os estabelecimentos religiosos (COD_ESPECIE = 8):
#       COD_MUNICIPIO;LOCALIDADE;LOGRADOURO;LAT;LNG;NIVEL_DA_COORDENADA;DESCRICAO
#   <uf>-localidades.csv  cada localidade/bairro com o centro e a extensão dos endereços:
#       COD_MUNICIPIO;LOCALIDADE;N_ENDERECOS;LAT_MEDIA;LNG_MEDIA;LAT_MIN;LAT_MAX;LNG_MIN;LNG_MAX
#
# Uso (Git Bash, a partir de parish-backend):
#   bash prisma/data/geo/preparar-cnefe.sh            # todos os estados
#   bash prisma/data/geo/preparar-cnefe.sh PR SE      # só alguns
#
# Retomável: UF que já tem os dois extratos é pulada. O zip é apagado depois de lido.
set -u
BASE="https://ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/Censo_Demografico_2022/Arquivos_CNEFE/CSV/UF"
DEST="$(dirname "$0")/cache/cnefe"
mkdir -p "$DEST"

declare -A COD=( [RO]=11 [AC]=12 [AM]=13 [RR]=14 [PA]=15 [AP]=16 [TO]=17 [MA]=21 [PI]=22 [CE]=23 [RN]=24 [PB]=25 [PE]=26 [AL]=27 [SE]=28 [BA]=29 [MG]=31 [ES]=32 [RJ]=33 [SP]=35 [PR]=41 [SC]=42 [RS]=43 [MS]=50 [MT]=51 [GO]=52 [DF]=53 )
UFS=("$@"); [ ${#UFS[@]} -eq 0 ] && UFS=(AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO)

for UF in "${UFS[@]}"; do
  uf=$(echo "$UF" | tr 'A-Z' 'a-z'); cod=${COD[$UF]:-}
  [ -z "$cod" ] && { echo "UF desconhecida: $UF"; continue; }
  rel="$DEST/$uf-religiosos.csv"; loc="$DEST/$uf-localidades.csv"; zip="$DEST/${cod}_${UF}.zip"
  if [ -s "$rel" ] && [ -s "$loc" ]; then echo "$UF: já preparado ($(wc -l < "$rel") religiosos)"; continue; fi

  echo "$UF: baixando..."
  curl -s -k -L -m 3600 -A "Mozilla/5.0" "$BASE/${cod}_${UF}.zip" -o "$zip" || { echo "$UF: falha no download"; continue; }
  unzip -tq "$zip" > /dev/null 2>&1 || { echo "$UF: zip corrompido, apagado"; rm -f "$zip"; continue; }

  # Uma passada só: o awk escreve os religiosos num arquivo e, no fim, as localidades no outro.
  # Colunas: 3 COD_MUNICIPIO · 10 DSC_LOCALIDADE · 11 TIPO · 13 LOGRADOURO · 14 NUMERO ·
  #          26 LATITUDE · 27 LONGITUDE · 28 NV_GEO_COORD · 29 COD_ESPECIE · 30 DSC_ESTABELECIMENTO
  unzip -p "$zip" | awk -F';' -v REL="$rel.tmp" -v LOC="$loc.tmp" '
    NR > 1 && $26 != "" {
      if ($29 == 8) print $3";"$10";"$11" "$13" "$14";"$26";"$27";"$28";"$30 > REL
      if ($10 != "") {
        k = $3";"$10; n[k]++; sx[k] += $26; sy[k] += $27
        if (!(k in a) || $26 < a[k]) a[k] = $26; if (!(k in b) || $26 > b[k]) b[k] = $26
        if (!(k in c) || $27 < c[k]) c[k] = $27; if (!(k in d) || $27 > d[k]) d[k] = $27
      }
    }
    END { for (k in n) printf "%s;%d;%.6f;%.6f;%.6f;%.6f;%.6f;%.6f\n", k, n[k], sx[k]/n[k], sy[k]/n[k], a[k], b[k], c[k], d[k] > LOC }'
  mv "$rel.tmp" "$rel"; mv "$loc.tmp" "$loc"; rm -f "$zip"
  echo "$UF: $(wc -l < "$rel") religiosos · $(wc -l < "$loc") localidades"
done
echo "CNEFE PRONTO"
