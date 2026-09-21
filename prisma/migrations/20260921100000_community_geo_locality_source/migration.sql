-- Plano dos pinos, etapa 1: precisão LOCALITY e origem do pino.
--
-- LOCALITY = centro do povoado, distrito ou bairro, calculado dos endereços do Censo
-- 2022 naquela localidade. É o degrau entre a rua e o centro do município: capela
-- rural sem endereço não tem como ir além disso sem alguém no local.
--
-- geoSource guarda de onde veio cada coordenada (cep, ibge-municipio, osm-endereco,
-- cnefe, overture, manual, gps...), para auditar ou desfazer uma fonte inteira.

ALTER TYPE "GeoPrecision" ADD VALUE IF NOT EXISTS 'LOCALITY' BEFORE 'CITY';

ALTER TABLE "communities" ADD COLUMN "geoSource" TEXT;

CREATE INDEX "communities_geoSource_idx" ON "communities"("geoSource");
