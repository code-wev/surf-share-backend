import { RequestHandler } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { OrderService } from "./order.service";
import AppError from "../../errors/AppError";

const getMyOrders: RequestHandler = catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError(401, "User not authenticated.");
  }
  const orders = await OrderService.getOrdersByUserId(userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Orders retrieved successfully.",
    data: orders,
  });
});

export const OrderController = {
  getMyOrders,
};
