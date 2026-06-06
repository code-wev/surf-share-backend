import { Router } from "express";
import auth from "../../middlewares/auth";
import { uploadPhotoMemory } from "../../utils/upload";
import { PhotoController } from "./photo.controller";
import validateRequest from "../../middlewares/validateRequest";
import { PhotoValidation } from "./photo.validation";

const router = Router();

router.post(
  "/upload",
  auth("PHOTOGRAPHER", "ADMIN"),
  uploadPhotoMemory.array("files", 50),
  PhotoController.uploadPhotos,
);

router.get("/my-photos", auth("PHOTOGRAPHER"), PhotoController.getMyPhotos);

router.get("/moderator", auth("MODERATOR", "ADMIN"), PhotoController.getPhotosForModerator);

router.patch(
  "/status/:photoId",
  auth("MODERATOR", "ADMIN"),
  validateRequest(PhotoValidation.updatePhotoStatus),
  PhotoController.updatePhotoStatus,
);

router.patch(
  "/bulk-status",
  auth("MODERATOR", "ADMIN"),
  validateRequest(PhotoValidation.bulkUpdatePhotoStatus),
  PhotoController.bulkUpdatePhotoStatus,
);

router.patch(
  "/:photoId",
  auth("PHOTOGRAPHER", "MODERATOR", "ADMIN"),
  validateRequest(PhotoValidation.updatePhoto),
  PhotoController.updatePhoto,
);

router.delete(
  "/:photoId",
  auth("PHOTOGRAPHER", "MODERATOR", "ADMIN"),
  PhotoController.deletePhoto,
);

// Secure Download Endpoint
router.get(
  "/:photoId/download",
  auth("SURFER", "PHOTOGRAPHER", "MODERATOR", "ADMIN"),
  PhotoController.downloadOriginalPhoto,
);

router.get(
  "/photographer/:photographerId",
  PhotoController.getPhotosByPhotographerId,
);

router.get("/:photoId", PhotoController.getPhotoById);

router.get("/", PhotoController.getAllPhotos);

export const PhotoRoutes = router;
