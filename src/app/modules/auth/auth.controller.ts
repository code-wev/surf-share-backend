import type { RequestHandler } from "express";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { AuthService } from "./auth.service";

/**
 * Forgot Password - Send OTP
 */
const forgotPassword: RequestHandler = catchAsync(async (req, res) => {
  const result = await AuthService.forgotPassword(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: result,
  });
});

/**
 * Verify OTP
 */
const verifyOtp: RequestHandler = catchAsync(async (req, res) => {
  const result = await AuthService.verifyOtp(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: {
      resetToken: result.resetToken,
    },
  });
});

/**
 * Reset Password
 */
const resetPassword: RequestHandler = catchAsync(async (req, res) => {
  const result = await AuthService.resetPassword(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: result,
  });
});

export const AuthController = {
  forgotPassword,
  verifyOtp,
  resetPassword,
};
