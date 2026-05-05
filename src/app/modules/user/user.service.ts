import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Role, User, Prisma } from "@prisma/client";

import config from "../../config";
import AppError from "../../errors/AppError";
import prisma from "../../utils/prisma";
import type {
  ILoginResponse,
  IUserLoginPayload,
  ISurferRegisterPayload,
  IPhotographerRegisterPayload,
  IModeratorRegisterPayload,
  IUserResponse,
} from "./user.interface";

// Helper function to sanitize user data before sending it in responses
const sanitizeUser = (user: User): IUserResponse => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  countryName: user.countryName,
  address: user.address,
  phoneNumber: user.phoneNumber,
  paypalEmail: user.paypalEmail,
  permissions: user.permissions as any,
});

// Check if a user with the given email already exists
const checkExistingUser = async (email: string) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError(409, "A user with this email already exists.");
  }
};

// Register as Surfer
const registerSurfer = async (
  payload: ISurferRegisterPayload,
): Promise<IUserResponse> => {
  await checkExistingUser(payload.email);
  const hashedPassword = await bcrypt.hash(
    payload.password!,
    Number(config.bcryptSaltRounds),
  );

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      countryName: payload.countryName,
      address: payload.address,
      phoneNumber: payload.phoneNumber,
      password: hashedPassword,
      role: Role.SURFER,
    },
  });

  return sanitizeUser(user);
};

// Register as Photographer
const registerPhotographer = async (
  payload: IPhotographerRegisterPayload,
): Promise<IUserResponse> => {
  await checkExistingUser(payload.email);
  const hashedPassword = await bcrypt.hash(
    payload.password!,
    Number(config.bcryptSaltRounds),
  );

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      countryName: payload.countryName,
      address: payload.address,
      phoneNumber: payload.phoneNumber,
      paypalEmail: payload.paypalEmail,
      password: hashedPassword,
      role: Role.PHOTOGRAPHER,
    },
  });

  return sanitizeUser(user);
};

// Register as Moderator
const registerModerator = async (
  payload: IModeratorRegisterPayload,
): Promise<IUserResponse> => {
  await checkExistingUser(payload.email);
  const hashedPassword = await bcrypt.hash(
    payload.password!,
    Number(config.bcryptSaltRounds),
  );

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      countryName: payload.countryName,
      address: payload.address,
      phoneNumber: payload.phoneNumber,
      permissions: payload.permissions,
      password: hashedPassword,
      role: Role.MODERATOR,
    },
  });

  return sanitizeUser(user);
};

// Login
const loginUser = async (
  payload: IUserLoginPayload,
): Promise<ILoginResponse> => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });
  if (!user) throw new AppError(401, "Invalid email or password.");

  const isPasswordMatched = await bcrypt.compare(
    payload.password,
    user.password,
  );
  if (!isPasswordMatched) throw new AppError(401, "Invalid email or password.");

  const authPayload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = jwt.sign(authPayload, config.jwt.accessSecret as string, {
    expiresIn: config.jwt.accessExpiresIn as any,
  });

  return { accessToken, user: sanitizeUser(user) };
};

const getAllUsers = async (query: Record<string, unknown>) => {
  const { role, page = 1, limit = 10 } = query;
  
  // By default, only return Surfers and Photographers
  const filter: Prisma.UserWhereInput = {
    role: {
      in: [Role.SURFER, Role.PHOTOGRAPHER],
    },
  };
  
  if (role && typeof role === 'string' && role !== 'All Users') {
    if (role === 'Photographers' || role.toUpperCase() === 'PHOTOGRAPHER') {
      filter.role = Role.PHOTOGRAPHER;
    } else if (role === 'Surfers' || role.toUpperCase() === 'SURFER') {
      filter.role = Role.SURFER;
    }
    // Any other role queries (like ADMIN or MODERATOR) will be ignored,
    // falling back to the safe default of only SURFER and PHOTOGRAPHER.
  }

  const pageNumber = Number(page) || 1;
  const limitNumber = Number(limit) || 10;
  const skip = (pageNumber - 1) * limitNumber;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNumber
    }),
    prisma.user.count({ where: filter })
  ]);

  return {
    meta: {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber)
    },
    data: users.map(sanitizeUser)
  };
};

// Get user by ID
const getUserById = async (id: string): Promise<IUserResponse> => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(404, "User not found.");
  return sanitizeUser(user);
};

// Update user by ID
const updateUser = async (
  id: string,
  payload: Partial<User>,
): Promise<IUserResponse> => {
  const existingUser = await prisma.user.findUnique({ where: { id } });
  if (!existingUser) throw new AppError(404, "User not found.");

  const updatedUser = await prisma.user.update({
    where: { id },
    data: payload,
  });

  return sanitizeUser(updatedUser);
};

// Delete user by ID
const deleteUser = async (id: string): Promise<IUserResponse> => {
  const existingUser = await prisma.user.findUnique({ where: { id } });
  if (!existingUser) throw new AppError(404, "User not found.");

  const deletedUser = await prisma.user.delete({
    where: { id },
  });

  return sanitizeUser(deletedUser);
};

export const UserService = {
  registerSurfer,
  registerPhotographer,
  registerModerator,
  loginUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
