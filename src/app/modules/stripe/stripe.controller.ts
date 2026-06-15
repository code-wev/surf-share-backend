import type { RequestHandler } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { StripeConnectService } from "./stripe.service";

const generateConnectLink: RequestHandler = catchAsync(async (req, res) => {
  const userId = req.user!.userId;
  const url = await StripeConnectService.generateConnectLink(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Stripe Connect link generated successfully.",
    data: { url },
  });
});

const checkOnboardingStatus: RequestHandler = catchAsync(async (req, res) => {
  const userId = req.user!.userId;
  const result = await StripeConnectService.checkOnboardingStatus(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Stripe Connect status checked.",
    data: result,
  });
});

const generateDashboardLink: RequestHandler = catchAsync(async (req, res) => {
  const userId = req.user!.userId;
  const url = await StripeConnectService.generateDashboardLink(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Stripe Dashboard link generated successfully.",
    data: { url },
  });
});

export const StripeConnectController = {
  generateConnectLink,
  checkOnboardingStatus,
  generateDashboardLink,
};
