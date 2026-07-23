-- AlterTable
ALTER TABLE "users" ADD COLUMN     "communityId" TEXT,
ADD COLUMN     "parishId" TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "parishes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
