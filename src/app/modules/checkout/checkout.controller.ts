import type { Request, Response, RequestHandler } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { CheckoutService } from "./checkout.service";
import AppError from "../../errors/AppError";

const createSession: RequestHandler = catchAsync(async (req, res) => {
  const userId = req.user!.userId;
  const { photoIds } = req.body;

  const result = await CheckoutService.createSession(userId, photoIds);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Checkout session created successfully",
    data: result,
  });
});

const stripeWebhook = async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"] as string;
  const body = req.body; // This must be the raw buffer

  try {
    const result = await CheckoutService.handleWebhook(body, signature);
    res.json(result);
  } catch (error: any) {
    console.error("Webhook signature verification failed.", error.message);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

const verifySession: RequestHandler = catchAsync(async (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId || typeof sessionId !== "string") {
    throw new AppError(400, "Session ID is required");
  }

  const result = await CheckoutService.verifySession(sessionId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Session verified",
    data: result,
  });
});

const getPurchasedPhotoIds: RequestHandler = catchAsync(async (req, res) => {
  const userId = req.user!.userId;
  const result = await CheckoutService.getPurchasedPhotoIds(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Purchased photo IDs retrieved successfully",
    data: result,
  });
});

export const CheckoutController = {
  createSession,
  stripeWebhook,
  verifySession,
  getPurchasedPhotoIds,
};
