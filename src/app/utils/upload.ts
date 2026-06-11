import multer from "multer";
import path from "path";
import fs from "fs";

const createDiskStorage = (folderName: string) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(process.cwd(), "public", "uploads", folderName);
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    },
  });
};

// Middleware exports
export const uploadProfile = multer({ storage: createDiskStorage("profile"), limits: { fileSize: 10 * 1024 * 1024 } });
export const uploadAdvertisement = multer({ storage: createDiskStorage("advertisement"), limits: { fileSize: 50 * 1024 * 1024 } });
export const uploadLocation = multer({ storage: createDiskStorage("location"), limits: { fileSize: 50 * 1024 * 1024 } });
export const uploadPhotoMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });
export const uploadPhotoDisk = multer({ storage: createDiskStorage("temp_raw"), limits: { fileSize: 100 * 1024 * 1024 } });

// Legacy export fallback if some controllers still use generic `upload`
export const upload = multer({ storage: createDiskStorage("misc"), limits: { fileSize: 50 * 1024 * 1024 } });
