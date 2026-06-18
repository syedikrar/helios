-- CreateEnum
CREATE TYPE "ScopeStatus" AS ENUM ('IDENTIFIED', 'APPROVED', 'IN_WORKPACK', 'COMPLETE');

-- CreateEnum
CREATE TYPE "WorkPackStatus" AS ENUM ('PLANNED', 'READY', 'IN_PROGRESS', 'COMPLETE', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "MaterialStatus" AS ENUM ('REQUIRED', 'ORDERED', 'RECEIVED', 'SHORTAGE');

-- CreateEnum
CREATE TYPE "WeldStatus" AS ENUM ('FIT_UP', 'WELDED', 'INSPECTED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NdeResult" AS ENUM ('PENDING', 'PASS', 'FAIL');

-- CreateEnum
CREATE TYPE "NcrStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'CLOSED');

-- CreateEnum
CREATE TYPE "SafeguardType" AS ENUM ('PTW', 'ISOLATION', 'CONFINED_SPACE', 'HOT_WORK');

-- CreateEnum
CREATE TYPE "SafeguardStatus" AS ENUM ('OPEN', 'ACTIVE', 'CLOSED');

-- CreateTable
CREATE TABLE "ScopeItem" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workPackId" TEXT,
    "ref" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "discipline" TEXT NOT NULL,
    "equipmentTag" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "estimatedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "ScopeStatus" NOT NULL DEFAULT 'IDENTIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScopeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkPack" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "discipline" TEXT NOT NULL,
    "plannedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hoursBurned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "progressPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contractor" TEXT,
    "status" "WorkPackStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "workPackId" TEXT NOT NULL,
    "partNo" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'ea',
    "status" "MaterialStatus" NOT NULL DEFAULT 'REQUIRED',
    "supplier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Welder" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "stamp" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "process" TEXT,
    "certification" TEXT,
    "certExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Welder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wps" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "process" TEXT,
    "baseMetal" TEXT,
    "fillerMetal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pqr" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "wpsId" TEXT,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pqr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeldRecord" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workPackId" TEXT,
    "weldId" TEXT NOT NULL,
    "joint" TEXT,
    "lineIso" TEXT,
    "welderId" TEXT,
    "wpsId" TEXT,
    "pqrRef" TEXT,
    "heatNo" TEXT,
    "ndeResult" "NdeResult" NOT NULL DEFAULT 'PENDING',
    "status" "WeldStatus" NOT NULL DEFAULT 'FIT_UP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeldRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QaCheck" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workPackId" TEXT,
    "weldId" TEXT,
    "checklist" TEXT NOT NULL,
    "result" TEXT NOT NULL DEFAULT 'PENDING',
    "inspector" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QaCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ncr" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'MINOR',
    "status" "NcrStatus" NOT NULL DEFAULT 'OPEN',
    "raisedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ncr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafeguardItem" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workPackId" TEXT,
    "type" "SafeguardType" NOT NULL DEFAULT 'PTW',
    "title" TEXT NOT NULL,
    "status" "SafeguardStatus" NOT NULL DEFAULT 'OPEN',
    "responsible" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafeguardItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonLearned" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "recommendation" TEXT,
    "pushedToLibrary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonLearned_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScopeItem_projectId_idx" ON "ScopeItem"("projectId");

-- CreateIndex
CREATE INDEX "WorkPack_projectId_idx" ON "WorkPack"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Welder_stamp_key" ON "Welder"("stamp");

-- CreateIndex
CREATE UNIQUE INDEX "Wps_ref_key" ON "Wps"("ref");

-- CreateIndex
CREATE UNIQUE INDEX "Pqr_ref_key" ON "Pqr"("ref");

-- CreateIndex
CREATE INDEX "WeldRecord_projectId_lineIso_idx" ON "WeldRecord"("projectId", "lineIso");

-- CreateIndex
CREATE INDEX "QaCheck_projectId_idx" ON "QaCheck"("projectId");

-- CreateIndex
CREATE INDEX "Ncr_projectId_idx" ON "Ncr"("projectId");

-- CreateIndex
CREATE INDEX "SafeguardItem_projectId_idx" ON "SafeguardItem"("projectId");

-- CreateIndex
CREATE INDEX "LessonLearned_projectId_idx" ON "LessonLearned"("projectId");

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_workPackId_fkey" FOREIGN KEY ("workPackId") REFERENCES "WorkPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pqr" ADD CONSTRAINT "Pqr_wpsId_fkey" FOREIGN KEY ("wpsId") REFERENCES "Wps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeldRecord" ADD CONSTRAINT "WeldRecord_welderId_fkey" FOREIGN KEY ("welderId") REFERENCES "Welder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeldRecord" ADD CONSTRAINT "WeldRecord_wpsId_fkey" FOREIGN KEY ("wpsId") REFERENCES "Wps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
