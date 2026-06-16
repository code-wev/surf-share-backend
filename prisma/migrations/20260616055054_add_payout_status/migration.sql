-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'AUTOMATED_SUCCESS', 'MANUAL_SUCCESS');

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "payoutStatus" "PayoutStatus" NOT NULL DEFAULT 'PENDING';
