import { Router } from "express";

import validateRequest from "../../middlewares/validateRequest";
import auth from "../../middlewares/auth";
import { uploadProfile } from "../../utils/upload";
import { UserController } from "./user.controller";
import { UserValidation } from "./user.validation";

const router = Router();

// CRUD routes
router.get("/", auth("ADMIN", "MODERATOR"), UserController.getAllUsers);
router.get("/:id", auth(), UserController.getUserById);
router.patch(
  "/:id",
  auth(),
  validateRequest(UserValidation.updateUser),
  UserController.updateUser,
);
router.delete("/:id", auth("ADMIN"), UserController.deleteUser);
router.post(
  "/:id/profile-image",
  uploadProfile.single("image"),
  auth(),
  UserController.uploadProfileImage,
);
router.patch(
  "/:id/subscription",
  auth("ADMIN"),
  UserController.updateSubscriptionTier,
);
router.patch(
  "/:id/status",
  auth("ADMIN", "MODERATOR"),
  UserController.updateStatus,
);

export const UserRoutes = router;
