-- Conta removida pela gestão (M34/M16 da auditoria): em vez de apagar o
-- registro, o usuário é desativado e tem os dados pessoais substituídos.
-- anonymizedAt marca essas contas (somem da lista de usuários).

-- AlterTable
ALTER TABLE "users" ADD COLUMN "anonymizedAt" TIMESTAMP(3);
