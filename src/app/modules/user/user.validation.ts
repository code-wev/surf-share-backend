import { z } from "zod";

const ModeratorPermissionEnum = z.enum([
  "APPROVE_PHOTO",
  "ADD_LOCATION",
  "ALL_ACCESS",
]);

// Update User Validation
const updateUser = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).optional(),
      countryName: z.string().optional(),
      address: z.string().optional(),
      phoneNumber: z.string().optional(),
      manualBankDetails: z.string().optional(),
      permissions: z.array(ModeratorPermissionEnum).optional(),
      promotionEmail: z.boolean().optional(),
      socialAccounts: z
        .array(
          z.object({
            platform: z.string().min(1),
            url: z.string().url(),
          }),
        )
        .optional(),
    })
    .strict(),
});

export const UserValidation = {
  updateUser,
};
