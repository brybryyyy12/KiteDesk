import {
  promises as fs,
} from "node:fs";

import path from "node:path";

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
  TASK_UPLOAD_DIRECTORY,
} from "../middleware/upload.middleware.js";

import {
  AppError,
} from "../utils/AppError.js";

/*
|--------------------------------------------------------------------------
| VALIDATION
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| GET ATTACHMENTS
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| UPLOAD ATTACHMENT
|--------------------------------------------------------------------------
*/

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
    /*
     * Remove uploaded file if somehow
     * context disappeared.
     */
    if (file) {
      await safeDeleteFile(
        file.path
      );
    }

    throw new AppError(
      "Task context is missing.",
      500
    );
  }

  if (!file) {
    throw new AppError(
      "Select a file to upload.",
      400,
      "FILE_REQUIRED"
    );
  }

  /*
   * Store a relative internal file
   * locator.
   *
   * We intentionally do NOT expose
   * this directory through
   * express.static.
   */
  const relativeFilePath =
    path.posix.join(
      "uploads",
      "tasks",
      file.filename
    );

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
                  relativeFilePath,

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
    /*
     * Database operation failed after
     * Multer saved the file.
     *
     * Remove the orphaned file.
     */
    await safeDeleteFile(
      file.path
    );

    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| DOWNLOAD ATTACHMENT
|--------------------------------------------------------------------------
|
| This route is protected by:
|
| requireAuth
| requireWorkspaceMembership
| requireProjectAccess
| requireTask
|
| so files are not publicly exposed.
|
*/

export async function downloadTaskAttachment(
  request: Request,
  response: Response
) {
  const task =
    request.task;

  if (!task) {
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

  if (!attachment) {
    throw new AppError(
      "Attachment not found.",
      404,
      "ATTACHMENT_NOT_FOUND"
    );
  }

  /*
   * We generate filenames ourselves,
   * but still resolve and verify the
   * path before reading from disk.
   */
  const absolutePath =
    path.resolve(
      process.cwd(),
      attachment.fileUrl
    );

  const normalizedUploadDirectory =
    `${TASK_UPLOAD_DIRECTORY}${path.sep}`;

  if (
    !absolutePath.startsWith(
      normalizedUploadDirectory
    )
  ) {
    throw new AppError(
      "Invalid attachment path.",
      500,
      "INVALID_ATTACHMENT_PATH"
    );
  }

  try {
    await fs.access(
      absolutePath
    );
  } catch {
    throw new AppError(
      "The attachment file is missing from storage.",
      404,
      "ATTACHMENT_FILE_MISSING"
    );
  }

  response.download(
    absolutePath,
    attachment.fileName
  );
}

/*
|--------------------------------------------------------------------------
| RESPONSE MAPPER
|--------------------------------------------------------------------------
*/

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

    /*
     * React should use this URL,
     * not the internal fileUrl.
     */
    downloadUrl:
      `/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/attachments/${attachment.id}/file`,
  };
}

/*
|--------------------------------------------------------------------------
| SAFE FILE CLEANUP
|--------------------------------------------------------------------------
*/

async function safeDeleteFile(
  filePath: string
) {
  try {
    await fs.unlink(
      filePath
    );
  } catch {
    /*
     * Cleanup failure shouldn't hide
     * the original application error.
     */
  }
}