import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { SubscriptionController } from "./subscription.controller";
import { SubscriptionValidation } from "./subscription.validation";

const router = Router();

// Publicly readable so the frontend can dynamically show pricing limits
router.get("/", SubscriptionController.getAllSubscriptions);

// Highly secure endpoint, only ADMIN can change the economy
router.patch(
  "/:tier",
  auth("ADMIN"),
  validateRequest(SubscriptionValidation.updateSubscription),
  SubscriptionController.updateSubscription,
);

export const SubscriptionRoutes = router;
