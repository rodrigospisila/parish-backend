-- Recorte nacional da Overture Maps (lugares de Meta/Microsoft, licença aberta CDLA
-- Permissive 2.0): tudo o que parece templo dentro do retângulo do Brasil. A separação
-- por município e a triagem do que é católico ficam no casador (geocode-fontes.ts).
--
-- Rodar com o DuckDB CLI (https://duckdb.org), a partir de prisma/data/geo/cache/overture:
--   duckdb < ../../overture-br.sql
--
-- Lê Parquet direto do S3 público, sem conta. ~10 min; sai um CSV de dezenas de MB.
-- Ao trocar de release, confira a lista em https://docs.overturemaps.org/release/latest/
INSTALL httpfs; LOAD httpfs;
SET s3_region='us-west-2';
COPY (
  SELECT id,
         replace(replace(names.primary, ';', ','), chr(10), ' ') AS nome,
         categories.primary AS cat,
         round(confidence, 2) AS conf,
         bbox.xmin AS lng, bbox.ymin AS lat,
         replace(replace(coalesce(addresses[1].freeform, ''), ';', ','), chr(10), ' ') AS endereco,
         replace(coalesce(addresses[1].locality, ''), ';', ',') AS cidade,
         coalesce(addresses[1].region, '') AS uf
  FROM read_parquet('s3://overturemaps-us-west-2/release/2026-08-19.0/theme=places/type=place/*', hive_partitioning=1)
  WHERE bbox.xmin BETWEEN -74.1 AND -28.8 AND bbox.ymin BETWEEN -33.8 AND 5.4
    AND (addresses[1].country = 'BR' OR addresses[1].country IS NULL)
    AND (categories.primary ILIKE '%church%' OR categories.primary ILIKE '%religio%' OR categories.primary ILIKE '%worship%'
         OR regexp_matches(lower(names.primary), '(capela|igreja|par.quia|matriz|santu.rio|catedral|bas.lica)'))
) TO 'br-lugares.csv' (HEADER, DELIMITER ';');
