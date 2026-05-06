import { z } from "zod";

const upsertAdvertisement = z.object({
  body: z.object({
    advertisementURL: z.string({ message: "Advertisement URL is required" }).url("Must be a valid URL"),
  }),
});

export const AdvertisementValidation = {
  upsertAdvertisement,
};
