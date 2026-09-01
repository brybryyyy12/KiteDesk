import {
  randomUUID,
} from "node:crypto";

import {
  pipeline,
} from "node:stream/promises";

import type {
  Request,
  Response,
} from "express";

import {
  z,
} from "zod";

import {
  prisma,
} from "../config/prisma.js";

import {
  deleteR2Object,
  getR2Object,
  uploadR2Object,
} from "../services/r2.service.js";

import {
  AppError,
} from "../utils/AppError.js";

const attachmentParamsSchema =
  z.object({
    workspaceId:
      z.string().uuid(),

    projectId:
      z.string().uuid(),

    taskId:
      z.string().uuid(),

    attachmentId:
      z
        .string()
        .uuid(
          "Invalid attachment ID."
        ),
  });

export async function getTaskAttachments(
  request: Request,
  response: Response
) {
  const task =
    request.task;

  const workspace =
    request.workspace;

  const project =
    request.project;

  if (
    !task ||
    !workspace ||
    !project
  ) {
    throw new AppError(
      "Task context is missing.",
      500
    );
  }

  const attachments =
    await prisma.attachment.findMany({
      where: {
        taskId:
          task.id,
      },

      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },

      orderBy: {
        createdAt:
          "desc",
      },
    });

  response.json({
    success: true,

    data: {
      attachments:
        attachments.map(
          (attachment) =>
            mapAttachment(
              workspace.id,
              project.id,
              task.id,
              attachment
            )
        ),
    },
  });
}

export async function uploadTaskAttachment(
  request: Request,
  response: Response
) {
  const task =
    request.task;

  const project =
    request.project;

  const workspace =
    request.workspace;

  const actor =
    request.user;

  const file =
    request.file;

  if (
    !task ||
    !project ||
    !workspace ||
    !actor
  ) {
    throw new AppError(
      "Task context is missing.",
      500
    );
  }

  if (
    !file
  ) {
    throw new AppError(
      "Select a file to upload.",
      400,
      "FILE_REQUIRED"
    );
  }

  const objectKey =
    [
      "workspaces",
      workspace.id,
      "projects",
      project.id,
      "tasks",
      task.id,
      randomUUID(),
    ].join("/");

  await uploadR2Object({
    key:
      objectKey,

    body:
      file.buffer,

    contentType:
      file.mimetype,
  });

  try {
    const attachment =
      await prisma.$transaction(
        async (tx) => {
          const created =
            await tx.attachment.create({
              data: {
                taskId:
                  task.id,

                uploadedById:
                  actor.id,

                fileName:
                  file.originalname,

                fileUrl:
                  objectKey,

                mimeType:
                  file.mimetype,

                fileSize:
                  file.size,
              },

              include: {
                uploadedBy: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            });

          await tx.activityLog.create({
            data: {
              projectId:
                project.id,

              taskId:
                task.id,

              actorId:
                actor.id,

              type:
                "ATTACHMENT_ADDED",

              message:
                `${actor.name} attached "${file.originalname}".`,
            },
          });

          return created;
        }
      );

    response
      .status(201)
      .json({
        success: true,

        message:
          "Attachment uploaded successfully.",

        data: {
          attachment:
            mapAttachment(
              workspace.id,
              project.id,
              task.id,
              attachment
            ),
        },
      });
  } catch (error) {
    await safeDeleteR2Object(
      objectKey
    );

    throw error;
  }
}

export async function downloadTaskAttachment(
  request: Request,
  response: Response
) {
  const task =
    request.task;

  if (
    !task
  ) {
    throw new AppError(
      "Task context is missing.",
      500
    );
  }

  const {
    attachmentId,
  } =
    attachmentParamsSchema.parse(
      request.params
    );

  const attachment =
    await prisma.attachment.findFirst({
      where: {
        id:
          attachmentId,

        taskId:
          task.id,
      },
    });

  if (
    !attachment
  ) {
    throw new AppError(
      "Attachment not found.",
      404,
      "ATTACHMENT_NOT_FOUND"
    );
  }

  const storedObject =
    await getR2Object(
      attachment.fileUrl
    );

  response.setHeader(
    "Content-Type",
    attachment.mimeType
  );

  response.setHeader(
    "Content-Length",
    String(
      storedObject.contentLength ??
        attachment.fileSize
    )
  );

  response.setHeader(
    "Content-Disposition",
    createAttachmentDisposition(
      attachment.fileName
    )
  );

  response.setHeader(
    "Cache-Control",
    "private, no-store"
  );

  try {
    await pipeline(
      storedObject.body,
      response
    );
  } catch (error) {
    console.error(
      "Attachment stream failed:",
      error
    );

    if (
      !response.headersSent
    ) {
      throw new AppError(
        "The attachment could not be downloaded.",
        502,
        "ATTACHMENT_STREAM_FAILED"
      );
    }

    response.destroy();
  }
}

function mapAttachment(
  workspaceId: string,
  projectId: string,
  taskId: string,
  attachment: {
    id: string;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    fileSize: number;
    createdAt: Date;

    uploadedBy: {
      id: string;
      name: string;
      email: string;
    };
  }
) {
  return {
    id:
      attachment.id,

    fileName:
      attachment.fileName,

    mimeType:
      attachment.mimeType,

    fileSize:
      attachment.fileSize,

    uploadedBy:
      attachment.uploadedBy,

    createdAt:
      attachment.createdAt,

    downloadUrl:
      `/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/attachments/${attachment.id}/file`,
  };
}

function createAttachmentDisposition(
  fileName: string
) {
  const asciiFallback =
    fileName
      .replace(
        /[\r\n"\\]/g,
        "_"
      )
      .replace(
        /[^\x20-\x7E]/g,
        "_"
      )
      .trim() ||
    "attachment";

  const encodedFileName =
    encodeURIComponent(
      fileName
    ).replace(
      /['()*]/g,
      (character) =>
        `%${character
          .charCodeAt(0)
          .toString(16)
          .toUpperCase()}`
    );

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFileName}`;
}

async function safeDeleteR2Object(
  objectKey: string
) {
  try {
    await deleteR2Object(
      objectKey
    );
  } catch {
    /*
     * Cleanup failure should not hide
     * the original application error.
     */
  }
}
