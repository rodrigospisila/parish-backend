-- CreateEnum
CREATE TYPE "MemberType" AS ENUM ('MEMBER', 'AGENT', 'COORDINATOR', 'CATECHIST', 'MINISTER', 'VOLUNTEER', 'FAMILY_RESPONSIBLE', 'CANDIDATE');

-- CreateEnum
CREATE TYPE "PastoralKind" AS ENUM ('PASTORAL', 'MOVEMENT', 'MINISTRY', 'SERVICE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MemberStatus" ADD VALUE 'AWAY';
ALTER TYPE "MemberStatus" ADD VALUE 'IN_FORMATION';
ALTER TYPE "MemberStatus" ADD VALUE 'TRANSFERRED';
ALTER TYPE "MemberStatus" ADD VALUE 'DISENGAGED';

-- AlterTable
ALTER TABLE "global_pastorals" ADD COLUMN     "kind" "PastoralKind" NOT NULL DEFAULT 'PASTORAL';

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "emergencyContactRelation" TEXT,
ADD COLUMN     "memberType" "MemberType";
