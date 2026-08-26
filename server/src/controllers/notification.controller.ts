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

/*
|--------------------------------------------------------------------------
| VALIDATION
|--------------------------------------------------------------------------
*/

const notificationTypeSchema =
  z.enum([
    "TASK_ASSIGNED",
    "TASK_REASSIGNED",
    "TASK_REVIEW",
    "TASK_APPROVED",
    "CHANGES_REQUESTED",
    "COMMENT",
    "DUE_SOON",
    "OVERDUE",
    "PROJECT_ADDED",
    "PROJECT_REMOVED",
  ]);

const notificationListQuerySchema =
  z.object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20),

    filter: z
      .enum([
        "all",
        "unread",
        "read",
      ])
      .default("all"),

    type:
      notificationTypeSchema
        .optional(),

    search: z
      .string()
      .trim()
      .max(200)
      .optional(),
  });

const notificationParamsSchema =
  z.object({
    notificationId: z
      .string()
      .uuid(
        "Invalid notification ID."
      ),
  });

const updateReadSchema =
  z.object({
    isRead:
      z.boolean(),
  });

/*
|--------------------------------------------------------------------------
| LIST NOTIFICATIONS
|--------------------------------------------------------------------------
*/

export async function getNotifications(
  request: Request,
  response: Response
) {
  const user =
    request.user;

  if (!user) {
    throw new AppError(
      "Authentication required.",
      401,
      "UNAUTHENTICATED"
    );
  }

  const query =
    notificationListQuerySchema.parse(
      request.query
    );

  const skip =
    (query.page - 1) *
    query.limit;

  const where = {
    userId:
      user.id,

    ...(query.filter ===
      "unread" && {
      isRead: false,
    }),

    ...(query.filter ===
      "read" && {
      isRead: true,
    }),

    ...(query.type && {
      type:
        query.type,
    }),

    ...(query.search && {
      OR: [
        {
          title: {
            contains:
              query.search,

            mode:
              "insensitive" as const,
          },
        },

        {
          message: {
            contains:
              query.search,

            mode:
              "insensitive" as const,
          },
        },
      ],
    }),
  };

  const [
    notifications,
    total,
    unreadCount,
  ] =
    await prisma.$transaction([
      prisma.notification.findMany({
        where,

        include: {
          actor: {
            select: {
              id: true,
              name: true,
            },
          },

          project: {
            select: {
              id: true,
              name: true,
            },
          },

          task: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },

        orderBy: {
          createdAt:
            "desc",
        },

        skip,

        take:
          query.limit,
      }),

      prisma.notification.count({
        where,
      }),

      prisma.notification.count({
        where: {
          userId:
            user.id,

          isRead:
            false,
        },
      }),
    ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        total /
          query.limit
      )
    );

  response.json({
    success: true,

    data: {
      notifications:
        notifications.map(
          (notification) => ({
            id:
              notification.id,

            type:
              notification.type,

            title:
              notification.title,

            message:
              notification.message,

            isRead:
              notification.isRead,

            readAt:
              notification.readAt,

            createdAt:
              notification.createdAt,

            workspaceId:
              notification.workspaceId,

            projectId:
              notification.projectId,

            taskId:
              notification.taskId,

            actor:
              notification.actor,

            project:
              notification.project,

            task:
              notification.task,
          })
        ),

      unreadCount,

      pagination: {
        page:
          query.page,

        limit:
          query.limit,

        total,

        totalPages,

        hasNextPage:
          query.page <
          totalPages,

        hasPreviousPage:
          query.page > 1,
      },
    },
  });
}

/*
|--------------------------------------------------------------------------
| UNREAD COUNT
|--------------------------------------------------------------------------
*/

export async function getUnreadNotificationCount(
  request: Request,
  response: Response
) {
  const user =
    request.user;

  if (!user) {
    throw new AppError(
      "Authentication required.",
      401,
      "UNAUTHENTICATED"
    );
  }

  const unreadCount =
    await prisma.notification.count({
      where: {
        userId:
          user.id,

        isRead:
          false,
      },
    });

  response.json({
    success: true,

    data: {
      unreadCount,
    },
  });
}

/*
|--------------------------------------------------------------------------
| READ / UNREAD
|--------------------------------------------------------------------------
*/

export async function updateNotificationReadStatus(
  request: Request,
  response: Response
) {
  const user =
    request.user;

  if (!user) {
    throw new AppError(
      "Authentication required.",
      401,
      "UNAUTHENTICATED"
    );
  }

  const {
    notificationId,
  } =
    notificationParamsSchema.parse(
      request.params
    );

  const {
    isRead,
  } =
    updateReadSchema.parse(
      request.body
    );

  const notification =
    await prisma.notification.findFirst({
      where: {
        id:
          notificationId,

        userId:
          user.id,
      },

      select: {
        id: true,
      },
    });

  if (!notification) {
    throw new AppError(
      "Notification not found.",
      404,
      "NOTIFICATION_NOT_FOUND"
    );
  }

  const updated =
    await prisma.notification.update({
      where: {
        id:
          notification.id,
      },

      data: {
        isRead,

        readAt:
          isRead
            ? new Date()
            : null,
      },
    });

  response.json({
    success: true,

    message:
      isRead
        ? "Notification marked as read."
        : "Notification marked as unread.",

    data: {
      notification:
        updated,
    },
  });
}

/*
|--------------------------------------------------------------------------
| MARK ALL READ
|--------------------------------------------------------------------------
*/

export async function markAllNotificationsRead(
  request: Request,
  response: Response
) {
  const user =
    request.user;

  if (!user) {
    throw new AppError(
      "Authentication required.",
      401,
      "UNAUTHENTICATED"
    );
  }

  const now =
    new Date();

  const result =
    await prisma.notification.updateMany({
      where: {
        userId:
          user.id,

        isRead:
          false,
      },

      data: {
        isRead:
          true,

        readAt:
          now,
      },
    });

  response.json({
    success: true,

    message:
      "All notifications marked as read.",

    data: {
      updatedCount:
        result.count,
    },
  });
}

/*
|--------------------------------------------------------------------------
| DELETE ONE
|--------------------------------------------------------------------------
*/

export async function deleteNotification(
  request: Request,
  response: Response
) {
  const user =
    request.user;

  if (!user) {
    throw new AppError(
      "Authentication required.",
      401,
      "UNAUTHENTICATED"
    );
  }

  const {
    notificationId,
  } =
    notificationParamsSchema.parse(
      request.params
    );

  const notification =
    await prisma.notification.findFirst({
      where: {
        id:
          notificationId,

        userId:
          user.id,
      },

      select: {
        id: true,
      },
    });

  if (!notification) {
    throw new AppError(
      "Notification not found.",
      404,
      "NOTIFICATION_NOT_FOUND"
    );
  }

  await prisma.notification.delete({
    where: {
      id:
        notification.id,
    },
  });

  response.json({
    success: true,

    message:
      "Notification deleted successfully.",
  });
}

/*
|--------------------------------------------------------------------------
| CLEAR ALL
|--------------------------------------------------------------------------
*/

export async function clearNotifications(
  request: Request,
  response: Response
) {
  const user =
    request.user;

  if (!user) {
    throw new AppError(
      "Authentication required.",
      401,
      "UNAUTHENTICATED"
    );
  }

  const result =
    await prisma.notification.deleteMany({
      where: {
        userId:
          user.id,
      },
    });

  response.json({
    success: true,

    message:
      "Notifications cleared successfully.",

    data: {
      deletedCount:
        result.count,
    },
  });
}