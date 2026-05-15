import { z } from "zod";

const createSession = z.object({
  body: z.object({
    photoIds: z.array(z.string()).min(1, "At least one photo ID is required"),
  }),
});

export const CheckoutValidation = {
  createSession,
};
