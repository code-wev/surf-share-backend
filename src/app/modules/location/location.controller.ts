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

const getHierarchy: RequestHandler = catchAsync(async (req, res) => {
  const result = await LocationService.getHierarchy();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Location hierarchy retrieved successfully.",
    data: result,
  });
});

const createLocation: RequestHandler = catchAsync(async (req, res) => {
  const file = req.file;

  if (!file) {
    throw new AppError(400, "Preview image is required.");
  }

  const payload = {
    ...req.body,
    latitude: Number(req.body.latitude),
    longitude: Number(req.body.longitude),
  };

  const result = await LocationService.createLocation(payload, file.filename);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Location created successfully.",
    data: result,
  });
});

const updateLocation: RequestHandler = catchAsync(async (req, res) => {
  const file = req.file;
  const fileName = file?.filename;

  const payload = { ...req.body };
  if (payload.latitude !== undefined) {
    payload.latitude = Number(payload.latitude);
  }
  if (payload.longitude !== undefined) {
    payload.longitude = Number(payload.longitude);
  }

  const result = await LocationService.updateLocation(req.params.id as string, payload, fileName);

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

const getMapData: RequestHandler = catchAsync(async (req, res) => {
  const result = await LocationService.getMapData();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Map data retrieved successfully.",
    data: result,
  });
});

export const LocationController = {
  getAllLocations,
  getHierarchy,
  createLocation,
  updateLocation,
  deleteLocation,
  getMapData,
};
