import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { upload } from "../../utils/upload";
import { LocationController } from "./location.controller";
import { LocationValidation } from "./location.validation";

const router = Router();

router.get("/", LocationController.getAllLocations);

router.post(
  "/",
  auth("ADMIN", "MODERATOR"),
  upload.single("previewImage"),
  validateRequest(LocationValidation.createLocation),
  LocationController.createLocation,
);

router.patch(
  "/:id",
  auth("ADMIN", "MODERATOR"),
  upload.single("previewImage"),
  validateRequest(LocationValidation.updateLocation),
  LocationController.updateLocation,
);

router.delete("/:id", auth("ADMIN", "MODERATOR"), LocationController.deleteLocation);

export const LocationRoutes = router;
