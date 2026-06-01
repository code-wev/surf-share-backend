import type { RequestHandler } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { PhotoService } from "./photo.service";
import AppError from "../../errors/AppError";
import exifr from "exifr";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { PhotoStatus } from "@prisma/client";
import { IPhotoQuery } from "./photo.interface";

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

const uploadPhotos: RequestHandler = catchAsync(async (req, res) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    throw new AppError(400, "No photos uploaded.");
  }

  const { locations, prices, capturedAts, lastModifiedDates, titles } = req.body;

  const locationsArray = Array.isArray(locations) ? locations : [locations];
  const pricesArray = Array.isArray(prices) ? prices : [prices];
  const titlesArray = titles ? (Array.isArray(titles) ? titles : [titles]) : [];
  const capturedAtsArray = capturedAts
    ? Array.isArray(capturedAts)
      ? capturedAts
      : [capturedAts]
    : [];
  const lastModifiedDatesArray = lastModifiedDates
    ? Array.isArray(lastModifiedDates)
      ? lastModifiedDates
      : [lastModifiedDates]
    : [];

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

  const allowedPrices = [0, 2.99, 4.99, 9.99, 14.99, 19.99, 29.99, 39.99, 49.99];

  const uploadPromises = files.map(async (file, index) => {
    let capturedAt: Date | undefined;
    let timeKey: "FIRST_LIGHT" | "MORNING" | "LUNCH" | "AFTERNOON" | "UNKNOWN" =
      "UNKNOWN";
    let width: number | undefined;
    let height: number | undefined;
    let format: string | undefined;
    const fileSize = file.size; // from multer memory storage
    const priceValue = Number(pricesArray[index]);

    if (!allowedPrices.includes(priceValue)) {
      throw new AppError(400, `Invalid price ${priceValue}. Allowed values are: ${allowedPrices.join(", ")}`);
    }

    console.log(`\n--- Processing File ${index + 1} ---`);
    console.log(`File Name: ${file.originalname}, Size: ${fileSize} bytes`);

    const explicitCapturedAt = capturedAtsArray[index];

    if (explicitCapturedAt) {
      const parsedCapturedAt = new Date(explicitCapturedAt);
      if (!isNaN(parsedCapturedAt.getTime())) {
        capturedAt = parsedCapturedAt;
        timeKey = getTimeOfDay(capturedAt);
      }
    }

    try {
      // ✅ Sharp for dimensions only — no re-encoding
      const sharpMeta = await sharp(file.buffer).metadata();
      width = sharpMeta.width;
      height = sharpMeta.height;
      format = sharpMeta.format;

      if (!capturedAt) {
        try {
          // ✅ Parse EXIF from original buffer — exifr handles WebP/JPEG/HEIC natively
          const parsedExif = await exifr.parse(file.buffer, {
            pick: ["DateTimeOriginal", "CreateDate", "ModifyDate"],
          });

          if (parsedExif?.DateTimeOriginal) {
            capturedAt = new Date(parsedExif.DateTimeOriginal);
          } else if (parsedExif?.CreateDate) {
            capturedAt = new Date(parsedExif.CreateDate);
          } else if (parsedExif?.ModifyDate) {
            capturedAt = new Date(parsedExif.ModifyDate);
          }

          if (capturedAt) timeKey = getTimeOfDay(capturedAt);
        } catch (exifError) {
          console.log("exifr parsing failed:", exifError);
        }
      }
    } catch (e) {
      console.error("Failed to extract metadata:", e);
    }

    // Fallback to lastModifiedDate from frontend if EXIF is missing
    if (!capturedAt && lastModifiedDatesArray[index]) {
      console.log("Falling back to frontend lastModifiedDate...");
      const parsedDate = new Date(Number(lastModifiedDatesArray[index]));
      if (!isNaN(parsedDate.getTime())) {
        capturedAt = parsedDate;
        timeKey = getTimeOfDay(capturedAt);
        console.log(
          `Fallback Date: ${capturedAt.toISOString()} -> TimeKey: ${timeKey}`,
        );
      }
    } else if (!capturedAt) {
      console.log("No EXIF and no fallback date available.");
    }

    console.log("Saving image to disk...");
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = file.originalname.split(".").pop() || "jpg";
    const fileName = `${uniqueSuffix}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "photos");
    const filePath = path.join(uploadDir, fileName);

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Save buffer directly to disk
    fs.writeFileSync(filePath, file.buffer);

    const imageUrl = `/uploads/photos/${fileName}`;

    return {
      title: titlesArray[index] || null,
      imageUrl,
      locationId: locationsArray[index],
      price: Number(pricesArray[index]),
      timeKey,
      capturedAt,
      width,
      height,
      format,
      fileSize,
    };
  });

  const items = await Promise.all(uploadPromises);
  const result = await PhotoService.bulkCreatePhotos(photographerId, items);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: `${result.count} photos uploaded successfully.`,
    data: result,
  });
});

const getAllPhotos: RequestHandler = catchAsync(async (req, res) => {
  const result = await PhotoService.getAllPhotos(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Photos retrieved successfully.",
    meta: result.meta,
    data: result.data,
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

const updatePhotoStatus: RequestHandler = catchAsync(async (req, res) => {
  const raw = req.params.photoId;
  const photoId = Array.isArray(raw) ? raw[0] : raw;
  const { status } = req.body;

  if (!photoId || !status) {
    throw new AppError(400, "Missing photoId or status.");
  }

  const result = await PhotoService.updatePhotoStatus(
    photoId as string,
    status as PhotoStatus,
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

const updatePhoto: RequestHandler = catchAsync(async (req, res) => {
  const raw = req.params.photoId;
  const photoId = Array.isArray(raw) ? raw[0] : raw;
  const user = { id: req.user!.userId, role: req.user!.role };

  const result = await PhotoService.updatePhoto(
    photoId as string,
    user,
    req.body,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Photo updated successfully.",
    data: result,
  });
});

const deletePhoto: RequestHandler = catchAsync(async (req, res) => {
  const raw = req.params.photoId;
  const photoId = Array.isArray(raw) ? raw[0] : raw;
  const user = { id: req.user!.userId, role: req.user!.role };

  await PhotoService.deletePhoto(photoId as string, user);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Photo deleted successfully.",
    data: null,
  });
});

export const PhotoController = {
  uploadPhotos,
  getAllPhotos,
  getMyPhotos,
  getPhotosByPhotographerId,
  updatePhotoStatus,
  bulkUpdatePhotoStatus,
  getPhotoById,
  updatePhoto,
  deletePhoto,
};