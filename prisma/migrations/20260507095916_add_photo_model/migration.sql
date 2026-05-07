-- CreateEnum
CREATE TYPE "PhotoStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "status" "PhotoStatus" NOT NULL DEFAULT 'PENDING',
    "photographerId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "photos_photographerId_idx" ON "photos"("photographerId");

-- CreateIndex
CREATE INDEX "photos_locationId_idx" ON "photos"("locationId");

-- CreateIndex
CREATE INDEX "photos_status_idx" ON "photos"("status");

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_photographerId_fkey" FOREIGN KEY ("photographerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
