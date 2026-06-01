import { Role, User, Prisma, UserStatus } from "@prisma/client";
import AppError from "../../errors/AppError";
import prisma from "../../utils/prisma";
import type { IUserResponse, ISocialAccount } from "./user.interface";

type UserWithSocialAccount = User & {
  socialAccount?: Prisma.JsonValue | null;
  promotionEmail?: boolean;
};

type IUserUpdatePayload = {
  name?: string;
  countryName?: string;
  address?: string;
  phoneNumber?: string;
  paypalEmail?: string;
  profileImageUrl?: string;
  permissions?: User["permissions"];
  socialAccounts?: ISocialAccount[];
  promotionEmail?: boolean;
  acceptedApproval?: boolean;
  acceptedContributor?: boolean;
};

// Helper function to sanitize user data before sending it in responses
const sanitizeUser = (
  user: UserWithSocialAccount,
): IUserResponse & { subscriptionTier?: string; status: string } => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  createdAt: user.createdAt.toISOString(),
  countryName: user.countryName,
  address: user.address,
  phoneNumber: user.phoneNumber,
  paypalEmail: user.paypalEmail,
  subscriptionTier: (user as any).subscriptionTier,
  permissions: user.permissions
    ? (user.permissions as unknown as string[])
    : undefined,
  profileImageUrl:
    (user as unknown as { profileImageUrl?: string | null }).profileImageUrl ??
    null,
  socialAccounts: user.socialAccount
    ? (user.socialAccount as unknown as ISocialAccount[])
    : undefined,
  promotionEmail: user.promotionEmail ?? false,
  acceptedApproval: (user as any).acceptedApproval ?? false,
  acceptedContributor: (user as any).acceptedContributor ?? false,
});

type UserStatsMap = Record<
  string,
  {
    photoCount: number;
    purchasePhoto: number;
    platformCommission: number;
  }
>;

const buildUserStatsMap = async (userIds: string[]): Promise<UserStatsMap> => {
  if (userIds.length === 0) {
    return {};
  }

  const [photos, orderItems] = await Promise.all([
    prisma.photo.groupBy({
      by: ["photographerId"],
      where: { photographerId: { in: userIds } },
      _count: { _all: true },
    }),
    prisma.orderItem.findMany({
      where: {
        order: {
          userId: { in: userIds },
          status: "PAID",
        },
      },
      select: {
        price: true,
        platformFee: true,
        order: {
          select: {
            userId: true,
          },
        },
      },
    }),
  ]);

  const statsMap: UserStatsMap = {};

  for (const userId of userIds) {
    statsMap[userId] = {
      photoCount: 0,
      purchasePhoto: 0,
      platformCommission: 0,
    };
  }

  for (const photoGroup of photos) {
    statsMap[photoGroup.photographerId] = {
      ...statsMap[photoGroup.photographerId],
      photoCount: photoGroup._count._all,
    };
  }

  for (const orderItem of orderItems) {
    const userId = orderItem.order.userId;
    statsMap[userId] = {
      ...statsMap[userId],
      purchasePhoto: statsMap[userId].purchasePhoto + 1,
      platformCommission:
        statsMap[userId].platformCommission + (orderItem.platformFee || 0),
    };
  }

  return statsMap;
};

const getAllUsers = async (query: Record<string, unknown>) => {
  const { role, page, limit = 10, cursor } = query;

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
    } else if (role.toUpperCase() === "MODERATOR" || role === "Moderators") {
      filter.role = Role.MODERATOR;
    } else if (role.toUpperCase() === "ADMIN" || role === "Admins") {
      filter.role = Role.ADMIN;
    }
  }

  const limitNumber = Number(limit) || 10;

  const queryOptions: Prisma.UserFindManyArgs = {
    where: filter,
    orderBy: { createdAt: "desc" },
    take: limitNumber,
  };

  let pageNumber = 1;

  if (cursor && typeof cursor === "string") {
    queryOptions.cursor = { id: cursor };
    queryOptions.skip = 1;
  } else if (page) {
    pageNumber = Number(page) || 1;
    queryOptions.skip = (pageNumber - 1) * limitNumber;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany(queryOptions),
    prisma.user.count({ where: filter }),
  ]);

  const userStatsMap = await buildUserStatsMap(users.map((user) => user.id));

  const nextCursor =
    users.length === limitNumber ? users[users.length - 1].id : null;

  return {
    meta: {
      page: cursor ? undefined : pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber),
      nextCursor,
    },
    data: users.map((user) => {
      const stats = userStatsMap[user.id];
      return {
        ...sanitizeUser(user),
        photoCount: stats?.photoCount ?? 0,
        purchasePhoto: stats?.purchasePhoto ?? 0,
        platformCommission: Number((stats?.platformCommission ?? 0).toFixed(2)),
      };
    }),
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

// Update Subscription Tier
const updateSubscriptionTier = async (id: string, tier: string) => {
  const existingUser = await prisma.user.findUnique({ where: { id } });
  if (!existingUser) throw new AppError(404, "User not found.");
  if (existingUser.role !== Role.PHOTOGRAPHER) {
    throw new AppError(400, "Only photographers can have subscription tiers.");
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { subscriptionTier: tier as any },
  });

  return sanitizeUser(updatedUser);
};

// Update User Status
const updateStatus = async (id: string, status: UserStatus) => {
  const existingUser = await prisma.user.findUnique({ where: { id } });
  if (!existingUser) throw new AppError(404, "User not found.");

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { status },
  });

  return sanitizeUser(updatedUser);
};

export const UserService = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateSubscriptionTier,
  updateStatus,
};
