import multer from "multer";

import {
  AppError,
} from "../utils/AppError.js";

/*
|--------------------------------------------------------------------------
| ALLOWED FILE TYPES
|--------------------------------------------------------------------------
*/

const allowedMimeTypes =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/json",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/zip",
    "application/x-zip-compressed",
  ]);

/*
|--------------------------------------------------------------------------
| MEMORY STORAGE
|--------------------------------------------------------------------------
|
| Files are kept in memory only long enough
| for the controller to upload file.buffer
| to Cloudflare R2.
|
*/

const storage =
  multer.memoryStorage();

function fileFilter(
  _request: Express.Request,
  file: Express.Multer.File,
  callback:
    multer.FileFilterCallback
) {
  if (
    !allowedMimeTypes.has(
      file.mimetype
    )
  ) {
    callback(
      new AppError(
        "This file type is not allowed.",
        400,
        "INVALID_FILE_TYPE"
      )
    );

    return;
  }

  callback(
    null,
    true
  );
}

export const taskUpload =
  multer({
    storage,

    fileFilter,

    limits: {
      files: 1,

      fileSize:
        10 *
        1024 *
        1024,
    },
  });
