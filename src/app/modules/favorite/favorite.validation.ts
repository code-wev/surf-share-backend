import { z } from "zod";

const toggleFavorite = z.object({
  body: z.object({
    photoId: z.string().min(1, "Photo ID is required"),
  }),
});

export const FavoriteValidation = {
  toggleFavorite,
};
