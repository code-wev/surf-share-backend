import { z } from "zod";

const uploadPhotos = z.object({
  body: z.object({
    locations: z.union([z.string(), z.array(z.string())]),
    prices: z.union([z.string(), z.array(z.string())]),
  }),
});

export const PhotoValidation = {
  uploadPhotos,
};
