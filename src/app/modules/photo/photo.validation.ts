import { z } from "zod";

const uploadPhotos = z.object({
  body: z.object({
    locations: z.union([z.string(), z.array(z.string())]),
    prices: z.union([z.string(), z.array(z.string())]),
    capturedAts: z.union([z.string(), z.array(z.string())]).optional(),
    lastModifiedDates: z.union([z.string(), z.array(z.string())]).optional(),
  }),
});

const updatePhoto = z.object({
  body: z.object({
    title: z.string().optional(),
    price: z.number().optional(),
    locationId: z.string().optional(),
    capturedAt: z.string().datetime().optional(),
    timeKey: z.string().optional(),
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
  updatePhoto,
  updatePhotoStatus,
  bulkUpdatePhotoStatus,
};
