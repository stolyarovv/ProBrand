-- CreateEnum
CREATE TYPE "ProjectKind" AS ENUM ('COMMERCIAL', 'INTERNAL');

-- CreateEnum
CREATE TYPE "ProjectWorkType" AS ENUM (
  'BRANDING',
  'WEB_DEVELOPMENT',
  'CONSULTING',
  'SUPPORT',
  'MARKETING',
  'DESIGN',
  'OTHER'
);

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "clientId" DROP NOT NULL;

ALTER TABLE "Project" ADD COLUMN "ownerId" TEXT,
ADD COLUMN "kind" "ProjectKind" NOT NULL DEFAULT 'COMMERCIAL',
ADD COLUMN "workType" "ProjectWorkType" NOT NULL DEFAULT 'OTHER';

ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");
