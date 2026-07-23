-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SYSTEM_ADMIN';

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "responsibleId" TEXT;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
