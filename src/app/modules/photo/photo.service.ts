import { PhotoStatus, Prisma } from "@prisma/client";
import prisma from "../../utils/prisma";
import type { IPhotoBulkItem, IPhotoQuery } from "./photo.interface";

const bulkCreatePhotos = async (
  photographerId: string,
  items: IPhotoBulkItem[],
) => {
  // Check how many approved photos the photographer has
  const approvedCount = await prisma.photo.count({
    where: {
      photographerId,
      status: PhotoStatus.APPROVED,
    },
  });

  const newStatus =
    approvedCount >= 10 ? PhotoStatus.APPROVED : PhotoStatus.PENDING;

  const photoRecords = items.map((item) => ({
    photographerId,
    imageUrl: item.imageUrl,
    locationId: item.locationId,
    price: item.price,
    status: newStatus,
    width: item.width ?? undefined,
    height: item.height ?? undefined,
    format: item.format ?? undefined,
    fileSize: item.fileSize ?? undefined,
  }));

  const result = await prisma.photo.createMany({
    data: photoRecords,
  });

  return result;
};

const getMyPhotos = async (photographerId: string, query: IPhotoQuery) => {
  const { page = "1", limit = "100", status, locationId } = query;
  const pageNumber = Number(page);
  const limitNumber = Number(limit);
  const skip = (pageNumber - 1) * limitNumber;

  const where: Prisma.PhotoWhereInput = {
    photographerId,
  };

  if (status) {
    where.status = status;
  }

  if (locationId) {
    where.locationId = locationId;
  }

  const [photos, total] = await Promise.all([
    prisma.photo.findMany({
      where,
      include: {
        location: {
          select: {
            id: true,
            name: true,
            state: true,
            region: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limitNumber,
    }),
    prisma.photo.count({ where }),
  ]);

  return {
    meta: {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber),
    },
    data: photos,
  };
};

const getPhotosByPhotographerId = async (
  photographerId: string,
  query: IPhotoQuery,
) => {
  const { page = "1", limit = "100", status, locationId } = query;
  const pageNumber = Number(page);
  const limitNumber = Number(limit);
  const skip = (pageNumber - 1) * limitNumber;

  const where: Prisma.PhotoWhereInput = {
    photographerId,
  };

  if (status) {
    where.status = status;
  }

  if (locationId) {
    where.locationId = locationId;
  }

  const [photos, total] = await Promise.all([
    prisma.photo.findMany({
      where,
      include: {
        location: {
          select: {
            id: true,
            name: true,
            state: true,
            region: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limitNumber,
    }),
    prisma.photo.count({ where }),
  ]);

  return {
    meta: {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber),
    },
    data: photos,
  };
};

const getAllPhotos = async (query: IPhotoQuery) => {
  const { page = "1", limit = "100", status, locationId } = query;
  const pageNumber = Number(page);
  const limitNumber = Number(limit);
  const skip = (pageNumber - 1) * limitNumber;

  const where: Prisma.PhotoWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (locationId) {
    where.locationId = locationId;
  }

  const [photos, total] = await Promise.all([
    prisma.photo.findMany({
      where,
      include: {
        location: {
          select: {
            id: true,
            name: true,
            state: true,
            region: true,
          },
        },
        photographer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limitNumber,
    }),
    prisma.photo.count({ where }),
  ]);

  return {
    meta: {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber),
    },
    data: photos,
  };
};

const updatePhotoStatus = async (photoId: string, status: PhotoStatus) => {
  const result = await prisma.photo.update({
    where: { id: photoId },
    data: { status },
  });
  return result;
};

const bulkUpdatePhotoStatus = async (
  photoIds: string[],
  status: PhotoStatus,
) => {
  const result = await prisma.photo.updateMany({
    where: {
      id: { in: photoIds },
    },
    data: { status },
  });
  return result;
};

const getPhotoById = async (photoId: string) => {
  const result = await prisma.photo.findUnique({
    where: { id: photoId },
    include: {
      location: true,
      photographer: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
  return result;
};

export const PhotoService = {
  bulkCreatePhotos,
  getMyPhotos,
  getPhotosByPhotographerId,
  getAllPhotos,
  getPhotoById,
  updatePhotoStatus,
  bulkUpdatePhotoStatus,
};
