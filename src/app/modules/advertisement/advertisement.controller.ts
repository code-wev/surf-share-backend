import type { RequestHandler } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { AdvertisementService } from "./advertisement.service";
import AppError from "../../errors/AppError";

const getAdvertisement: RequestHandler = catchAsync(async (req, res) => {
  const result = await AdvertisementService.getAdvertisement();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Advertisement retrieved successfully.",
    data: result,
  });
});

const upsertAdvertisement: RequestHandler = catchAsync(async (req, res) => {
  const { advertisementURL } = req.body;
  const file = req.file;

  if (!file) {
    throw new AppError(400, "Advertisement image is required.");
  }

  const imageUrl = file.path;

  const result = await AdvertisementService.upsertAdvertisement(
    imageUrl,
    advertisementURL,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Advertisement published successfully.",
    data: result,
  });
});

const deleteAdvertisement: RequestHandler = catchAsync(async (req, res) => {
  const result = await AdvertisementService.deleteAdvertisement();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Advertisement deleted successfully.",
    data: result,
  });
});

export const AdvertisementController = {
  getAdvertisement,
  upsertAdvertisement,
  deleteAdvertisement,
};
