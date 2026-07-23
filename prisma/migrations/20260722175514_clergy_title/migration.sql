-- CreateEnum
CREATE TYPE "ClergyTitle" AS ENUM ('BISHOP', 'PRIEST', 'DEACON');

-- AlterTable
ALTER TABLE "clergy_messages" ADD COLUMN     "senderClergyTitle" "ClergyTitle";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "clergyTitle" "ClergyTitle";
