/* Backfill photo metadata from Cloudinary and update Prisma DB
   Run from backend root: `node scripts/backfill-photo-metadata.js`
*/

const { PrismaClient } = require("@prisma/client");
const cloudinary = require("cloudinary").v2;
const url = require("url");
const path = require("path");

require("dotenv").config();

cloudinary.config({
  cloud_name:
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.CLOUDINARY_CLOUDNAME ||
    process.env.CLOUDINARY_URL?.match(/cloud_name=([^&]+)/)?.[1],
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const prisma = new PrismaClient();

function extractPublicId(imageUrl) {
  if (!imageUrl) return null;
  try {
    const parsed = url.parse(imageUrl);
    const parts = parsed.pathname.split("/");
    // Cloudinary public id comes after '/upload/' and may include folders and version prefix like /v167...
    const uploadIndex = parts.findIndex((p) => p === "upload");
    if (uploadIndex === -1) return null;
    const afterUpload = parts.slice(uploadIndex + 1);
    // remove version segment if present (starts with 'v' followed by digits)
    if (afterUpload.length > 0 && /^v\d+$/.test(afterUpload[0])) {
      afterUpload.shift();
    }
    const fileName = afterUpload.join("/");
    // remove extension
    const ext = path.extname(fileName);
    const publicId = fileName.replace(ext, "");
    return publicId;
  } catch (err) {
    return null;
  }
}

async function main() {
  console.log("Starting backfill of photo metadata...");

  const photos = await prisma.photo.findMany({
    where: {
      OR: [
        { width: null },
        { height: null },
        { format: null },
        { fileSize: null },
      ],
    },
  });

  console.log(`Found ${photos.length} photos missing metadata.`);

  for (const p of photos) {
    try {
      const publicId = extractPublicId(p.imageUrl);
      if (!publicId) {
        console.warn(`Could not extract publicId for ${p.id} - ${p.imageUrl}`);
        continue;
      }

      const resource = await cloudinary.api.resource(publicId, {
        resource_type: "image",
      });
      if (!resource) {
        console.warn(`Cloudinary resource not found for ${publicId}`);
        continue;
      }

      const width = resource.width || null;
      const height = resource.height || null;
      const format = resource.format || null;
      const fileSize = resource.bytes || null;

      await prisma.photo.update({
        where: { id: p.id },
        data: {
          width,
          height,
          format,
          fileSize,
        },
      });

      console.log(
        `Updated ${p.id}: ${width}x${height} ${format} ${(fileSize || 0) / 1024} KB`,
      );
    } catch (err) {
      console.error(`Failed to update ${p.id}:`, err.message || err);
    }
  }

  console.log("Backfill complete.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Backfill script error:", err);
  process.exit(1);
});
