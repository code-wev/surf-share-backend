import { Router } from "express";
import multer from "multer";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { PhotoController } from "./photo.controller";
import { PhotoValidation } from "./photo.validation";

const router = Router();
const uploadMemory = multer({ storage: multer.memoryStorage() });

router.get("/my-uploads", auth("PHOTOGRAPHER"), PhotoController.getMyPhotos);

// Moderator endpoint
router.get("/moderator-uploads", auth("ADMIN", "MODERATOR"), PhotoController.getPhotosForModerator);

// Public gallery endpoint
router.get("/", PhotoController.getAllPhotos);

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

// Update photo details (by photographer/admin/moderator)
router.patch(
  "/:photoId",
  auth("PHOTOGRAPHER", "ADMIN", "MODERATOR"),
  validateRequest(PhotoValidation.updatePhoto),
  PhotoController.updatePhoto,
);

// Delete photo (by photographer/admin/moderator)
router.delete(
  "/:photoId",
  auth("PHOTOGRAPHER", "ADMIN", "MODERATOR"),
  PhotoController.deletePhoto,
);

// Get photos by photographer ID (public/admin)
router.get("/:photographerId", PhotoController.getPhotosByPhotographerId);

// Max 20 photos at a time
router.post(
  "/bulk",
  auth("PHOTOGRAPHER"),
  uploadMemory.array("photos", 20),
  validateRequest(PhotoValidation.uploadPhotos),
  PhotoController.uploadPhotos,
);

export const PhotoRoutes = router;