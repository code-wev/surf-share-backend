import { SubscriptionTier } from "@prisma/client";
import AppError from "../../errors/AppError";
import prisma from "../../utils/prisma";

export interface ISubscriptionUpdatePayload {
  photographerSplit?: number;
  platformSplit?: number;
  maxPrice?: number | null;
  dailyUploadLimit?: number | null;
  requiresApproval?: boolean;
}

const getAllSubscriptions = async () => {
  const configs = await prisma.subscriptionConfig.findMany({
    orderBy: {
      photographerSplit: "asc", // Will generally order Bronze, Silver, Gold based on standard splits
    },
  });
  return configs;
};

const updateSubscription = async (
  tier: string,
  payload: ISubscriptionUpdatePayload,
) => {
  const validTiers = Object.values(SubscriptionTier);
  if (!validTiers.includes(tier as SubscriptionTier)) {
    throw new AppError(400, "Invalid subscription tier.");
  }

  const existingConfig = await prisma.subscriptionConfig.findUnique({
    where: { tier: tier as SubscriptionTier },
  });

  if (!existingConfig) {
    throw new AppError(404, "Subscription configuration not found.");
  }

  // Cross-field validation if only one split is updated
  const newPhotographerSplit =
    payload.photographerSplit !== undefined
      ? payload.photographerSplit
      : existingConfig.photographerSplit;
  const newPlatformSplit =
    payload.platformSplit !== undefined
      ? payload.platformSplit
      : existingConfig.platformSplit;

  if (newPhotographerSplit + newPlatformSplit !== 100) {
    throw new AppError(
      400,
      "Photographer split and platform split must equal exactly 100.",
    );
  }

  const updatedConfig = await prisma.subscriptionConfig.update({
    where: { tier: tier as SubscriptionTier },
    data: payload,
  });

  return updatedConfig;
};

export const SubscriptionService = {
  getAllSubscriptions,
  updateSubscription,
};
