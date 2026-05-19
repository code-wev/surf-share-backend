import { RequestHandler } from "express";
import { Role } from "@prisma/client";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { DashboardService } from "./dashboard.service";

const getDashboardStats: RequestHandler = catchAsync(async (req, res) => {
  const role = req.user?.role as Role;
  const result = await DashboardService.getDashboardStats(role);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Dashboard statistics retrieved successfully.",
    data: result,
  });
});

export const DashboardController = {
  getDashboardStats,
};
