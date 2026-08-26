/*
  Warnings:

  - The primary key for the `BudgetItem` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Payment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `PetitCashAssignment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `_BudgetItemToPetitCashAssignment` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_budgetItemId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "PetitCashAssignment" DROP CONSTRAINT "PetitCashAssignment_assignedById_fkey";

-- DropForeignKey
ALTER TABLE "PetitCashAssignment" DROP CONSTRAINT "PetitCashAssignment_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "_BudgetItemToPetitCashAssignment" DROP CONSTRAINT "_BudgetItemToPetitCashAssignment_A_fkey";

-- DropForeignKey
ALTER TABLE "_BudgetItemToPetitCashAssignment" DROP CONSTRAINT "_BudgetItemToPetitCashAssignment_B_fkey";

-- AlterTable
ALTER TABLE "BudgetItem" DROP CONSTRAINT "BudgetItem_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "BudgetItem_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "BudgetItem_id_seq";

-- AlterTable
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "employeeId" SET DATA TYPE TEXT,
ALTER COLUMN "assignmentId" SET DATA TYPE TEXT,
ALTER COLUMN "budgetItemId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Payment_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Payment_id_seq";

-- AlterTable
ALTER TABLE "PetitCashAssignment" DROP CONSTRAINT "PetitCashAssignment_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "assignedToId" SET DATA TYPE TEXT,
ALTER COLUMN "assignedById" SET DATA TYPE TEXT,
ADD CONSTRAINT "PetitCashAssignment_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "PetitCashAssignment_id_seq";

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- AlterTable
ALTER TABLE "_BudgetItemToPetitCashAssignment" DROP CONSTRAINT "_BudgetItemToPetitCashAssignment_AB_pkey",
ALTER COLUMN "A" SET DATA TYPE TEXT,
ALTER COLUMN "B" SET DATA TYPE TEXT,
ADD CONSTRAINT "_BudgetItemToPetitCashAssignment_AB_pkey" PRIMARY KEY ("A", "B");

-- AddForeignKey
ALTER TABLE "PetitCashAssignment" ADD CONSTRAINT "PetitCashAssignment_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetitCashAssignment" ADD CONSTRAINT "PetitCashAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "PetitCashAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_budgetItemId_fkey" FOREIGN KEY ("budgetItemId") REFERENCES "BudgetItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BudgetItemToPetitCashAssignment" ADD CONSTRAINT "_BudgetItemToPetitCashAssignment_A_fkey" FOREIGN KEY ("A") REFERENCES "BudgetItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BudgetItemToPetitCashAssignment" ADD CONSTRAINT "_BudgetItemToPetitCashAssignment_B_fkey" FOREIGN KEY ("B") REFERENCES "PetitCashAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
