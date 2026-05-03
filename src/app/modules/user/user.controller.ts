import type { RequestHandler } from 'express';

import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { UserService } from './user.service';

const registerUser: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserService.registerUser(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'User registered successfully.',
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

export const UserController = {
  registerUser,
  loginUser
};
