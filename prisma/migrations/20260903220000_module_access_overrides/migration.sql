-- Matriz do SYSTEM_ADMIN: módulo do painel DESATIVADO para um papel.
-- Ausência de linha = módulo disponível (comportamento padrão do papel).
CREATE TABLE "module_access_overrides" (
    "id" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "module_access_overrides_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "module_access_overrides_moduleKey_role_key" ON "module_access_overrides"("moduleKey", "role");
