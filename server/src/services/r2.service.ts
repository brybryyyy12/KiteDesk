import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import {
  Readable,
} from "node:stream";

import {
  env,
} from "../config/env.js";

import {
  AppError,
} from "../utils/AppError.js";

const r2Client =
  new S3Client({
    region:
      "auto",

    endpoint:
      `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,

    credentials: {
      accessKeyId:
        env.R2_ACCESS_KEY_ID,

      secretAccessKey:
        env.R2_SECRET_ACCESS_KEY,
    },
  });

type UploadR2ObjectInput = {
  key: string;
  body: Buffer;
  contentType: string;
};

export async function uploadR2Object(
  input:
    UploadR2ObjectInput
) {
  try {
    await r2Client.send(
      new PutObjectCommand({
        Bucket:
          env.R2_BUCKET_NAME,

        Key:
          input.key,

        Body:
          input.body,

        ContentType:
          input.contentType,

        ContentLength:
          input.body.length,
      })
    );
  } catch (error) {
    console.error(
      "R2 attachment upload failed:",
      error
    );

    throw new AppError(
      "The attachment could not be stored.",
      502,
      "ATTACHMENT_STORAGE_UPLOAD_FAILED"
    );
  }
}

export async function getR2Object(
  key: string
) {
  try {
    const result =
      await r2Client.send(
        new GetObjectCommand({
          Bucket:
            env.R2_BUCKET_NAME,

          Key:
            key,
        })
      );

    if (
      !result.Body ||
      !(
        result.Body instanceof
        Readable
      )
    ) {
      throw new AppError(
        "The attachment file is missing from storage.",
        404,
        "ATTACHMENT_FILE_MISSING"
      );
    }

    return {
      body:
        result.Body,

      contentLength:
        result.ContentLength,

      contentType:
        result.ContentType,
    };
  } catch (error) {
    if (
      error instanceof
      AppError
    ) {
      throw error;
    }

    const storageError =
      error as {
        name?: string;
        $metadata?: {
          httpStatusCode?: number;
        };
      };

    if (
      storageError.name ===
        "NoSuchKey" ||
      storageError.name ===
        "NotFound" ||
      storageError.$metadata
        ?.httpStatusCode ===
        404
    ) {
      throw new AppError(
        "The attachment file is missing from storage.",
        404,
        "ATTACHMENT_FILE_MISSING"
      );
    }

    console.error(
      "R2 attachment download failed:",
      error
    );

    throw new AppError(
      "The attachment could not be retrieved from storage.",
      502,
      "ATTACHMENT_STORAGE_READ_FAILED"
    );
  }
}

export async function deleteR2Object(
  key: string
) {
  try {
    await r2Client.send(
      new DeleteObjectCommand({
        Bucket:
          env.R2_BUCKET_NAME,

        Key:
          key,
      })
    );
  } catch (error) {
    console.error(
      "R2 attachment delete failed:",
      error
    );

    throw new AppError(
      "The attachment could not be removed from storage.",
      502,
      "ATTACHMENT_STORAGE_DELETE_FAILED"
    );
  }
}
