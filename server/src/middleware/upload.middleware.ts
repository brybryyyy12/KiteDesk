import {
  randomUUID,
} from "node:crypto";

import {
  mkdirSync,
} from "node:fs";

import path from "node:path";

import multer from "multer";

import {
  AppError,
} from "../utils/AppError.js";

/*
|--------------------------------------------------------------------------
| UPLOAD DIRECTORY
|--------------------------------------------------------------------------
|
| Files:
|
| server/uploads/tasks/
|
*/

export const TASK_UPLOAD_DIRECTORY =
  path.resolve(
    process.cwd(),
    "uploads",
    "tasks"
  );

mkdirSync(
  TASK_UPLOAD_DIRECTORY,
  {
    recursive: true,
  }
);

/*
|--------------------------------------------------------------------------
| ALLOWED FILE TYPES
|--------------------------------------------------------------------------
*/

const allowedMimeTypes =
  new Set([
    /*
     * Images
     */
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",

    /*
     * Documents
     */
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/json",

    /*
     * Microsoft Office
     */
    "application/msword",

    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    "application/vnd.ms-excel",

    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

    "application/vnd.ms-powerpoint",

    "application/vnd.openxmlformats-officedocument.presentationml.presentation",

    /*
     * Archives
     */
    "application/zip",
    "application/x-zip-compressed",
  ]);

/*
|--------------------------------------------------------------------------
| STORAGE
|--------------------------------------------------------------------------
*/

const storage =
  multer.diskStorage({
    destination: (
      _request,
      _file,
      callback
    ) => {
      callback(
        null,
        TASK_UPLOAD_DIRECTORY
      );
    },

    filename: (
      _request,
      file,
      callback
    ) => {
      const extension =
        path
          .extname(
            file.originalname
          )
          .toLowerCase();

      const fileName =
        `${randomUUID()}${extension}`;

      callback(
        null,
        fileName
      );
    },
  });

/*
|--------------------------------------------------------------------------
| FILE FILTER
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| MULTER
|--------------------------------------------------------------------------
|
| Maximum:
| 10 MB per file
|
*/

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