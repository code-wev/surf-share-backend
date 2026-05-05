import type { RequestHandler } from "express";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { AuthService } from "./auth.service";

// Register as Surfer
const registerSurfer: RequestHandler = catchAsync(async (req, res) => {
  const result = await AuthService.registerSurfer(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Surfer registered successfully.",
    data: result,
  });
});

// Register as Photographer
const registerPhotographer: RequestHandler = catchAsync(async (req, res) => {
  const result = await AuthService.registerPhotographer(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Photographer registered successfully.",
    data: result,
  });
});

// Register as Moderator
const registerModerator: RequestHandler = catchAsync(async (req, res) => {
  const result = await AuthService.registerModerator(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Moderator registered successfully.",
    data: result,
  });
});

// Login
const loginUser: RequestHandler = catchAsync(async (req, res) => {
  const result = await AuthService.loginUser(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User logged in successfully.",
    data: result,
  });
});

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
  registerSurfer,
  registerPhotographer,
  registerModerator,
  loginUser,
  forgotPassword,
  verifyOtp,
  resetPassword,
};
