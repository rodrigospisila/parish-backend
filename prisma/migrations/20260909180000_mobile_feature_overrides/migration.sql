-- Configurações do SYSTEM_ADMIN: recurso do APLICATIVO desativado (global).
-- Ausência de linha = recurso visível.
CREATE TABLE "mobile_feature_overrides" (
    "featureKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mobile_feature_overrides_pkey" PRIMARY KEY ("featureKey")
);
