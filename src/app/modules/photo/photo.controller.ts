import type { RequestHandler } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { PhotoService } from "./photo.service";
import AppError from "../../errors/AppError";
import exifr from "exifr";
import sharp from "sharp";
import { cloudinaryInstance } from "../../utils/upload";
import { PhotoStatus } from "@prisma/client";

function getTimeOfDay(date: Date): "FIRST_LIGHT" | "MORNING" | "LUNCH" | "AFTERNOON" | "UNKNOWN" {
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

  const { locations, prices, lastModifiedDates } = req.body;

  const locationsArray = Array.isArray(locations) ? locations : [locations];
  const pricesArray = Array.isArray(prices) ? prices : [prices];
  const lastModifiedDatesArray = lastModifiedDates 
    ? (Array.isArray(lastModifiedDates) ? lastModifiedDates : [lastModifiedDates])
    : [];

  if (files.length !== locationsArray.length || files.length !== pricesArray.length) {
    throw new AppError(400, "Mismatched data lengths between photos, locations, and prices.");
  }

  const photographerId = req.user!.userId; 

  const uploadPromises = files.map(async (file, index) => {
    let capturedAt: Date | undefined;
    let timeKey: "FIRST_LIGHT" | "MORNING" | "LUNCH" | "AFTERNOON" | "UNKNOWN" = "UNKNOWN";
    let width: number | undefined;
    let height: number | undefined;
    let format: string | undefined;
    const fileSize = file.size; // from multer memory storage

    console.log(`\n--- Processing File ${index + 1} ---`);
    console.log(`File Name: ${file.originalname}, Size: ${fileSize} bytes`);

    try {
      const metadata = await sharp(file.buffer).metadata();
      width = metadata.width;
      height = metadata.height;
      format = metadata.format;
      
      console.log(`Sharp Metadata: width=${width}, height=${height}, format=${format}`);
      
      try {
        console.log("Attempting to parse EXIF with exifr...");
        const parsedExif = await exifr.parse(file.buffer);
        if (parsedExif) {
          if (parsedExif.DateTimeOriginal) {
            capturedAt = new Date(parsedExif.DateTimeOriginal);
            timeKey = getTimeOfDay(capturedAt);
            console.log(`EXIF DateTimeOriginal: ${capturedAt.toISOString()} -> TimeKey: ${timeKey}`);
          } else if (parsedExif.CreateDate) {
            capturedAt = new Date(parsedExif.CreateDate);
            timeKey = getTimeOfDay(capturedAt);
            console.log(`EXIF CreateDate: ${capturedAt.toISOString()} -> TimeKey: ${timeKey}`);
          } else if (parsedExif.ModifyDate) {
            capturedAt = new Date(parsedExif.ModifyDate);
            timeKey = getTimeOfDay(capturedAt);
            console.log(`EXIF ModifyDate: ${capturedAt.toISOString()} -> TimeKey: ${timeKey}`);
          } else {
            console.log("exifr parsed metadata, but no DateTimeOriginal, CreateDate, or ModifyDate tags found.");
          }
        } else {
          console.log("exifr returned null/undefined for metadata.");
        }
      } catch (exifError) {
        console.log("exifr parsing failed:", exifError);
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
        console.log(`Fallback Date: ${capturedAt.toISOString()} -> TimeKey: ${timeKey}`);
      }
    } else if (!capturedAt) {
       console.log("No EXIF and no fallback date available.");
    }

    console.log("Uploading to Cloudinary...");
    const cloudinaryResult = await new Promise<any>((resolve, reject) => {
      const stream = cloudinaryInstance.uploader.upload_stream(
        { folder: "surfshare" },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(file.buffer);
    });
    console.log("Cloudinary Upload Success!");

    return {
      imageUrl: cloudinaryResult.secure_url,
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

export const PhotoController = {
  uploadPhotos,
  getAllPhotos
};
