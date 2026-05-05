import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import config from "../config";

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "surfshare",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
  } as any,
});

export const upload = multer({ storage: storage });
export const cloudinaryInstance = cloudinary;
