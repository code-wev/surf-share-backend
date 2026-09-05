import type { RequestHandler } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { PayoutService } from "./payout.service";
import AppError from "../../errors/AppError";

const getAllPayouts: RequestHandler = catchAsync(async (req, res) => {
  const { status, search } = req.query;
  const result = await PayoutService.getAllPayouts({
    status: status as string,
    search: search as string,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payouts retrieved successfully.",
    data: result,
  });
});

const getPendingPayouts: RequestHandler = catchAsync(async (req, res) => {
  const result = await PayoutService.getPendingPayouts();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Pending payouts retrieved successfully.",
    data: result,
  });
});

const markAsPaid: RequestHandler = catchAsync(async (req, res) => {
  const { itemIds } = req.body;

  if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
    throw new AppError(400, "Please provide an array of item IDs to mark as paid.");
  }

  const result = await PayoutService.markAsPaid(itemIds);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `${result.count} items marked as paid.`,
    data: result,
  });
});

export const PayoutController = {
  getAllPayouts,
  getPendingPayouts,
  markAsPaid,
};
