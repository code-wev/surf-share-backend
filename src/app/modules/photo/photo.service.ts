import { PhotoStatus, Prisma } from "@prisma/client";
import prisma from "../../utils/prisma";
import type { IPhotoBulkItem, IPhotoQuery } from "./photo.interface";

const bulkCreatePhotos = async (photographerId: string, items: IPhotoBulkItem[]) => {
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
    timeKey: item.timeKey || "UNKNOWN",
    capturedAt: item.capturedAt || null,
    width: item.width || null,
    height: item.height || null,
    format: item.format || null,
    fileSize: item.fileSize || null,
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

const getAllPhotos = async (query: Record<string, unknown>) => {
  const { tab, locationId, timeKey, sort, status, page = 1, limit = 16 } = query;

  const filter: Prisma.PhotoWhereInput = {};

  if (status && typeof status === "string") {
    filter.status = status as PhotoStatus;
  } else {
    filter.status = PhotoStatus.APPROVED; // default for public gallery
  }

  if (locationId && locationId !== "all" && typeof locationId === "string") {
    filter.locationId = locationId;
  }

  if (timeKey && timeKey !== "all" && typeof timeKey === "string") {
    filter.timeKey = timeKey.toUpperCase();
  }

  if (tab && tab !== "all" && typeof tab === "string") {
    const now = new Date();
    if (tab === "today") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filter.createdAt = { gte: startOfDay };
    } else if (tab === "yesterday") {
      const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filter.createdAt = { gte: startOfYesterday, lt: endOfYesterday };
    } else if (tab === "last7days") {
      const last7Days = new Date(now.setDate(now.getDate() - 7));
      filter.createdAt = { gte: last7Days };
    } else if (tab === "last14days") {
      const last14Days = new Date(now.setDate(now.getDate() - 14));
      filter.createdAt = { gte: last14Days };
    }
  }

  const limitNumber = Number(limit) || 16;
  const pageNumber = Number(page) || 1;

  const queryOptions: Prisma.PhotoFindManyArgs = {
    where: filter,
    take: limitNumber,
    skip: (pageNumber - 1) * limitNumber,
    include: {
      photographer: {
        select: {
          name: true,
          socialAccount: true,
        }
      },
      location: true,
    }
  };

  if (sort === "priceLow") {
    queryOptions.orderBy = { price: "asc" };
  } else if (sort === "priceHigh") {
    queryOptions.orderBy = { price: "desc" };
  } else {
    queryOptions.orderBy = { createdAt: "desc" }; // default latest
  }

  const [photos, total] = await Promise.all([
    prisma.photo.findMany(queryOptions),
    prisma.photo.count({ where: filter }),
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
  getAllPhotos,
  getMyPhotos,
  updatePhotoStatus,
  bulkUpdatePhotoStatus,
  getPhotoById,
  getPhotosByPhotographerId,
};
