import type { RequestHandler } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { FavoriteService } from "./favorite.service";

const toggleFavorite: RequestHandler = catchAsync(async (req, res) => {
  const userId = req.user!.userId;
  const { photoId } = req.body;

  const result = await FavoriteService.toggleFavorite(userId, photoId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.status === "added" ? "Added to favourites" : "Removed from favourites",
    data: result,
  });
});

const getMyFavorites: RequestHandler = catchAsync(async (req, res) => {
  const userId = req.user!.userId;
  const result = await FavoriteService.getMyFavorites(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Favourites retrieved successfully",
    data: result,
  });
});

const getMyFavoriteIds: RequestHandler = catchAsync(async (req, res) => {
  const userId = req.user!.userId;
  const result = await FavoriteService.getMyFavoriteIds(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Favourite IDs retrieved successfully",
    data: result,
  });
});

export const FavoriteController = {
  toggleFavorite,
  getMyFavorites,
  getMyFavoriteIds,
};
