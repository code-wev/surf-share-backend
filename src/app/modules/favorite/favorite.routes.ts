import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { FavoriteController } from "./favorite.controller";
import { FavoriteValidation } from "./favorite.validation";

const router = Router();

router.post(
  "/toggle",
  auth("SURFER", "PHOTOGRAPHER", "MODERATOR", "ADMIN"), // Anyone logged in can favorite
  validateRequest(FavoriteValidation.toggleFavorite),
  FavoriteController.toggleFavorite,
);

router.get(
  "/",
  auth("SURFER", "PHOTOGRAPHER", "MODERATOR", "ADMIN"),
  FavoriteController.getMyFavorites,
);

router.get(
  "/ids",
  auth("SURFER", "PHOTOGRAPHER", "MODERATOR", "ADMIN"),
  FavoriteController.getMyFavoriteIds,
);

export const FavoriteRoutes = router;
