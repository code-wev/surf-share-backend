import { z } from "zod";

const uploadPhotos = z.object({
  body: z.object({
    locations: z.union([z.string(), z.array(z.string())]),
    prices: z.union([z.string(), z.array(z.string())]),
  }),
});

const updatePhotoStatus = z.object({
  body: z.object({
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  }),
});

const bulkUpdatePhotoStatus = z.object({
  body: z.object({
    photoIds: z.array(z.string()),
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  }),
});

export const PhotoValidation = {
  uploadPhotos,
  updatePhotoStatus,
  bulkUpdatePhotoStatus,
};
