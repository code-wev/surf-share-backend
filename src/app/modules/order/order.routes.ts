import { Router } from "express";
import auth from "../../middlewares/auth";
import { OrderController } from "./order.controller";

const router = Router();

router.get("/my-orders", auth(), OrderController.getMyOrders);

export const OrderRoutes = router;
