import type { RequestHandler } from 'express';

import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { UserService } from './user.service';

const registerSurfer: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserService.registerSurfer(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Surfer registered successfully.',
    data: result
  });
});

const registerPhotographer: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserService.registerPhotographer(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Photographer registered successfully.',
    data: result
  });
});

const registerModerator: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserService.registerModerator(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Moderator registered successfully.',
    data: result
  });
});

const loginUser: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserService.loginUser(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User logged in successfully.',
    data: result
  });
});

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

const getUserById: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserService.getUserById(req.params.id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User retrieved successfully.',
    data: result
  });
});

const updateUser: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserService.updateUser(req.params.id as string, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User updated successfully.',
    data: result
  });
});

const deleteUser: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserService.deleteUser(req.params.id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User deleted successfully.',
    data: result
  });
});

export const UserController = {
  registerSurfer,
  registerPhotographer,
  registerModerator,
  loginUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
};
