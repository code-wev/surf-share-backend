import { Router } from "express";
import auth from "../../middlewares/auth";
import { SalesController } from "./sales.controller";

const router = Router();

router.get("/my-sales", auth("PHOTOGRAPHER"), SalesController.getMySales);

export const SalesRoutes = router;
