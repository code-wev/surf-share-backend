import { z } from "zod";
import { SubscriptionTier } from "@prisma/client";

const updateSubscription = z
  .object({
    body: z.object({
      photographerSplit: z
        .number()
        .min(0, "Photographer split cannot be less than 0")
        .max(100, "Photographer split cannot exceed 100")
        .optional(),
      platformSplit: z
        .number()
        .min(0, "Platform split cannot be less than 0")
        .max(100, "Platform split cannot exceed 100")
        .optional(),
      maxPrice: z.number().nullable().optional(),
      dailyUploadLimit: z.number().nullable().optional(),
      requiresApproval: z.boolean().optional(),
    }),
  })
  .refine(
    (data) => {
      // If one split is provided without the other, we can't easily validate the sum here without DB state.
      // But if BOTH are provided, they must sum to 100.
      if (
        data.body.photographerSplit !== undefined &&
        data.body.platformSplit !== undefined
      ) {
        return data.body.photographerSplit + data.body.platformSplit === 100;
      }
      return true;
    },
    {
      message: "Photographer split and platform split must equal exactly 100.",
      path: ["body", "platformSplit"],
    },
  );

export const SubscriptionValidation = {
  updateSubscription,
};
