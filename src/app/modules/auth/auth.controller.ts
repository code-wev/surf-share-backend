import type { RequestHandler } from "express";

import config from "../../config";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { AuthService } from "./auth.service";
import AppError from "../../errors/AppError";

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

  const { refreshToken, ...responseData } = result;

  if (refreshToken) {
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User logged in successfully.",
    data: responseData,
  });
});

/**
 * Refresh Token
 */
const refreshToken: RequestHandler = catchAsync(async (req, res) => {
  const token = req.cookies.refreshToken;
  
  if (!token) {
    throw new AppError(401, "Refresh token not found.");
  }

  const result = await AuthService.refreshToken(token);

  if (result.refreshToken) {
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Token refreshed successfully.",
    data: {
      accessToken: result.accessToken
    },
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
  refreshToken,
  forgotPassword,
  verifyOtp,
  resetPassword,
};
