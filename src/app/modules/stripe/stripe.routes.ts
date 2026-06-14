import { Router } from "express";
import auth from "../../middlewares/auth";
import { StripeConnectController } from "./stripe.controller";

const router = Router();

router.post(
  "/connect",
  auth("PHOTOGRAPHER"),
  StripeConnectController.generateConnectLink,
);

router.get(
  "/connect/status",
  auth("PHOTOGRAPHER"),
  StripeConnectController.checkOnboardingStatus,
);

export const StripeRoutes = router;
