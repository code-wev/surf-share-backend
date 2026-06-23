import type { Location, Prisma } from "@prisma/client";
import fs from "fs";
import path from "path";
import AppError from "../../errors/AppError";
import prisma from "../../utils/prisma";
import type {
  ILocationCreatePayload,
  ILocationUpdatePayload,
} from "./location.interface";

type LocationWithPhotoCount = Location & {
  _count: {
    photos: number;
  };
};

const getAllLocations = async (query: Record<string, unknown>) => {
  const { search, page = 1, limit = 10, cursor } = query;

  const filter: Prisma.LocationWhereInput = {};

  if (search && typeof search === "string") {
    filter.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { region: { contains: search, mode: "insensitive" } },
      { state: { contains: search, mode: "insensitive" } },
    ];
  }

  const limitNumber = Number(limit) || 10;

  const queryOptions: Prisma.LocationFindManyArgs = {
    where: filter,
    orderBy: { createdAt: "desc" },
    take: limitNumber,
    include: {
      _count: {
        select: {
          photos: true,
        },
      },
    },
  };

  let pageNumber = 1;

  if (cursor && typeof cursor === "string") {
    queryOptions.cursor = { id: cursor };
    queryOptions.skip = 1;
  } else if (page) {
    pageNumber = Number(page) || 1;
    queryOptions.skip = (pageNumber - 1) * limitNumber;
  }

  const [locations, total] = await Promise.all([
    prisma.location.findMany(queryOptions) as Promise<LocationWithPhotoCount[]>,
    prisma.location.count({ where: filter }),
  ]);

  const nextCursor =
    locations.length === limitNumber
      ? locations[locations.length - 1].id
      : null;

  const data = locations.map(({ _count, ...location }) => ({
    ...location,
    photosAvailable: _count.photos,
  }));

  return {
    meta: {
      page: cursor ? undefined : pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber),
      nextCursor,
    },
    data,
  };
};

const getHierarchy = async () => {
  const locations = await prisma.location.findMany({
    select: {
      id: true,
      name: true,
      region: true,
      state: true,
    },
  });

  const hierarchy: any = {};

  locations.forEach((loc) => {
    if (!hierarchy[loc.state]) {
      hierarchy[loc.state] = {};
    }
    if (!hierarchy[loc.state][loc.region]) {
      hierarchy[loc.state][loc.region] = [];
    }
    hierarchy[loc.state][loc.region].push({ id: loc.id, name: loc.name });
  });

  return hierarchy;
};

const createLocation = async (
  payload: ILocationCreatePayload,
  fileName: string,
): Promise<Location> => {
  return prisma.location.create({
    data: {
      ...payload,
      previewImage: `/uploads/location/${fileName}`,
    },
  });
};

const updateLocation = async (
  id: string,
  payload: ILocationUpdatePayload,
  fileName?: string,
): Promise<Location> => {
  const existingLocation = await prisma.location.findUnique({ where: { id } });

  if (!existingLocation) {
    throw new AppError(404, "Location not found.");
  }

  let finalImageUrl = existingLocation.previewImage;

  if (fileName) {
    try {
      const oldFileName = existingLocation.previewImage.split("/").pop();
      if (oldFileName) {
        const oldPath = path.join(process.cwd(), "public", "uploads", "location", oldFileName);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    } catch (e) {
      console.error("Failed to delete old image from disk", e);
    }
    finalImageUrl = `/uploads/location/${fileName}`;
  }

  return prisma.location.update({
    where: { id },
    data: {
      ...payload,
      previewImage: finalImageUrl,
    },
  });
};

const deleteLocation = async (id: string): Promise<Location> => {
  const existingLocation = await prisma.location.findUnique({ where: { id } });

  if (!existingLocation) {
    throw new AppError(404, "Location not found.");
  }

  try {
    const oldFileName = existingLocation.previewImage.split("/").pop();
    if (oldFileName) {
      const oldPath = path.join(process.cwd(), "public", "uploads", "location", oldFileName);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
  } catch (e) {
    console.error("Failed to delete image from disk", e);
  }

  return prisma.location.delete({
    where: { id },
  });
};

const getMapData = async () => {
  const locations = await prisma.location.findMany({
    include: {
      photos: {
        where: { status: "APPROVED" },
        select: {
          capturedAt: true,
          timeKey: true,
        },
      },
    },
  });

  const mapData = locations
    .filter((loc) => loc.photos.length > 0)
    .map((loc) => {
      let minDate: Date | null = null;
      let maxDate: Date | null = null;
      const timeKeys = new Set<string>();

      loc.photos.forEach((p) => {
        if (p.capturedAt) {
          if (!minDate || p.capturedAt < minDate) minDate = p.capturedAt;
          if (!maxDate || p.capturedAt > maxDate) maxDate = p.capturedAt;
        }
        if (p.timeKey && p.timeKey !== "UNKNOWN") {
          timeKeys.add(p.timeKey.toLowerCase());
        }
      });

      return {
        id: loc.id,
        name: loc.name,
        state: loc.state,
        region: loc.region,
        country: "Australia",
        coordinates: [loc.latitude, loc.longitude],
        availableFrom: minDate ? (minDate as Date).toISOString().split("T")[0] : null,
        availableTo: maxDate ? (maxDate as Date).toISOString().split("T")[0] : null,
        timeWindows: Array.from(timeKeys),
        imageSrc: loc.previewImage,
        photoCount: loc.photos.length,
      };
    });

  return mapData;
};

const getFeaturedLocations = async () => {
  const locations = await prisma.location.findMany({
    where: { isFeatured: true },
    take: 4,
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          photos: {
            where: {
              status: "APPROVED",
            },
          },
        },
      },
    },
  });

  return locations.map(({ _count, ...location }) => ({
    ...location,
    photosAvailable: _count.photos,
  }));
};

const toggleFeatured = async (id: string): Promise<Location> => {
  const location = await prisma.location.findUnique({ where: { id } });

  if (!location) {
    throw new AppError(404, "Location not found.");
  }

  // If we are trying to feature it, make sure we don't exceed 4
  if (!location.isFeatured) {
    const featuredCount = await prisma.location.count({
      where: { isFeatured: true },
    });

    if (featuredCount >= 4) {
      throw new AppError(400, "You can only have 4 featured locations. Please un-feature one first.");
    }
  }

  return prisma.location.update({
    where: { id },
    data: { isFeatured: !location.isFeatured },
  });
};

export const LocationService = {
  getAllLocations,
  getHierarchy,
  createLocation,
  updateLocation,
  deleteLocation,
  getMapData,
  getFeaturedLocations,
  toggleFeatured,
};
