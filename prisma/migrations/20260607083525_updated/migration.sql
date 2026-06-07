-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "PhotoStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SURFER', 'PHOTOGRAPHER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD');

-- CreateEnum
CREATE TYPE "ModeratorPermission" AS ENUM ('APPROVE_PHOTO', 'ADD_LOCATION', 'ALL_ACCESS');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SURFER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'BRONZE',
    "countryName" TEXT,
    "address" TEXT,
    "phoneNumber" TEXT,
    "profileImageUrl" TEXT,
    "paypalEmail" TEXT,
    "acceptedApproval" BOOLEAN DEFAULT false,
    "acceptedContributor" BOOLEAN DEFAULT false,
    "socialAccount" JSONB,
    "permissions" "ModeratorPermission"[],
    "otp" TEXT,
    "otpExpiry" TIMESTAMP(3),
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "refreshToken" TEXT,
    "promotionEmail" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_configs" (
    "id" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL,
    "photographerSplit" INTEGER NOT NULL,
    "platformSplit" INTEGER NOT NULL,
    "maxPrice" DOUBLE PRECISION,
    "dailyUploadLimit" INTEGER,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advertisements" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advertisements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentSpot" TEXT,
    "region" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "photosAvailable" INTEGER NOT NULL DEFAULT 0,
    "previewImage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "imageUrl" TEXT NOT NULL,
    "originalUrl" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "status" "PhotoStatus" NOT NULL DEFAULT 'PENDING',
    "timeKey" TEXT NOT NULL DEFAULT 'any',
    "capturedAt" TIMESTAMP(3),
    "width" INTEGER,
    "height" INTEGER,
    "format" TEXT,
    "fileSize" INTEGER,
    "photographerId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "stripeSessionId" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "photographerEarnings" DOUBLE PRECISION,
    "platformFee" DOUBLE PRECISION,
    "orderId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_configs_tier_key" ON "subscription_configs"("tier");

-- CreateIndex
CREATE INDEX "locations_name_region_state_idx" ON "locations"("name", "region", "state");

-- CreateIndex
CREATE INDEX "photos_photographerId_idx" ON "photos"("photographerId");

-- CreateIndex
CREATE INDEX "photos_locationId_idx" ON "photos"("locationId");

-- CreateIndex
CREATE INDEX "photos_status_idx" ON "photos"("status");

-- CreateIndex
CREATE INDEX "photos_timeKey_idx" ON "photos"("timeKey");

-- CreateIndex
CREATE INDEX "favorites_userId_idx" ON "favorites"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_userId_photoId_key" ON "favorites"("userId", "photoId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_stripeSessionId_key" ON "orders"("stripeSessionId");

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_orderId_photoId_key" ON "order_items"("orderId", "photoId");

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_photographerId_fkey" FOREIGN KEY ("photographerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
