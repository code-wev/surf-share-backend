import type { RequestHandler } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { SubscriptionService } from "./subscription.service";
import AppError from "../../errors/AppError";

const getAllSubscriptions: RequestHandler = catchAsync(async (req, res) => {
  const result = await SubscriptionService.getAllSubscriptions();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Subscription configurations retrieved successfully.",
    data: result,
  });
});

const updateSubscription: RequestHandler = catchAsync(async (req, res) => {
  const rawTier = req.params.tier;
  const tier = Array.isArray(rawTier) ? rawTier[0] : rawTier;
  
  if (!tier) {
    throw new AppError(400, "Missing tier parameter");
  }

  const result = await SubscriptionService.updateSubscription(tier as string, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `${tier} subscription configuration updated successfully.`,
    data: result,
  });
});

export const SubscriptionController = {
  getAllSubscriptions,
  updateSubscription,
};
