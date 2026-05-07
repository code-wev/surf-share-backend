import type { RequestHandler } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { PhotoService } from "./photo.service";
import AppError from "../../errors/AppError";

const uploadPhotos: RequestHandler = catchAsync(async (req, res) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    throw new AppError(400, "No photos uploaded.");
  }

  const { locations, prices } = req.body;

  // Normalize to arrays (if only 1 file is sent, FormData might send a single string instead of array)
  const locationsArray = Array.isArray(locations) ? locations : [locations];
  const pricesArray = Array.isArray(prices) ? prices : [prices];

  if (files.length !== locationsArray.length || files.length !== pricesArray.length) {
    throw new AppError(400, "Mismatched data lengths between photos, locations, and prices.");
  }

  const photographerId = req.user!.userId; 

  const items = files.map((file, index) => ({
    imageUrl: file.path, // Cloudinary URL automatically returned by our storage engine
    locationId: locationsArray[index],
    price: Number(pricesArray[index]),
  }));

  const result = await PhotoService.bulkCreatePhotos(photographerId, items);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: `${result.count} photos uploaded successfully.`,
    data: result,
  });
});

export const PhotoController = {
  uploadPhotos,
};
