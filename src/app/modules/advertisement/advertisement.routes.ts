import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { upload } from "../../utils/upload";
import { AdvertisementController } from "./advertisement.controller";
import { AdvertisementValidation } from "./advertisement.validation";

const router = Router();

router.get("/", AdvertisementController.getAdvertisement);

router.post(
  "/",
  auth("ADMIN"),
  upload.single("photo"),
  validateRequest(AdvertisementValidation.upsertAdvertisement),
  AdvertisementController.upsertAdvertisement,
);

router.delete("/", auth("ADMIN"), AdvertisementController.deleteAdvertisement);

export const AdvertisementRoutes = router;
