import { PhotoStatus, Prisma } from "@prisma/client";
import prisma from "../../utils/prisma";
import type { IPhotoBulkItem, IPhotoQuery } from "./photo.interface";
import AppError from "../../errors/AppError";
import * as fs from "fs";
import * as path from "path";

function getTimeOfDay(
  date: Date,
): "FIRST_LIGHT" | "MORNING" | "LUNCH" | "AFTERNOON" | "UNKNOWN" {
  const hours = date.getHours();
  if (hours >= 4 && hours < 8) return "FIRST_LIGHT";
  if (hours >= 8 && hours < 11) return "MORNING";
  if (hours >= 11 && hours < 14) return "LUNCH";
  if (hours >= 14 && hours < 19) return "AFTERNOON";
  return "UNKNOWN";
}

const bulkCreatePhotos = async (
  photographerId: string,
  items: IPhotoBulkItem[],
) => {
  const user = await prisma.user.findUnique({
    where: { id: photographerId },
  });

  if (!user) throw new AppError(404, "User not found");

  const config = await prisma.subscriptionConfig.findUnique({
    where: { tier: user.subscriptionTier },
  });

  if (!config) throw new AppError(500, "Subscription config not found");

  // Rule 1: Max Price
  if (config.maxPrice !== null) {
    const invalidPriceItem = items.find((item) => item.price > config.maxPrice!);
    if (invalidPriceItem) {
      throw new AppError(400, `Photo price of $${invalidPriceItem.price} exceeds your tier limit of $${config.maxPrice}.`);
    }
  }

  // Rule 2: Daily Upload Limit
  if (config.dailyUploadLimit !== null) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const uploadedToday = await prisma.photo.count({
      where: {
        photographerId,
        createdAt: { gte: startOfDay },
      },
    });

    if (uploadedToday + items.length > config.dailyUploadLimit) {
      throw new AppError(
        400,
        `Daily upload limit of ${config.dailyUploadLimit} exceeded. You have already uploaded ${uploadedToday} photos today.`
      );
    }
  }

  // Rule 3: Auto Approval
  let newStatus: PhotoStatus = PhotoStatus.PENDING;
  if (!config.requiresApproval) {
    newStatus = PhotoStatus.APPROVED;
  } else {
    const approvedCount = await prisma.photo.count({
      where: {
        photographerId,
        status: PhotoStatus.APPROVED,
      },
    });
    newStatus = approvedCount >= 10 ? PhotoStatus.APPROVED : PhotoStatus.PENDING;
  }

  const photoRecords = items.map((item) => ({
    photographerId,
    title: item.title || null,
    imageUrl: item.imageUrl,
    originalUrl: item.originalUrl || null,
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
  const locationPhotoCounts = new Map<string, number>();

  for (const item of items) {
    const currentCount = locationPhotoCounts.get(item.locationId) ?? 0;
    locationPhotoCounts.set(item.locationId, currentCount + 1);
  }

  const transaction = [
    prisma.photo.createMany({
      data: photoRecords,
    }),
    ...Array.from(locationPhotoCounts.entries()).map(([locationId, count]) =>
      prisma.location.update({
        where: { id: locationId },
        data: {
          photosAvailable: {
            increment: count,
          },
        },
      }),
    ),
  ];

  const [result] = (await prisma.$transaction(transaction)) as [
    Prisma.BatchPayload,
    ...unknown[],
  ];

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
  const {
    tab,
    locationId,
    timeKey,
    sort,
    status,
    page = 1,
    limit = 16,
  } = query;

  const filter: Prisma.PhotoWhereInput = {};

  if (status && typeof status === "string") {
    filter.status = status as PhotoStatus;
  } else {
    filter.status = PhotoStatus.APPROVED; // default for public gallery
  }

  if (locationId && locationId !== "all" && typeof locationId === "string") {
    if (locationId.startsWith("state:")) {
      filter.location = { state: locationId.replace("state:", "") };
    } else if (locationId.startsWith("region:")) {
      filter.location = { region: locationId.replace("region:", "") };
    } else {
      filter.locationId = locationId;
    }
  }

  if (timeKey && timeKey !== "all" && typeof timeKey === "string") {
    // Map new filter keys to both old and new DB values for compatibility
    const timeKeyMapping: Record<string, string[]> = {
      "first_light": ["5_8", "FIRST_LIGHT"],
      "FIRST_LIGHT": ["5_8", "FIRST_LIGHT"],
      "morning": ["8_11", "MORNING"],
      "MORNING": ["8_11", "MORNING"],
      "lunch": ["11_14", "LUNCH"],
      "LUNCH": ["11_14", "LUNCH"],
      "afternoon": ["14_17", "AFTERNOON"],
      "AFTERNOON": ["14_17", "AFTERNOON"],
      // Legacy UI mapping
      "5_8": ["5_8", "FIRST_LIGHT"],
      "8_11": ["8_11", "MORNING"],
      "11_14": ["11_14", "LUNCH"],
      "14_17": ["14_17", "AFTERNOON"],
      "17_20": ["17_20"],
      "20_23": ["20_23"],
      "23_5": ["23_5"],
    };
    
    const keysToMatch = timeKeyMapping[timeKey] || [timeKey];
    console.log("Filtering by timeKey:", keysToMatch);
    filter.timeKey = { in: keysToMatch };
  }

  if (tab && tab !== "all" && typeof tab === "string") {
    const now = new Date();
    if (tab === "today") {
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      filter.createdAt = { gte: startOfDay };
    } else if (tab === "yesterday") {
      const startOfYesterday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 1,
      );
      const endOfYesterday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
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
        },
      },
      location: true,
    },
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

const getPhotosForModerator = async (query: IPhotoQuery) => {
  const { page = "1", limit = "100", status, locationId, photographerId } = query;
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
  
  if (photographerId) {
    where.photographerId = photographerId;
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

const updatePhoto = async (
  photoId: string,
  user: { id: string; role: string },
  payload: Partial<{
    title: string;
    price: number;
    locationId: string;
    capturedAt: string;
    timeKey: string;
  }>,
) => {
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
  });

  if (!photo) throw new AppError(404, "Photo not found.");
  
  const isOwner = photo.photographerId === user.id;
  const isAuthorized = user.role === "ADMIN" || user.role === "MODERATOR";

  if (!isOwner && !isAuthorized) {
    throw new AppError(403, "You do not have permission to edit this photo.");
  }

  if (payload.price !== undefined) {
    const allowedPrices = [0, 2.99, 4.99, 9.99, 14.99, 19.99, 29.99, 39.99, 49.99];
    if (!allowedPrices.includes(payload.price)) {
      throw new AppError(400, `Invalid price ${payload.price}. Allowed values are: ${allowedPrices.join(", ")}`);
    }
  }

  const updateData: any = { ...payload };

  // Re-calculate timeKey if capturedAt is provided but timeKey is not
  if (payload.capturedAt && !payload.timeKey) {
    const date = new Date(payload.capturedAt);
    if (!isNaN(date.getTime())) {
      updateData.timeKey = getTimeOfDay(date);
    }
  }

  // Handle location change
  if (payload.locationId && payload.locationId !== photo.locationId) {
    return await prisma.$transaction(async (tx) => {
      // Decrement old location count
      await tx.location.update({
        where: { id: photo.locationId },
        data: { photosAvailable: { decrement: 1 } },
      });

      // Increment new location count
      await tx.location.update({
        where: { id: payload.locationId },
        data: { photosAvailable: { increment: 1 } },
      });

      // Update photo
      return await tx.photo.update({
        where: { id: photoId },
        data: updateData,
      });
    });
  }

  const result = await prisma.photo.update({
    where: { id: photoId },
    data: updateData,
  });
  return result;
};

const deletePhoto = async (photoId: string, user: { id: string; role: string }) => {
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
  });

  if (!photo) throw new AppError(404, "Photo not found.");
  
  const isOwner = photo.photographerId === user.id;
  const isAuthorized = user.role === "ADMIN" || user.role === "MODERATOR";

  if (!isOwner && !isAuthorized) {
    throw new AppError(403, "You do not have permission to delete this photo.");
  }

  const result = await prisma.$transaction(async (tx) => {
    // Decrement location count
    await tx.location.update({
      where: { id: photo.locationId },
      data: { photosAvailable: { decrement: 1 } },
    });

    // Delete photo
    return await tx.photo.delete({
      where: { id: photoId },
    });
  });

  return result;
};

const getSecureDownloadPath = async (photoId: string, user: { id: string; role: string }) => {
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
  });

  if (!photo) {
    throw new AppError(404, "Photo not found.");
  }

  let targetUrl = photo.originalUrl;
  
  // Robust Fallback: If originalUrl is missing but we have an imageUrl, reconstruct it.
  if (!targetUrl && photo.imageUrl) {
    // imageUrl format: /uploads/photos/123456789-preview.jpg
    const match = photo.imageUrl.match(/\/uploads\/photos\/(.+)-preview\.jpg$/);
    if (match && match[1]) {
      const prefix = match[1];
      const originalsDir = path.join(process.cwd(), "public", "originals");
      
      // Since we don't know the exact extension (.png, .jpg), we search the directory
      if (fs.existsSync(originalsDir)) {
        const files = fs.readdirSync(originalsDir);
        const originalFile = files.find((f: string) => f.startsWith(`${prefix}-original.`));
        if (originalFile) {
          targetUrl = path.join(originalsDir, originalFile);
        }
      }
    }
    
    // Ultimate fallback for very old photos (before the dual-image vault existed)
    if (!targetUrl) {
      targetUrl = path.join(process.cwd(), "public", photo.imageUrl);
    }
  }

  // 1. Is the user the photographer?
  if (photo.photographerId === user.id) {
    return targetUrl;
  }

  // 2. Is the user an Admin or Moderator?
  if (user.role === "ADMIN" || user.role === "MODERATOR") {
    return targetUrl;
  }

  // 3. Did the user purchase the photo?
  const hasPurchased = await prisma.orderItem.findFirst({
    where: {
      photoId,
      order: {
        userId: user.id,
        status: "PAID"
      }
    }
  });

  if (hasPurchased) {
    return targetUrl;
  }

  throw new AppError(403, "You must purchase this photo to download the high-resolution original.");
};

export const PhotoService = {
  bulkCreatePhotos,
  getAllPhotos,
  getMyPhotos,
  getPhotosForModerator,
  updatePhotoStatus,
  bulkUpdatePhotoStatus,
  getPhotoById,
  getPhotosByPhotographerId,
  updatePhoto,
  deletePhoto,
  getSecureDownloadPath,
};