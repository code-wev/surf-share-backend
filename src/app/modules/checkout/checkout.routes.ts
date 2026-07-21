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

router.post(
  "/capture-order",
  auth("SURFER", "PHOTOGRAPHER", "MODERATOR", "ADMIN"),
  CheckoutController.captureOrder,
);

router.post(
  "/retry-payment",
  auth("SURFER", "PHOTOGRAPHER", "MODERATOR", "ADMIN"),
  CheckoutController.retryPayment,
);

// The webhook route is mapped in app.ts to use express.raw()
router.post(
  "/webhook",
  CheckoutController.paypalWebhook,
);

router.get(
  "/purchased-ids",
  auth("SURFER", "PHOTOGRAPHER", "MODERATOR", "ADMIN"),
  CheckoutController.getPurchasedPhotoIds,
);

router.get(
  "/purchased-photos",
  auth("SURFER", "PHOTOGRAPHER", "MODERATOR", "ADMIN"),
  CheckoutController.getPurchasedPhotos,
);

export const CheckoutRoutes = router;
