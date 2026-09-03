import type {
  NextFunction,
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
  AppError,
} from "../utils/AppError.js";

const taskParamsSchema =
  z.object({
    workspaceId:
      z.string().uuid(),

    projectId:
      z.string().uuid(),

    taskId: z
      .string()
      .uuid(
        "Invalid task ID."
      ),
  });

export async function requireTask(
  request: Request,
  _response: Response,
  next: NextFunction
) {
  const project =
    request.project;

  if (!project) {
    throw new AppError(
      "Project access is required.",
      403,
      "PROJECT_ACCESS_REQUIRED"
    );
  }

  const {
    projectId,
    taskId,
  } =
    taskParamsSchema.parse(
      request.params
    );

  if (
    project.id !==
    projectId
  ) {
    throw new AppError(
      "Project context mismatch.",
      400
    );
  }

  const task =
    await prisma.task.findFirst({
      where: {
        id:
          taskId,

        projectId:
          project.id,
      },
    });

  if (!task) {
    throw new AppError(
      "Task not found.",
      404,
      "TASK_NOT_FOUND"
    );
  }

  request.task = {
    id:
      task.id,

    projectId:
      task.projectId,

    title:
      task.title,

    description:
      task.description,

    type:
      task.type,

    priority:
      task.priority,

    status:
      task.status,

    assigneeId:
      task.assigneeId,

    createdById:
      task.createdById,

    dueDate:
      task.dueDate,

    createdAt:
      task.createdAt,

    updatedAt:
      task.updatedAt,

    parentTaskId:
      task.parentTaskId,
  };

  next();
}
