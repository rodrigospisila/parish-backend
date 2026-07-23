/*
  Warnings:

  - You are about to drop the column `address` on the `members` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'COMMON_LAW_MARRIAGE');

-- AlterTable
ALTER TABLE "members" DROP COLUMN "address",
ADD COLUMN     "complement" TEXT,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "maritalStatus" "MaritalStatus",
ADD COLUMN     "neighborhood" TEXT,
ADD COLUMN     "number" TEXT,
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "street" TEXT;
