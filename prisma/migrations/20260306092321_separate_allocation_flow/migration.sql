/*
  Warnings:

  - You are about to drop the column `applied_fcy` on the `payment_allocations` table. All the data in the column will be lost.
  - Added the required column `invoice_thb` to the `payment_allocations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payment_allocations" DROP COLUMN "applied_fcy",
ADD COLUMN     "invoice_thb" DECIMAL(18,2) NOT NULL;

-- AlterTable
ALTER TABLE "receipts" ADD COLUMN     "allocated_thb" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'UNALLOCATED';
