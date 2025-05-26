// middleware/fileUploader.js
const multer = require("multer");
const { v1: uuidv1 } = require("uuid");
const path = require("path");
const fs = require("fs").promises;

const MIME_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx", // .xlsx
  "application/vnd.ms-excel": "xls", // .xls
  "application/vnd.ms-excel.sheet.macroEnabled.12": "xlsm", // .xlsm (optional)
};

const fileUploader = multer({
  limits: { fileSize: 5000000 },
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/temp");
    },
    filename: (req, file, cb) => {
      const ext = MIME_TYPE_MAP[file.mimetype];
      cb(null, `${uuidv1()}.${ext}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const isValid = !!MIME_TYPE_MAP[file.mimetype];
    cb(isValid ? null : new Error("Invalid file type!"), isValid);
  },
});

const moveFile = async (tempPath) => {
  if (!tempPath) return null;
  const filename = path.basename(tempPath);
  const finalPath = path.join("uploads", "images", filename);
  await fs.mkdir(path.dirname(finalPath), { recursive: true });
  await fs.rename(tempPath, finalPath);
  return path.basename(finalPath);
};

const cleanupFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (err) {
    console.error("Failed to cleanup file:", err);
  }
};

module.exports = { fileUploader, moveFile, cleanupFile };
