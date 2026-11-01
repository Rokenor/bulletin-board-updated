import fs from "fs/promises";
import multer from "multer";
import createHttpError from "http-errors";
import type { Request, Response, NextFunction } from "express";

export const UPLOAD_DIR = "uploads/";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(createHttpError(400, "Only image files are allowed"));
    }
    cb(null, true);
  },
});

const uploadSingleImage = upload.single("image");

export const uploadImage = (
  req: Request<{}, {}, {}>,
  res: Response,
  next: NextFunction,
) => {
  uploadSingleImage(req as Request, res, (err) => {
    if (err) return next(err);

    res.on("close", () => {
      if (req.file) {
        fs.unlink(req.file.path).catch(() => {});
      }
    });
    next();
  });
};
