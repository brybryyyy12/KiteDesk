import type {
  ErrorRequestHandler,
  RequestHandler,
} from "express";

import multer from "multer";

import {
  ZodError,
} from "zod";

import {
  AppError,
} from "../utils/AppError.js";

export const notFoundHandler:
  RequestHandler = (
    request,
    response
  ) => {
    response
      .status(404)
      .json({
        success: false,

        message:
          `Route ${request.method} ${request.originalUrl} not found`,
      });
  };

export const errorHandler:
  ErrorRequestHandler = (
    error,
    _request,
    response,
    _next
  ) => {
    /*
    |--------------------------------------------------------------------------
    | ZOD
    |--------------------------------------------------------------------------
    */

    if (
      error instanceof
      ZodError
    ) {
      response
        .status(400)
        .json({
          success: false,

          message:
            "Validation failed.",

          errors:
            error.issues.map(
              (issue) => ({
                field:
                  issue.path.join(
                    "."
                  ),

                message:
                  issue.message,
              })
            ),
        });

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | MULTER
    |--------------------------------------------------------------------------
    */

    if (
      error instanceof
      multer.MulterError
    ) {
      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {
        response
          .status(413)
          .json({
            success: false,

            message:
              "File is too large. Maximum upload size is 10 MB.",

            code:
              "FILE_TOO_LARGE",
          });

        return;
      }

      response
        .status(400)
        .json({
          success: false,

          message:
            error.message,

          code:
            error.code,
        });

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | APPLICATION ERROR
    |--------------------------------------------------------------------------
    */

    if (
      error instanceof
      AppError
    ) {
      response
        .status(
          error.statusCode
        )
        .json({
          success: false,

          message:
            error.message,

          code:
            error.code,

          details:
            error.details,
        });

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | UNKNOWN
    |--------------------------------------------------------------------------
    */

    console.error(
      "Unhandled server error:",
      error
    );

    response
      .status(500)
      .json({
        success: false,

        message:
          "Internal server error.",
      });
  };