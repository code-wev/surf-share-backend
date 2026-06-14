/*
  Warnings:

  - You are about to drop the column `paypalEmail` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[stripeAccountId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "paypalEmail",
ADD COLUMN     "stripeAccountId" TEXT,
ADD COLUMN     "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeAccountId_key" ON "users"("stripeAccountId");
