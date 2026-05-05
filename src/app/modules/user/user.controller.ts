import type { RequestHandler } from "express";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { UserService } from "./user.service";

// Get all users (with optional role filter)
const getAllUsers: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserService.getAllUsers(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Users retrieved successfully.',
    meta: result.meta,
    data: result.data
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

export const UserController = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
