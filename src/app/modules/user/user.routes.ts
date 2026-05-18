import { Router } from "express";

import validateRequest from "../../middlewares/validateRequest";
import auth from "../../middlewares/auth";
import { upload } from "../../utils/upload";
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
router.patch(
  "/:id/profile-image",
  auth(),
  upload.single("image"),
  UserController.uploadProfileImage,
);
router.patch(
  "/:id/subscription",
  auth("ADMIN"),
  UserController.updateSubscriptionTier,
);

export const UserRoutes = router;
