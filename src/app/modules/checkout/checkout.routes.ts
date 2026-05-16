import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { CheckoutController } from "./checkout.controller";
import { CheckoutValidation } from "./checkout.validation";

const router = Router();

router.post(
  "/create-session",
  auth("SURFER", "PHOTOGRAPHER", "MODERATOR", "ADMIN"),
  validateRequest(CheckoutValidation.createSession),
  CheckoutController.createSession,
);

// The webhook route is mapped in app.ts to use express.raw()
router.post(
  "/webhook",
  CheckoutController.stripeWebhook,
);

router.get(
  "/verify-session",
  auth("SURFER", "PHOTOGRAPHER", "MODERATOR", "ADMIN"),
  CheckoutController.verifySession,
);

router.get(
  "/purchased-ids",
  auth("SURFER", "PHOTOGRAPHER", "MODERATOR", "ADMIN"),
  CheckoutController.getPurchasedPhotoIds,
);

export const CheckoutRoutes = router;
