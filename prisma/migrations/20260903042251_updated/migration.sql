/*
  Warnings:

  - You are about to drop the column `stripeSessionId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `stripeAccountId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `stripeOnboardingComplete` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[paypalOrderId]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[paypalEmail]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "orders_stripeSessionId_key";

-- DropIndex
DROP INDEX "users_stripeAccountId_key";

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "stripeSessionId",
ADD COLUMN     "paypalOrderId" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "stripeAccountId",
DROP COLUMN "stripeOnboardingComplete",
ADD COLUMN     "paypalConnected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paypalEmail" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "orders_paypalOrderId_key" ON "orders"("paypalOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "users_paypalEmail_key" ON "users"("paypalEmail");
