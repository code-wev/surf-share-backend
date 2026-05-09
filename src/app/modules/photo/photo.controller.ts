import type { RequestHandler } from "express";
import { PhotoStatus } from "@prisma/client";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { PhotoService } from "./photo.service";
import AppError from "../../errors/AppError";
import type { IPhotoQuery } from "./photo.interface";
import { cloudinaryInstance } from "../../utils/upload";
import url from "url";
import path from "path";

const uploadPhotos: RequestHandler = catchAsync(async (req, res) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    throw new AppError(400, "No photos uploaded.");
  }

  const { locations, prices } = req.body;

  // Normalize to arrays (if only 1 file is sent, FormData might send a single string instead of array)
  const locationsArray = Array.isArray(locations) ? locations : [locations];
  const pricesArray = Array.isArray(prices) ? prices : [prices];

  if (
    files.length !== locationsArray.length ||
    files.length !== pricesArray.length
  ) {
    throw new AppError(
      400,
      "Mismatched data lengths between photos, locations, and prices.",
    );
  }

  const photographerId = req.user!.userId;

  const items = files.map((file, index) => {
    const f = file as any;
    const mimetype: string | undefined = f.mimetype;
    const format = f.format ?? (mimetype ? mimetype.split("/")[1] : undefined);

    return {
      imageUrl: f.path, // Cloudinary URL automatically returned by our storage engine
      locationId: locationsArray[index],
      price: Number(pricesArray[index]),
      width: f.width ?? undefined,
      height: f.height ?? undefined,
      format: format ?? undefined,
      fileSize: f.size ?? undefined,
    };
  });

  // Immediately attempt to fetch Cloudinary resource metadata for each uploaded image
  for (const item of items) {
    try {
      const imageUrl: string = item.imageUrl;
      const parsed = url.parse(imageUrl);
      const parts = (parsed.pathname || "").split("/");
      const uploadIndex = parts.findIndex((p) => p === "upload");
      if (uploadIndex !== -1) {
        const afterUpload = parts.slice(uploadIndex + 1);
        if (afterUpload.length > 0 && /^v\d+$/.test(afterUpload[0])) {
          afterUpload.shift();
        }
        const fileName = afterUpload.join("/");
        const ext = path.extname(fileName);
        const publicId = fileName.replace(ext, "");

        if (publicId) {
          const resource = await cloudinaryInstance.api.resource(publicId, {
            resource_type: "image",
          });
          if (resource) {
            item.width = resource.width ?? item.width;
            item.height = resource.height ?? item.height;
            item.format = resource.format ?? item.format;
            item.fileSize = resource.bytes ?? item.fileSize;
          }
        }
      }
    } catch (err) {
      // ignore metadata fetch failures
    }
  }

  const result = await PhotoService.bulkCreatePhotos(photographerId, items);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: `${result.count} photos uploaded successfully.`,
    data: result,
  });
});

const getMyPhotos: RequestHandler = catchAsync(async (req, res) => {
  const photographerId = req.user!.userId;
  const result = await PhotoService.getMyPhotos(
    photographerId,
    req.query as unknown as IPhotoQuery,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Photos retrieved successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const getPhotosByPhotographerId: RequestHandler = catchAsync(
  async (req, res) => {
    const rawPhotographerId = req.params.photographerId;
    const photographerId = Array.isArray(rawPhotographerId)
      ? rawPhotographerId[0]
      : rawPhotographerId;

    if (!photographerId) {
      throw new AppError(400, "Missing photographerId parameter.");
    }

    const result = await PhotoService.getPhotosByPhotographerId(
      photographerId,
      req.query as unknown as IPhotoQuery,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Photos retrieved successfully.",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getAllPhotos: RequestHandler = catchAsync(async (req, res) => {
  const result = await PhotoService.getAllPhotos(
    req.query as unknown as IPhotoQuery,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Photos retrieved successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const getPhotoById: RequestHandler = catchAsync(async (req, res) => {
  const raw = req.params.photoId;
  const photoId = Array.isArray(raw) ? raw[0] : raw;

  const result = await PhotoService.getPhotoById(photoId as string);

  if (!result) {
    throw new AppError(404, "Photo not found.");
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Photo retrieved successfully.",
    data: result,
  });
});

const updatePhotoStatus: RequestHandler = catchAsync(async (req, res) => {
  const raw = req.params.photoId;
  const photoId = Array.isArray(raw) ? raw[0] : raw;
  const { status } = req.body;

  if (!photoId || !status) {
    throw new AppError(400, "Missing photoId or status.");
  }

  const result = await PhotoService.updatePhotoStatus(
    photoId as string,
    status as any,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Photo ${status.toLowerCase()} successfully.`,
    data: result,
  });
});

const bulkUpdatePhotoStatus: RequestHandler = catchAsync(async (req, res) => {
  const { photoIds, status } = req.body;

  if (
    !photoIds ||
    !Array.isArray(photoIds) ||
    photoIds.length === 0 ||
    !status
  ) {
    throw new AppError(400, "Missing photoIds or status.");
  }

  const result = await PhotoService.bulkUpdatePhotoStatus(photoIds, status);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `${result.count} photos ${status.toLowerCase()} successfully.`,
    data: result,
  });
});

export const PhotoController = {
  uploadPhotos,
  getMyPhotos,
  getPhotosByPhotographerId,
  getAllPhotos,
  getPhotoById,
  updatePhotoStatus,
  bulkUpdatePhotoStatus,
};
