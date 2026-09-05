import { Router } from "express";
import auth from "../../middlewares/auth";
import { PayoutController } from "./payout.controller";

const router = Router();

router.get("/", auth("ADMIN"), PayoutController.getAllPayouts);
router.get("/pending", auth("ADMIN"), PayoutController.getPendingPayouts);
router.patch("/mark-paid", auth("ADMIN"), PayoutController.markAsPaid);

export const PayoutRoutes = router;
