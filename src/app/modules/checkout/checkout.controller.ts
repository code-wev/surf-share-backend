import type { Request, Response, RequestHandler } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { CheckoutService } from "./checkout.service";

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

export const CheckoutController = {
  createSession,
  stripeWebhook,
};
