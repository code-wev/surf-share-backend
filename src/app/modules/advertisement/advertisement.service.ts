import type { Advertisement } from "@prisma/client";
import fs from "fs";
import path from "path";
import AppError from "../../errors/AppError";
import prisma from "../../utils/prisma";

const getAdvertisement = async (): Promise<Advertisement | null> => {
  return prisma.advertisement.findFirst();
};

const upsertAdvertisement = async (
  fileName: string | undefined,
  linkUrl: string,
): Promise<Advertisement> => {
  const existingAd = await prisma.advertisement.findFirst();

  if (existingAd) {
    let finalImageUrl = existingAd.imageUrl;

    if (fileName) {
      try {
        const oldFileName = existingAd.imageUrl.split("/").pop();
        if (oldFileName) {
          const oldPath = path.join(process.cwd(), "public", "uploads", "advertisement", oldFileName);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
      } catch (e) {
        console.error("Failed to delete old image from disk", e);
      }
      finalImageUrl = `/uploads/advertisement/${fileName}`;
    }

    return prisma.advertisement.update({
      where: { id: existingAd.id },
      data: { imageUrl: finalImageUrl, linkUrl },
    });
  }

  if (!fileName) {
    throw new AppError(400, "Advertisement image is required for a new advertisement.");
  }

  return prisma.advertisement.create({
    data: { imageUrl: `/uploads/advertisement/${fileName}`, linkUrl },
  });
};

const deleteAdvertisement = async (): Promise<Advertisement> => {
  const existingAd = await prisma.advertisement.findFirst();
  
  if (!existingAd) {
    throw new AppError(404, "No advertisement found to delete.");
  }

  try {
    const oldFileName = existingAd.imageUrl.split("/").pop();
    if (oldFileName) {
      const oldPath = path.join(process.cwd(), "public", "uploads", "advertisement", oldFileName);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
  } catch (e) {
    console.error("Failed to delete image from disk", e);
  }

  return prisma.advertisement.delete({
    where: { id: existingAd.id },
  });
};

export const AdvertisementService = {
  getAdvertisement,
  upsertAdvertisement,
  deleteAdvertisement,
};
