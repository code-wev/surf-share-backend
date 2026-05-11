import type { Location, Prisma } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
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

const createLocation = async (
  payload: ILocationCreatePayload,
  imageUrl: string,
): Promise<Location> => {
  return prisma.location.create({
    data: {
      ...payload,
      previewImage: imageUrl,
    },
  });
};

const updateLocation = async (
  id: string,
  payload: ILocationUpdatePayload,
  imageUrl?: string,
): Promise<Location> => {
  const existingLocation = await prisma.location.findUnique({ where: { id } });

  if (!existingLocation) {
    throw new AppError(404, "Location not found.");
  }

  let finalImageUrl = existingLocation.previewImage;

  if (imageUrl) {
    try {
      const urlParts = existingLocation.previewImage.split("/");
      const fileName = urlParts[urlParts.length - 1];
      const publicId = `surfshare/${fileName.split(".")[0]}`;
      await cloudinary.uploader.destroy(publicId);
    } catch (e) {
      console.error("Failed to delete old image from cloudinary", e);
    }
    finalImageUrl = imageUrl;
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
    const urlParts = existingLocation.previewImage.split("/");
    const fileName = urlParts[urlParts.length - 1];
    const publicId = `surfshare/${fileName.split(".")[0]}`;
    await cloudinary.uploader.destroy(publicId);
  } catch (e) {
    console.error("Failed to delete image from cloudinary", e);
  }

  return prisma.location.delete({
    where: { id },
  });
};

export const LocationService = {
  getAllLocations,
  createLocation,
  updateLocation,
  deleteLocation,
};
