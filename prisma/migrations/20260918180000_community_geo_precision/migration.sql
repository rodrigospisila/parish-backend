-- Precisão da coordenada da comunidade.
--
-- O backfill do território geocodifica 52 mil comunidades em camadas: CEP
-- específico (nível de rua) e, para quem não tem endereço localizável, o centro
-- do município. Sem registrar a origem, um centro de cidade passaria por
-- endereço exato, e a busca "missas por perto" mentiria a distância.
-- Nulo = pino legado, anterior a este campo.

CREATE TYPE "GeoPrecision" AS ENUM ('MANUAL', 'STREET', 'CITY');

ALTER TABLE "communities" ADD COLUMN "geoPrecision" "GeoPrecision";

CREATE INDEX "communities_geoPrecision_idx" ON "communities"("geoPrecision");
