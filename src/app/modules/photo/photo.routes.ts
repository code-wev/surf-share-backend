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

// Get all photos (moderation)
router.get("/", auth("ADMIN", "MODERATOR"), PhotoController.getAllPhotos);

// Get photo by ID
router.get("/detail/:photoId", PhotoController.getPhotoById);

// Update photo status (single)
router.patch(
  "/:photoId/status",
  auth("ADMIN", "MODERATOR"),
  validateRequest(PhotoValidation.updatePhotoStatus),
  PhotoController.updatePhotoStatus,
);

// Update photo status (bulk)
router.post(
  "/bulk-status",
  auth("ADMIN", "MODERATOR"),
  validateRequest(PhotoValidation.bulkUpdatePhotoStatus),
  PhotoController.bulkUpdatePhotoStatus,
);

// Get photos by photographer ID (public/admin)
router.get("/:photographerId", PhotoController.getPhotosByPhotographerId);

export const PhotoRoutes = router;
