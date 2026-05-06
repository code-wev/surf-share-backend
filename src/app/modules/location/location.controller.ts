import type { RequestHandler } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { LocationService } from "./location.service";
import AppError from "../../errors/AppError";

const getAllLocations: RequestHandler = catchAsync(async (req, res) => {
  const result = await LocationService.getAllLocations(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Locations retrieved successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const createLocation: RequestHandler = catchAsync(async (req, res) => {
  const file = req.file;

  if (!file) {
    throw new AppError(400, "Preview image is required.");
  }

  const result = await LocationService.createLocation(req.body, file.path);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Location created successfully.",
    data: result,
  });
});

const updateLocation: RequestHandler = catchAsync(async (req, res) => {
  const file = req.file;
  const imageUrl = file?.path;

  const result = await LocationService.updateLocation(req.params.id as string, req.body, imageUrl);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Location updated successfully.",
    data: result,
  });
});

const deleteLocation: RequestHandler = catchAsync(async (req, res) => {
  const result = await LocationService.deleteLocation(req.params.id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Location deleted successfully.",
    data: result,
  });
});

export const LocationController = {
  getAllLocations,
  createLocation,
  updateLocation,
  deleteLocation,
};
