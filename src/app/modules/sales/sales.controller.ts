import { RequestHandler } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { SalesService } from "./sales.service";
import AppError from "../../errors/AppError";

const getMySales: RequestHandler = catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  const locationId = req.query.locationId as string | undefined;

  if (!userId) {
    throw new AppError(401, "User not authenticated.");
  }

  const result = await SalesService.getMySales(userId, locationId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Sales data retrieved successfully.",
    data: result,
  });
});

export const SalesController = {
  getMySales,
};
