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
    message: "PayPal Order created successfully",
    data: result,
  });
});

const captureOrder: RequestHandler = catchAsync(async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) {
    throw new AppError(400, "PayPal Order ID is required");
  }

  const result = await CheckoutService.captureOrder(orderId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order captured successfully",
    data: result,
  });
});

const paypalWebhook = async (req: Request, res: Response) => {
  console.log("\n[WEBHOOK] Entering paypalWebhook controller...");
  const headers = req.headers;
  const body = req.body; // Buffer

  try {
    const result = await CheckoutService.handleWebhook(body, headers);
    res.json(result);
  } catch (error: any) {
    console.error("[WEBHOOK ERROR] Webhook failed.", error.message);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

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

const getPurchasedPhotos: RequestHandler = catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError(401, "User not authenticated.");
  }
  const photos = await CheckoutService.getPurchasedPhotos(userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Purchased photos retrieved successfully.",
    data: photos,
  });
});

const retryPayment: RequestHandler = catchAsync(async (req, res) => {
  const userId = req.user!.userId;
  const { orderId } = req.body;

  if (!orderId) {
    throw new AppError(400, "Order ID is required");
  }

  const result = await CheckoutService.retryPayment(userId, orderId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "PayPal Order re-created successfully",
    data: result,
  });
});

export const CheckoutController = {
  createSession,
  captureOrder,
  retryPayment,
  paypalWebhook,
  getPurchasedPhotoIds,
  getPurchasedPhotos,
};
