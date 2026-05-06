import type { Advertisement } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import AppError from "../../errors/AppError";
import prisma from "../../utils/prisma";

const getAdvertisement = async (): Promise<Advertisement | null> => {
  return prisma.advertisement.findFirst();
};

const upsertAdvertisement = async (
  imageUrl: string,
  linkUrl: string,
): Promise<Advertisement> => {
  const existingAd = await prisma.advertisement.findFirst();

  if (existingAd) {
    // Attempt to delete old image from Cloudinary
    try {
      const urlParts = existingAd.imageUrl.split("/");
      const fileName = urlParts[urlParts.length - 1];
      const publicId = `surfshare/${fileName.split(".")[0]}`;
      await cloudinary.uploader.destroy(publicId);
    } catch (e) {
      console.error("Failed to delete old image from cloudinary", e);
    }

    return prisma.advertisement.update({
      where: { id: existingAd.id },
      data: { imageUrl, linkUrl },
    });
  }

  return prisma.advertisement.create({
    data: { imageUrl, linkUrl },
  });
};

const deleteAdvertisement = async (): Promise<Advertisement> => {
  const existingAd = await prisma.advertisement.findFirst();
  
  if (!existingAd) {
    throw new AppError(404, "No advertisement found to delete.");
  }

  try {
    const urlParts = existingAd.imageUrl.split("/");
    const fileName = urlParts[urlParts.length - 1];
    const publicId = `surfshare/${fileName.split(".")[0]}`;
    await cloudinary.uploader.destroy(publicId);
  } catch (e) {
    console.error("Failed to delete image from cloudinary", e);
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
