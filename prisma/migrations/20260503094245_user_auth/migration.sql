-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SURFER', 'PHOTOGRAPHER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "ModeratorPermission" AS ENUM ('APPROVE_PHOTO', 'ADD_LOCATION', 'ALL_ACCESS');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SURFER',
    "countryName" TEXT,
    "address" TEXT,
    "phoneNumber" TEXT,
    "paypalEmail" TEXT,
    "permissions" "ModeratorPermission"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
