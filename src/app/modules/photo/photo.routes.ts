import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { upload } from "../../utils/upload";
import { PhotoController } from "./photo.controller";
import { PhotoValidation } from "./photo.validation";

const router = Router();

// Max 20 photos at a time
router.post(
  "/bulk",
  auth("PHOTOGRAPHER"),
  upload.array("photos", 20),
  validateRequest(PhotoValidation.uploadPhotos),
  PhotoController.uploadPhotos,
);

// Get photos uploaded by the authenticated photographer with optional filters
router.get("/my-uploads", auth("PHOTOGRAPHER"), PhotoController.getMyPhotos);

export const PhotoRoutes = router;
