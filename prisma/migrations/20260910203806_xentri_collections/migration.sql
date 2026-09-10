-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('PENDING', 'SUCCESSFUL', 'FAILED');

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "cnumber" TEXT NOT NULL,
    "msisdn" TEXT NOT NULL,
    "customerRef" TEXT,
    "refid" TEXT,
    "status" "CollectionStatus" NOT NULL DEFAULT 'PENDING',
    "providerStatus" TEXT,
    "note" TEXT,
    "chargesIncluded" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Collection_customerRef_key" ON "Collection"("customerRef");

-- CreateIndex
CREATE INDEX "Collection_status_idx" ON "Collection"("status");

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
