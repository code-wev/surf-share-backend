import { Router } from "express";
import auth from "../../middlewares/auth";
import { SalesController } from "./sales.controller";

const router = Router();

router.get("/my-sales", auth("PHOTOGRAPHER"), SalesController.getMySales);

router.get(
  "/earnings",
  auth("PHOTOGRAPHER", "ADMIN"),
  SalesController.getEarningsLedger,
);

export const SalesRoutes = router;
