/*
  Warnings:

  - You are about to drop the column `communityId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `dioceseId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `parishId` on the `users` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_communityId_fkey";

-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_dioceseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_parishId_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "communityId",
DROP COLUMN "dioceseId",
DROP COLUMN "parishId",
ADD COLUMN     "primaryCommunityId" TEXT;

-- CreateTable
CREATE TABLE "user_communities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "user_communities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_communities_userId_idx" ON "user_communities"("userId");

-- CreateIndex
CREATE INDEX "user_communities_communityId_idx" ON "user_communities"("communityId");

-- CreateIndex
CREATE INDEX "user_communities_isActive_idx" ON "user_communities"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "user_communities_userId_communityId_key" ON "user_communities"("userId", "communityId");

-- AddForeignKey
ALTER TABLE "user_communities" ADD CONSTRAINT "user_communities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_communities" ADD CONSTRAINT "user_communities_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
