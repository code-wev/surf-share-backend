import { PhotoStatus } from "@prisma/client";
import prisma from "../../utils/prisma";
import type { IPhotoBulkItem } from "./photo.interface";

const bulkCreatePhotos = async (photographerId: string, items: IPhotoBulkItem[]) => {
  // Check how many approved photos the photographer has
  const approvedCount = await prisma.photo.count({
    where: {
      photographerId,
      status: PhotoStatus.APPROVED,
    },
  });

  const newStatus = approvedCount >= 10 ? PhotoStatus.APPROVED : PhotoStatus.PENDING;

  const photoRecords = items.map(item => ({
    photographerId,
    imageUrl: item.imageUrl,
    locationId: item.locationId,
    price: item.price,
    status: newStatus,
  }));

  const result = await prisma.photo.createMany({
    data: photoRecords,
  });

  return result;
};

export const PhotoService = {
  bulkCreatePhotos,
};
