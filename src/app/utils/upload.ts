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
export const uploadProfile = multer({ storage: createDiskStorage("profile") });
export const uploadAdvertisement = multer({ storage: createDiskStorage("advertisement") });
export const uploadLocation = multer({ storage: createDiskStorage("location") });
export const uploadPhotoMemory = multer({ storage: multer.memoryStorage() });

// Legacy export fallback if some controllers still use generic `upload`
export const upload = multer({ storage: createDiskStorage("misc") });
