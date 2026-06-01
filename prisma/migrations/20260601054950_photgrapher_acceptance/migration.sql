-- AlterTable
ALTER TABLE "users" ADD COLUMN     "acceptedApproval" BOOLEAN DEFAULT false,
ADD COLUMN     "acceptedContributor" BOOLEAN DEFAULT false;
