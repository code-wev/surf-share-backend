import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import config from '../../config';
import AppError from '../../errors/AppError';
import prisma from '../../utils/prisma';
import type {
  ILoginResponse,
  IUserLoginPayload,
  IUserRegisterPayload,
  IUserResponse
} from './user.interface';

type UserRecord = {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
};

const sanitizeUser = (user: UserRecord): IUserResponse => ({
  id: user.id,
  email: user.email,
  role: user.role
});

const registerUser = async (payload: IUserRegisterPayload): Promise<IUserResponse> => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: payload.email
    }
  });

  if (existingUser) {
    throw new AppError(409, 'A user with this email already exists.');
  }

  const hashedPassword = await bcrypt.hash(payload.password, config.bcryptSaltRounds);

  const user = await prisma.user.create({
    data: {
      email: payload.email,
      password: hashedPassword
    },
    select: {
      id: true,
      email: true,
      role: true
    }
  });

  return sanitizeUser(user);
};

const loginUser = async (payload: IUserLoginPayload): Promise<ILoginResponse> => {
  const user = await prisma.user.findUnique({
    where: {
      email: payload.email
    }
  });

  if (!user) {
    throw new AppError(401, 'Invalid email or password.');
  }

  const isPasswordMatched = await bcrypt.compare(payload.password, user.password);

  if (!isPasswordMatched) {
    throw new AppError(401, 'Invalid email or password.');
  }

  const authPayload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  const accessToken = jwt.sign(authPayload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn
  });

  return {
    accessToken,
    user: sanitizeUser(user)
  };
};

export const UserService = {
  registerUser,
  loginUser
};
