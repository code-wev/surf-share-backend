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
import { getTimeOfDay } from "../../utils/timeUtils";
import prisma from "../../utils/prisma";

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

  const userRecord = await prisma.user.findUnique({
    where: { id: photographerId },
  });
  if (!userRecord) throw new AppError(404, "User not found");

  const subscriptionConfig = await prisma.subscriptionConfig.findUnique({
    where: { tier: userRecord.subscriptionTier },
  });
  if (!subscriptionConfig) throw new AppError(500, "Subscription config not found");

  // Rule 1: Max Price check
  if (subscriptionConfig.maxPrice !== null) {
    const invalidPriceIndex = pricesArray.findIndex((p) => Number(p) > subscriptionConfig.maxPrice!);
    if (invalidPriceIndex !== -1) {
      throw new AppError(
        400,
        `Photo price of $${pricesArray[invalidPriceIndex]} exceeds your tier limit of $${subscriptionConfig.maxPrice}.`
      );
    }
  }

  // Rule 2: Daily Upload Limit
  if (subscriptionConfig.dailyUploadLimit !== null) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const uploadedToday = await prisma.photo.count({
      where: {
        photographerId,
        createdAt: { gte: startOfDay },
      },
    });

    if (uploadedToday + files.length > subscriptionConfig.dailyUploadLimit) {
      throw new AppError(
        400,
        `Daily upload limit of ${subscriptionConfig.dailyUploadLimit} exceeded. You have already uploaded ${uploadedToday} photos today.`
      );
    }
  }

  // Rule 3: Auto Approval (Trust Rule)
  let finalStatus: PhotoStatus = PhotoStatus.PENDING;
  if (!subscriptionConfig.requiresApproval) {
    finalStatus = PhotoStatus.APPROVED;
  } else {
    const approvedCount = await prisma.photo.count({
      where: {
        photographerId,
        status: PhotoStatus.APPROVED,
      },
    });
    finalStatus = approvedCount >= 10 ? PhotoStatus.APPROVED : PhotoStatus.PENDING;
  }

  const allowedPrices = [0, 2.99, 4.99, 9.99, 14.99, 19.99, 29.99, 39.99, 49.99];

  // PHASE 1: Instantly write PROCESSING records to DB
  const initialRecords = await Promise.all(
    files.map(async (file, index) => {
      const priceValue = Number(pricesArray[index]);

      if (!allowedPrices.includes(priceValue)) {
        throw new AppError(400, `Invalid price ${priceValue}. Allowed values are: ${allowedPrices.join(", ")}`);
      }

      // We just create the skeleton record first
      return prisma.photo.create({
        data: {
          photographerId,
          locationId: locationsArray[index],
          price: priceValue,
          status: PhotoStatus.PROCESSING,
          title: titlesArray[index] || null,
          imageUrl: "", // Will be filled later
          originalUrl: "", // Will be filled later
          fileSize: file.size,
        },
      });
    })
  );

  // Send instant response to client
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: `${files.length} photos uploaded. Processing in background...`,
    data: initialRecords,
  });

  // PHASE 2: Ghost Worker (Runs in background)
  processImagesInBackground(files, initialRecords, capturedAtsArray, lastModifiedDatesArray, finalStatus).catch(console.error);
});

// Ghost Worker Function
async function processImagesInBackground(
  files: Express.Multer.File[],
  initialRecords: any[],
  capturedAtsArray: string[],
  lastModifiedDatesArray: string[],
  finalStatus: PhotoStatus
) {
  console.log(`\n--- Starting Background Processing for ${files.length} images ---`);
  
  const originalsDir = path.join(process.cwd(), "public", "originals");
  const previewsDir = path.join(process.cwd(), "public", "uploads", "photos");

  if (!fs.existsSync(originalsDir)) fs.mkdirSync(originalsDir, { recursive: true });
  if (!fs.existsSync(previewsDir)) fs.mkdirSync(previewsDir, { recursive: true });

  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    const record = initialRecords[index];

    try {
      let capturedAt: Date | undefined;
      let timeKey: string = "UNKNOWN";
      let width: number | undefined;
      let height: number | undefined;
      let format: string | undefined;

      const explicitCapturedAt = capturedAtsArray[index];
      if (explicitCapturedAt) {
        const parsedCapturedAt = new Date(explicitCapturedAt);
        if (!isNaN(parsedCapturedAt.getTime())) {
          capturedAt = parsedCapturedAt;
          timeKey = getTimeOfDay(explicitCapturedAt);
        }
      }

      try {
        const sharpMeta = await sharp(file.path).metadata();
        width = sharpMeta.width;
        height = sharpMeta.height;
        format = sharpMeta.format;

        if (!capturedAt) {
          const parsedExif = await exifr.parse(file.path, {
            pick: ["DateTimeOriginal", "CreateDate", "ModifyDate"],
          });

          if (parsedExif?.DateTimeOriginal) {
            capturedAt = new Date(parsedExif.DateTimeOriginal);
            timeKey = getTimeOfDay(parsedExif.DateTimeOriginal.toString());
          } else if (parsedExif?.CreateDate) {
            capturedAt = new Date(parsedExif.CreateDate);
            timeKey = getTimeOfDay(parsedExif.CreateDate.toString());
          } else if (parsedExif?.ModifyDate) {
            capturedAt = new Date(parsedExif.ModifyDate);
            timeKey = getTimeOfDay(parsedExif.ModifyDate.toString());
          }

          // If timeKey was still UNKNOWN, fallback to Date object (though string is preferred)
          if (capturedAt && timeKey === "UNKNOWN") timeKey = getTimeOfDay(capturedAt);
        }
      } catch (e) {
        console.error("Failed to extract metadata:", e);
      }

      if (!capturedAt && lastModifiedDatesArray[index]) {
        const parsedDate = new Date(Number(lastModifiedDatesArray[index]));
        if (!isNaN(parsedDate.getTime())) {
          capturedAt = parsedDate;
          timeKey = getTimeOfDay(lastModifiedDatesArray[index]);
        }
      }

      // Move raw file from temp to Vault
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = file.originalname.split(".").pop() || "jpg";
      const originalFileName = `${uniqueSuffix}-original.${ext}`;
      const previewFileName = `${uniqueSuffix}-preview.jpg`;

      const originalPath = path.join(originalsDir, originalFileName);
      const previewPath = path.join(previewsDir, previewFileName);

      fs.copyFileSync(file.path, originalPath);

      // Compression
      const isMassiveFile = file.size > 10 * 1024 * 1024;
      const compressionQuality = isMassiveFile ? 40 : 70;

      await sharp(file.path)
        .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: compressionQuality })
        .toFile(previewPath);

      // Clean up temp file
      fs.unlinkSync(file.path);

      // Update DB from PROCESSING -> Final Status
      await prisma.photo.update({
        where: { id: record.id },
        data: {
          imageUrl: `/uploads/photos/${previewFileName}`,
          originalUrl: originalPath,
          status: finalStatus,
          timeKey,
          capturedAt,
          width,
          height,
          format,
        },
      });

      // Increment location's photosAvailable if approved
      if (finalStatus === PhotoStatus.APPROVED) {
        await prisma.location.update({
          where: { id: record.locationId },
          data: { photosAvailable: { increment: 1 } },
        });
      }

      console.log(`Processed image ${index + 1}/${files.length} completely.`);
    } catch (error) {
      console.error(`Error processing image ${index + 1}:`, error);
      // Mark as rejected or keep as processing so admins know it failed
      await prisma.photo.update({
        where: { id: record.id },
        data: { status: PhotoStatus.REJECTED },
      });
    }
  }
}

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

const getPhotosForModerator: RequestHandler = catchAsync(async (req, res) => {
  const result = await PhotoService.getPhotosForModerator(req.query as unknown as IPhotoQuery);

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

const downloadOriginalPhoto: RequestHandler = catchAsync(async (req, res) => {
  const raw = req.params.photoId;
  const photoId = Array.isArray(raw) ? raw[0] : raw;
  const user = { id: req.user!.userId, role: req.user!.role };

  const originalPath = await PhotoService.getSecureDownloadPath(photoId as string, user);

  if (!originalPath || !fs.existsSync(originalPath)) {
    throw new AppError(404, "Original file is missing or corrupted on the server.");
  }

  const fileName = path.basename(originalPath);
  
  res.download(originalPath, `SurfShare-Original-${fileName}`, (err) => {
    if (err) {
      console.error("Download stream error:", err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: "Failed to stream download." });
      }
    }
  });
});

export const PhotoController = {
  uploadPhotos,
  getAllPhotos,
  getPhotosForModerator,
  getMyPhotos,
  getPhotosByPhotographerId,
  updatePhotoStatus,
  bulkUpdatePhotoStatus,
  getPhotoById,
  updatePhoto,
  deletePhoto,
  downloadOriginalPhoto,
};
