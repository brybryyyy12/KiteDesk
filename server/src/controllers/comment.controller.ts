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
  AppError,
} from "../utils/AppError.js";

import {
  createNotification,
} from "../services/notification.service.js";

/*
|--------------------------------------------------------------------------
| VALIDATION
|--------------------------------------------------------------------------
*/

const createCommentSchema =
  z.object({
    content: z
      .string()
      .trim()
      .min(
        1,
        "Comment cannot be empty."
      )
      .max(
        10000,
        "Comment is too long."
      ),
  });

/*
|--------------------------------------------------------------------------
| GET COMMENTS
|--------------------------------------------------------------------------
*/

export async function getTaskComments(
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

  const comments =
    await prisma.comment.findMany({
      where: {
        taskId:
          task.id,
      },

      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            jobTitle: true,
          },
        },
      },

      orderBy: {
        createdAt:
          "asc",
      },
    });

  response.json({
    success: true,

    data: {
      comments:
        comments.map(
          (comment) => ({
            id:
              comment.id,

            content:
              comment.content,

            author:
              comment.author,

            createdAt:
              comment.createdAt,

            updatedAt:
              comment.updatedAt,
          })
        ),
    },
  });
}

/*
|--------------------------------------------------------------------------
| ADD COMMENT
|--------------------------------------------------------------------------
|
| Any user with project access can
| comment on the task.
|
*/

export async function createTaskComment(
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

  const data =
    createCommentSchema.parse(
      request.body
    );

  const comment =
    await prisma.$transaction(
      async (tx) => {
        const created =
          await tx.comment.create({
            data: {
              taskId:
                task.id,

              authorId:
                actor.id,

              content:
                data.content,
            },

            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  jobTitle: true,
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
              "COMMENT_ADDED",

            message:
              `${actor.name} added a comment.`,
          },
        });

        return created;
      }
    );

  /*
   * Notify the task assignee.
   *
   * createNotification() already
   * prevents self-notifications.
   */
  if (task.assigneeId) {
    await createNotification({
      workspaceId:
        workspace.id,

      userId:
        task.assigneeId,

      type:
        "COMMENT",

      title:
        "New task comment",

      message:
        `${actor.name} commented on "${task.title}".`,

      projectId:
        project.id,

      taskId:
        task.id,

      actorId:
        actor.id,
    });
  }

  response
    .status(201)
    .json({
      success: true,

      message:
        "Comment added successfully.",

      data: {
        comment: {
          id:
            comment.id,

          content:
            comment.content,

          author:
            comment.author,

          createdAt:
            comment.createdAt,

          updatedAt:
            comment.updatedAt,
        },
      },
    });
}