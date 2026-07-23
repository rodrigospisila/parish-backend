-- AlterTable
ALTER TABLE "users" ADD COLUMN     "dioceseId" TEXT,
ADD COLUMN     "forcePasswordChange" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_dioceseId_fkey" FOREIGN KEY ("dioceseId") REFERENCES "dioceses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
