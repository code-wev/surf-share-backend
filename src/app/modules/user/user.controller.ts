import type { RequestHandler } from "express";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { UserService } from "./user.service";
import AppError from "../../errors/AppError";

// Get all users (with optional role filter)
const getAllUsers: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserService.getAllUsers(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Users retrieved successfully.",
    meta: result.meta,
    data: result.data,
  });
});

// Get user by ID
const getUserById: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserService.getUserById(req.params.id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User retrieved successfully.",
    data: result,
  });
});

// Update user by ID
const updateUser: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserService.updateUser(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User updated successfully.",
    data: result,
  });
});

// Delete user by ID
const deleteUser: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserService.deleteUser(req.params.id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User deleted successfully.",
    data: result,
  });
});

const uploadProfileImage: RequestHandler = catchAsync(async (req, res) => {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const file = req.file;

  console.log("File found:", !!file);
  console.log("Request file:", file);
  console.log("Request body:", req.body);

  if (!file) {
    throw new AppError(400, "No image file uploaded.");
  }

  if (!id) {
    throw new AppError(400, "Missing user id parameter.");
  }

  const imageUrl = `/uploads/profile/${file.filename}`;

  const updatedUser = await UserService.updateUser(id, {
    profileImageUrl: imageUrl,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Profile image updated successfully.",
    data: updatedUser,
  });
});

const updateSubscriptionTier: RequestHandler = catchAsync(async (req, res) => {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const { subscriptionTier } = req.body;

  if (!subscriptionTier || !id) {
    throw new AppError(400, "Missing subscriptionTier or id payload.");
  }

  const result = await UserService.updateSubscriptionTier(id as string, subscriptionTier);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Subscription tier updated successfully.",
    data: result,
  });
});

const updateStatus: RequestHandler = catchAsync(async (req, res) => {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const { status } = req.body;

  if (!status || !id) {
    throw new AppError(400, "Missing status or id payload.");
  }

  const result = await UserService.updateStatus(id as string, status);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User status updated successfully.",
    data: result,
  });
});

export const UserController = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  uploadProfileImage,
  updateSubscriptionTier,
  updateStatus,
};
