-- AlterTable
ALTER TABLE "photos" ADD COLUMN     "capturedAt" TIMESTAMP(3),
ADD COLUMN     "timeKey" TEXT NOT NULL DEFAULT 'any';

-- CreateIndex
CREATE INDEX "photos_timeKey_idx" ON "photos"("timeKey");
