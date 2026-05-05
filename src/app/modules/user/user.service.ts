import { Role, User, Prisma } from "@prisma/client";
import AppError from "../../errors/AppError";
import prisma from "../../utils/prisma";
import type { IUserResponse, ISocialAccount } from "./user.interface";

type UserWithSocialAccount = User & {
  socialAccount?: Prisma.JsonValue | null;
};

type IUserUpdatePayload = {
  name?: string;
  countryName?: string;
  address?: string;
  phoneNumber?: string;
  paypalEmail?: string;
  permissions?: User["permissions"];
  socialAccounts?: ISocialAccount[];
};

// Helper function to sanitize user data before sending it in responses
const sanitizeUser = (user: UserWithSocialAccount): IUserResponse => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  countryName: user.countryName,
  address: user.address,
  phoneNumber: user.phoneNumber,
  paypalEmail: user.paypalEmail,
  permissions: user.permissions as any,
  socialAccounts: user.socialAccount
    ? (user.socialAccount as unknown as ISocialAccount[])
    : undefined,
});

const getAllUsers = async (query: Record<string, unknown>) => {
  const { role, page = 1, limit = 10 } = query;

  // By default, only return Surfers and Photographers
  const filter: Prisma.UserWhereInput = {
    role: {
      in: [Role.SURFER, Role.PHOTOGRAPHER],
    },
  };

  if (role && typeof role === "string" && role !== "All Users") {
    if (role === "Photographers" || role.toUpperCase() === "PHOTOGRAPHER") {
      filter.role = Role.PHOTOGRAPHER;
    } else if (role === "Surfers" || role.toUpperCase() === "SURFER") {
      filter.role = Role.SURFER;
    } else if (role.toUpperCase() === 'MODERATOR' || role === 'Moderators') {
      filter.role = Role.MODERATOR;
    } else if (role.toUpperCase() === 'ADMIN' || role === 'Admins') {
      filter.role = Role.ADMIN;
    }
  }

  const pageNumber = Number(page) || 1;
  const limitNumber = Number(limit) || 10;
  const skip = (pageNumber - 1) * limitNumber;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      skip,
      take: limitNumber,
    }),
    prisma.user.count({ where: filter }),
  ]);

  return {
    meta: {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber),
    },
    data: users.map(sanitizeUser),
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
  payload: IUserUpdatePayload,
): Promise<IUserResponse> => {
  const existingUser = await prisma.user.findUnique({ where: { id } });
  if (!existingUser) throw new AppError(404, "User not found.");

  const { socialAccounts, ...rest } = payload;

  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      ...rest,
      ...(socialAccounts !== undefined
        ? {
            socialAccount: socialAccounts as unknown as Prisma.InputJsonValue,
          }
        : {}),
    },
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
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
