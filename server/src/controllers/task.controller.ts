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
  canTransitionTask,
} from "../lib/task-policy.js";

import {
  createNotification,
} from "../services/notification.service.js";

/*
|--------------------------------------------------------------------------
| VALIDATION
|--------------------------------------------------------------------------
*/

const dateSchema =
  z
    .string()
    .trim()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Date must use YYYY-MM-DD format."
    );

const createTaskSchema =
  z.object({
    title: z
      .string()
      .trim()
      .min(
        2,
        "Task title must contain at least 2 characters."
      )
      .max(
        200,
        "Task title is too long."
      ),

    description: z
      .string()
      .trim()
      .max(20000)
      .optional()
      .nullable(),

    type: z
      .enum([
        "TASK",
        "FEATURE",
        "BUG",
      ])
      .default("TASK"),

    priority: z
      .enum([
        "LOW",
        "MEDIUM",
        "HIGH",
        "URGENT",
      ])
      .default("MEDIUM"),

    assigneeId: z
      .string()
      .uuid(
        "Invalid assignee ID."
      )
      .nullable()
      .optional(),

    dueDate:
      dateSchema
        .nullable()
        .optional(),
  });

const updateTaskSchema =
  z
    .object({
      title: z
        .string()
        .trim()
        .min(2)
        .max(200)
        .optional(),

      description: z
        .string()
        .trim()
        .max(20000)
        .nullable()
        .optional(),

      type: z
        .enum([
          "TASK",
          "FEATURE",
          "BUG",
        ])
        .optional(),

      priority: z
        .enum([
          "LOW",
          "MEDIUM",
          "HIGH",
          "URGENT",
        ])
        .optional(),

      assigneeId: z
        .string()
        .uuid(
          "Invalid assignee ID."
        )
        .nullable()
        .optional(),

      dueDate:
        dateSchema
          .nullable()
          .optional(),

      labelIds: z.array(z.string().uuid("Invalid label ID.")).max(20).optional(),
    })
    .refine(
      (data) =>
        Object.keys(data)
          .length > 0,
      {
        message:
          "Provide at least one field to update.",
      }
    );

const updateStatusSchema =
  z.object({
    status: z.enum([
      "TODO",
      "IN_PROGRESS",
      "REVIEW",
      "DONE",
    ]),

    feedback: z
      .string()
      .trim()
      .max(5000)
      .optional()
      .nullable(),
  });

const listTasksQuerySchema =
  z.object({
    status: z
      .enum([
        "TODO",
        "IN_PROGRESS",
        "REVIEW",
        "DONE",
      ])
      .optional(),

    priority: z
      .enum([
        "LOW",
        "MEDIUM",
        "HIGH",
        "URGENT",
      ])
      .optional(),

    type: z
      .enum([
        "TASK",
        "FEATURE",
        "BUG",
      ])
      .optional(),

    assigneeId:
      z.string()
        .uuid()
        .optional(),

    mine: z
      .enum([
        "true",
        "false",
      ])
      .optional(),

    search: z
      .string()
      .trim()
      .max(200)
      .optional(),
  });

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function toDateOnly(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return null;
  }

  return new Date(
    `${value}T00:00:00.000Z`
  );
}

function formatDateOnly(
  value:
    | Date
    | null
) {
  if (!value) {
    return null;
  }

  return value
    .toISOString()
    .slice(0, 10);
}

async function assertProjectMember(
  projectId: string,
  userId: string
) {
  const member =
    await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },

      select: {
        id: true,
      },
    });

  if (!member) {
    throw new AppError(
      "The selected assignee is not a member of this project.",
      400,
      "INVALID_TASK_ASSIGNEE"
    );
  }
}

/*
|--------------------------------------------------------------------------
| CREATE TASK
|--------------------------------------------------------------------------
|
| OWNER / MANAGER only.
|
| Tasks always begin in TODO.
|
*/

export async function createTask(
  request: Request,
  response: Response
) {
  const project =
    request.project;

  const workspace =
    request.workspace;

  const actor =
    request.user;

  if (
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
    createTaskSchema.parse(
      request.body
    );

  if (data.assigneeId) {
    await assertProjectMember(
      project.id,
      data.assigneeId
    );
  }

  const task =
    await prisma.$transaction(
      async (tx) => {
        const created =
          await tx.task.create({
            data: {
              projectId:
                project.id,

              title:
                data.title,

              description:
                data.description ||
                null,

              type:
                data.type,

              priority:
                data.priority,

              status:
                "TODO",

              assigneeId:
                data.assigneeId ??
                null,

              createdById:
                actor.id,

              dueDate:
                toDateOnly(
                  data.dueDate
                ),
            },
          });

        await tx.activityLog.create({
          data: {
            projectId:
              project.id,

            taskId:
              created.id,

            actorId:
              actor.id,

            type:
              "TASK_CREATED",

            message:
              `${actor.name} created the task "${created.title}".`,
          },
        });

        if (
          created.assigneeId
        ) {
          await tx.activityLog.create({
            data: {
              projectId:
                project.id,

              taskId:
                created.id,

              actorId:
                actor.id,

              type:
                "TASK_ASSIGNED",

              message:
                `${actor.name} assigned the task.`,
            },
          });
        }

        return created;
      }
    );

  /*
   * Notification after successful
   * database transaction.
   */
  if (task.assigneeId) {
    await createNotification({
      workspaceId:
        workspace.id,

      userId:
        task.assigneeId,

      type:
        "TASK_ASSIGNED",

      title:
        "New task assigned",

      message:
        `${actor.name} assigned you "${task.title}" in ${project.name}.`,

      projectId:
        project.id,

      taskId:
        task.id,

      actorId:
        actor.id,
    });
  }

  const detailedTask =
    await getTaskDetails(
      task.id
    );

  response
    .status(201)
    .json({
      success: true,

      message:
        "Task created successfully.",

      data: {
        task:
          detailedTask,
      },
    });
}

/*
|--------------------------------------------------------------------------
| LIST TASKS
|--------------------------------------------------------------------------
*/

export async function getTasks(
  request: Request,
  response: Response
) {
  const project =
    request.project;

  const user =
    request.user;

  if (
    !project ||
    !user
  ) {
    throw new AppError(
      "Project context is missing.",
      500
    );
  }

  const query =
    listTasksQuerySchema.parse(
      request.query
    );

  const tasks =
    await prisma.task.findMany({
      where: {
        projectId:
          project.id,

        ...(query.status && {
          status:
            query.status,
        }),

        ...(query.priority && {
          priority:
            query.priority,
        }),

        ...(query.type && {
          type:
            query.type,
        }),

        ...(query.assigneeId && {
          assigneeId:
            query.assigneeId,
        }),

        ...(query.mine ===
          "true" && {
          assigneeId:
            user.id,
        }),

        ...(query.search && {
          OR: [
            {
              title: {
                contains:
                  query.search,

                mode:
                  "insensitive",
              },
            },

            {
              description: {
                contains:
                  query.search,

                mode:
                  "insensitive",
              },
            },
          ],
        }),
      },

      include: {
        labels: {
          select: { label: { select: { id: true, name: true, color: true } } },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            jobTitle: true,
          },
        },

        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },

        _count: {
          select: {
            comments: true,
            attachments: true,
          },
        },
      },

      orderBy: [
        {
          status: "asc",
        },

        {
          dueDate: "asc",
        },

        {
          createdAt: "desc",
        },
      ],
    });

  response.json({
    success: true,

    data: {
      tasks:
        tasks.map(
          (task) => ({
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

            assignee:
              task.assignee,

            createdBy:
              task.createdBy,

            dueDate:
              formatDateOnly(
                task.dueDate
              ),

            commentCount:
              task._count
                .comments,

            attachmentCount:
              task._count
                .attachments,

            labels: task.labels.map((item) => item.label),

            createdAt:
              task.createdAt,

            updatedAt:
              task.updatedAt,
          })
        ),
    },
  });
}

/*
|--------------------------------------------------------------------------
| GET TASK
|--------------------------------------------------------------------------
*/

export async function getTask(
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

  const detailedTask =
    await getTaskDetails(
      task.id
    );

  if (!detailedTask) {
    throw new AppError(
      "Task not found.",
      404,
      "TASK_NOT_FOUND"
    );
  }

  response.json({
    success: true,

    data: {
      task:
        detailedTask,
    },
  });
}

/*
|--------------------------------------------------------------------------
| UPDATE TASK DETAILS
|--------------------------------------------------------------------------
|
| OWNER / MANAGER only.
|
| Status is intentionally NOT edited
| here. Status has its own workflow
| endpoint.
|
*/

export async function updateTask(
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
    updateTaskSchema.parse(
      request.body
    );

  if (
    data.assigneeId
  ) {
    await assertProjectMember(
      project.id,
      data.assigneeId
    );
  }

  const oldAssigneeId =
    task.assigneeId;

  if (data.labelIds) {
    const labelCount = await prisma.label.count({
      where: { id: { in: data.labelIds }, workspaceId: workspace.id },
    });
    if (labelCount !== new Set(data.labelIds).size) {
      throw new AppError("One or more labels do not belong to this workspace.", 400, "INVALID_TASK_LABEL");
    }
  }

  const assigneeChanged =
    data.assigneeId !==
      undefined &&
    data.assigneeId !==
      oldAssigneeId;

  const priorityChanged =
    data.priority !==
      undefined &&
    data.priority !==
      task.priority;

  const otherFieldsChanged =
    data.title !==
      undefined ||
    data.description !==
      undefined ||
    data.type !==
      undefined ||
    data.dueDate !==
      undefined ||
    data.labelIds !==
      undefined;

  await prisma.$transaction(
    async (tx) => {
      await tx.task.update({
        where: {
          id:
            task.id,
        },

        data: {
          ...(data.title !==
            undefined && {
            title:
              data.title,
          }),

          ...(data.description !==
            undefined && {
            description:
              data.description ||
              null,
          }),

          ...(data.type !==
            undefined && {
            type:
              data.type,
          }),

          ...(data.priority !==
            undefined && {
            priority:
              data.priority,
          }),

          ...(data.assigneeId !==
            undefined && {
            assigneeId:
              data.assigneeId,
          }),

          ...(data.dueDate !==
            undefined && {
            dueDate:
              toDateOnly(
                data.dueDate
              ),
          }),

          ...(data.labelIds !== undefined && {
            labels: {
              deleteMany: {},
              create: [...new Set(data.labelIds)].map((labelId) => ({ labelId })),
            },
          }),
        },
      });

      if (assigneeChanged) {
        if (
          data.assigneeId ===
          null
        ) {
          await tx.activityLog.create({
            data: {
              projectId:
                project.id,

              taskId:
                task.id,

              actorId:
                actor.id,

              type:
                "TASK_UNASSIGNED",

              message:
                `${actor.name} unassigned the task.`,
            },
          });
        } else {
          await tx.activityLog.create({
            data: {
              projectId:
                project.id,

              taskId:
                task.id,

              actorId:
                actor.id,

              type:
                "TASK_ASSIGNED",

              message:
                oldAssigneeId
                  ? `${actor.name} reassigned the task.`
                  : `${actor.name} assigned the task.`,
            },
          });
        }
      }

      if (priorityChanged) {
        await tx.activityLog.create({
          data: {
            projectId:
              project.id,

            taskId:
              task.id,

            actorId:
              actor.id,

            type:
              "TASK_PRIORITY_CHANGED",

            message:
              `${actor.name} changed the task priority from ${task.priority} to ${data.priority}.`,

            metadata: {
              from:
                task.priority,

              to:
                data.priority,
            },
          },
        });
      }

      if (otherFieldsChanged) {
        await tx.activityLog.create({
          data: {
            projectId:
              project.id,

            taskId:
              task.id,

            actorId:
              actor.id,

            type:
              "TASK_UPDATED",

            message:
              `${actor.name} updated the task.`,
          },
        });
      }
    }
  );

  /*
   * Notify newly assigned user.
   */
  if (
    assigneeChanged &&
    data.assigneeId
  ) {
    await createNotification({
      workspaceId:
        workspace.id,

      userId:
        data.assigneeId,

      type:
        oldAssigneeId
          ? "TASK_REASSIGNED"
          : "TASK_ASSIGNED",

      title:
        oldAssigneeId
          ? "Task reassigned to you"
          : "New task assigned",

      message:
        `${actor.name} assigned you "${task.title}" in ${project.name}.`,

      projectId:
        project.id,

      taskId:
        task.id,

      actorId:
        actor.id,
    });
  }

  const updated =
    await getTaskDetails(
      task.id
    );

  response.json({
    success: true,

    message:
      "Task updated successfully.",

    data: {
      task:
        updated,
    },
  });
}

/*
|--------------------------------------------------------------------------
| UPDATE TASK STATUS
|--------------------------------------------------------------------------
|
| This is where KiteDesk's workflow
| is enforced.
|
*/

export async function updateTaskStatus(
  request: Request,
  response: Response
) {
  const task =
    request.task;

  const workspace =
    request.workspace;

  const project =
    request.project;

  const membership =
    request.workspaceMembership;

  const actor =
    request.user;

  if (
    !task ||
    !workspace ||
    !project ||
    !membership ||
    !actor
  ) {
    throw new AppError(
      "Task context is missing.",
      500
    );
  }

  const data =
    updateStatusSchema.parse(
      request.body
    );

  /*
   * Same status = no work required.
   */
  if (
    data.status ===
    task.status
  ) {
    const current =
      await getTaskDetails(
        task.id
      );

    response.json({
      success: true,

      message:
        "Task already has this status.",

      data: {
        task:
          current,
      },
    });

    return;
  }

  const isAssignee =
    task.assigneeId ===
    actor.id;

  const allowed =
    canTransitionTask({
      role:
        membership.role,

      isAssignee,

      currentStatus:
        task.status,

      nextStatus:
        data.status,
    });

  if (!allowed) {
    throw new AppError(
      "You are not allowed to make this task status transition.",
      403,
      "INVALID_TASK_TRANSITION",
      {
        currentStatus:
          task.status,

        requestedStatus:
          data.status,
      }
    );
  }

  /*
   * Determine the semantic event.
   */
  let activityType:
    | "TASK_STATUS_CHANGED"
    | "TASK_SUBMITTED_FOR_REVIEW"
    | "TASK_APPROVED"
    | "CHANGES_REQUESTED" =
      "TASK_STATUS_CHANGED";

  let activityMessage =
    `${actor.name} changed the task status from ${task.status} to ${data.status}.`;

  if (
    task.status ===
      "IN_PROGRESS" &&
    data.status ===
      "REVIEW"
  ) {
    activityType =
      "TASK_SUBMITTED_FOR_REVIEW";

    activityMessage =
      `${actor.name} submitted the task for review.`;
  }

  if (
    task.status ===
      "REVIEW" &&
    data.status ===
      "DONE"
  ) {
    activityType =
      "TASK_APPROVED";

    activityMessage =
      `${actor.name} approved the task.`;
  }

  if (
    task.status ===
      "REVIEW" &&
    data.status ===
      "IN_PROGRESS"
  ) {
    activityType =
      "CHANGES_REQUESTED";

    activityMessage =
      `${actor.name} requested changes on the task.`;
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.task.update({
        where: {
          id:
            task.id,
        },

        data: {
          status:
            data.status,
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
            activityType,

          message:
            activityMessage,

          metadata: {
            from:
              task.status,

            to:
              data.status,

            ...(data.feedback && {
              feedback:
                data.feedback,
            }),
          },
        },
      });
    }
  );

  /*
   * Submitted for review:
   *
   * notify workspace owners/managers.
   */
  if (
    task.status ===
      "IN_PROGRESS" &&
    data.status ===
      "REVIEW"
  ) {
    const reviewers =
      await prisma.workspaceMembership.findMany({
        where: {
          workspaceId:
            workspace.id,

          role: {
            in: [
              "OWNER",
              "MANAGER",
            ],
          },
        },

        select: {
          userId: true,
        },
      });

    await Promise.all(
      reviewers.map(
        (reviewer) =>
          createNotification({
            workspaceId:
              workspace.id,

            userId:
              reviewer.userId,

            type:
              "TASK_REVIEW",

            title:
              "Task ready for review",

            message:
              `${actor.name} submitted "${task.title}" for review in ${project.name}.`,

            projectId:
              project.id,

            taskId:
              task.id,

            actorId:
              actor.id,
          })
      )
    );
  }

  /*
   * Approved:
   *
   * notify assignee.
   */
  if (
    task.status ===
      "REVIEW" &&
    data.status ===
      "DONE" &&
    task.assigneeId
  ) {
    await createNotification({
      workspaceId:
        workspace.id,

      userId:
        task.assigneeId,

      type:
        "TASK_APPROVED",

      title:
        "Task approved",

      message:
        `${actor.name} approved "${task.title}".`,

      projectId:
        project.id,

      taskId:
        task.id,

      actorId:
        actor.id,
    });
  }

  /*
   * Changes requested:
   *
   * notify assignee.
   */
  if (
    task.status ===
      "REVIEW" &&
    data.status ===
      "IN_PROGRESS" &&
    task.assigneeId
  ) {
    const feedbackText =
      data.feedback
        ? ` Feedback: ${data.feedback}`
        : "";

    await createNotification({
      workspaceId:
        workspace.id,

      userId:
        task.assigneeId,

      type:
        "CHANGES_REQUESTED",

      title:
        "Changes requested",

      message:
        `${actor.name} requested changes on "${task.title}".${feedbackText}`,

      projectId:
        project.id,

      taskId:
        task.id,

      actorId:
        actor.id,
    });
  }

  const updated =
    await getTaskDetails(
      task.id
    );

  response.json({
    success: true,

    message:
      getStatusMessage(
        task.status,
        data.status
      ),

    data: {
      task:
        updated,
    },
  });
}

/*
|--------------------------------------------------------------------------
| DELETE TASK
|--------------------------------------------------------------------------
|
| OWNER / MANAGER
|
*/

export async function deleteTask(
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

  await prisma.task.delete({
    where: {
      id:
        task.id,
    },
  });

  response.json({
    success: true,

    message:
      "Task deleted successfully.",
  });
}

/*
|--------------------------------------------------------------------------
| TASK DETAILS
|--------------------------------------------------------------------------
*/

async function getTaskDetails(
  taskId: string
) {
  const task =
    await prisma.task.findUnique({
      where: {
        id:
          taskId,
      },

      include: {
        labels: {
          select: { label: { select: { id: true, name: true, color: true } } },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            jobTitle: true,
          },
        },

        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },

          orderBy: {
            createdAt:
              "asc",
          },
        },

        attachments: {
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },

          orderBy: {
            createdAt:
              "desc",
          },
        },

        activities: {
          include: {
            actor: {
              select: {
                id: true,
                name: true,
              },
            },
          },

          orderBy: {
            createdAt:
              "desc",
          },

          take: 100,
        },
      },
    });

  if (!task) {
    return null;
  }

  return {
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

    assignee:
      task.assignee,

    createdBy:
      task.createdBy,

    dueDate:
      formatDateOnly(
        task.dueDate
      ),

    labels: task.labels.map((item) => item.label),

    createdAt:
      task.createdAt,

    updatedAt:
      task.updatedAt,

    comments:
      task.comments.map(
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

    attachments:
      task.attachments.map(
        (attachment) => ({
          id:
            attachment.id,

          fileName:
            attachment.fileName,

          fileUrl:
            attachment.fileUrl,

          mimeType:
            attachment.mimeType,

          fileSize:
            attachment.fileSize,

          uploadedBy:
            attachment.uploadedBy,

          createdAt:
            attachment.createdAt,
        })
      ),

    activity:
      task.activities.map(
        (activity) => ({
          id:
            activity.id,

          type:
            activity.type,

          message:
            activity.message,

          metadata:
            activity.metadata,

          actor:
            activity.actor,

          createdAt:
            activity.createdAt,
        })
      ),
  };
}

/*
|--------------------------------------------------------------------------
| STATUS RESPONSE MESSAGE
|--------------------------------------------------------------------------
*/

function getStatusMessage(
  previous:
    | "TODO"
    | "IN_PROGRESS"
    | "REVIEW"
    | "DONE",

  next:
    | "TODO"
    | "IN_PROGRESS"
    | "REVIEW"
    | "DONE"
) {
  if (
    previous ===
      "IN_PROGRESS" &&
    next ===
      "REVIEW"
  ) {
    return "Task submitted for review.";
  }

  if (
    previous ===
      "REVIEW" &&
    next ===
      "DONE"
  ) {
    return "Task approved successfully.";
  }

  if (
    previous ===
      "REVIEW" &&
    next ===
      "IN_PROGRESS"
  ) {
    return "Changes requested successfully.";
  }

  return "Task status updated successfully.";
}
