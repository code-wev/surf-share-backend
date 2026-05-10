import { Router } from "express";
import multer from "multer";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { PhotoController } from "./photo.controller";
import { PhotoValidation } from "./photo.validation";

const router = Router();
const uploadMemory = multer({ storage: multer.memoryStorage() });

// Public gallery endpoint
router.get("/", PhotoController.getAllPhotos);

// Max 20 photos at a time
router.post(
  "/bulk",
  auth("PHOTOGRAPHER"),
  uploadMemory.array("photos", 20),
  validateRequest(PhotoValidation.uploadPhotos),
  PhotoController.uploadPhotos,
);

export const PhotoRoutes = router;
