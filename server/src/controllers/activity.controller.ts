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

const workspaceActivityParamsSchema =
  z.object({
    workspaceId: z
      .string()
      .uuid(
        "Invalid workspace ID."
      ),
  });

const workspaceActivityQuerySchema =
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
      .max(50)
      .default(20),
  });

/*
|--------------------------------------------------------------------------
| GET WORKSPACE ACTIVITY
|--------------------------------------------------------------------------
|
| OWNER / MANAGER:
|   Can see activity from every
|   project in the workspace.
|
| MEMBER:
|   Can only see activity from
|   projects they are a member of.
|
*/

export async function getWorkspaceActivity(
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
    workspaceId,
  } =
    workspaceActivityParamsSchema.parse(
      request.params
    );

  const query =
    workspaceActivityQuerySchema.parse(
      request.query
    );

  /*
   * Verify that the authenticated user
   * actually belongs to this workspace.
   */
  const membership =
    await prisma.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,

          userId:
            user.id,
        },
      },

      select: {
        id: true,

        role: true,
      },
    });

  if (!membership) {
    throw new AppError(
      "You do not have access to this workspace.",
      403,
      "WORKSPACE_ACCESS_DENIED"
    );
  }

  const skip =
    (query.page - 1) *
    query.limit;

  /*
   * OWNER / MANAGER:
   *   all workspace projects.
   *
   * MEMBER:
   *   only projects where they have
   *   a ProjectMember record.
   */
  const where = {
    project: {
      workspaceId,

      ...(membership.role ===
        "MEMBER" && {
        members: {
          some: {
            userId:
              user.id,
          },
        },
      }),
    },
  };

  /*
   * Intentionally sequential rather
   * than running concurrent queries.
   * This endpoint is small and this
   * also avoids unnecessary pressure
   * on a single database connection.
   */
  const activities =
    await prisma.activityLog.findMany({
      where,

      select: {
        id: true,

        type: true,

        message: true,

        metadata: true,

        createdAt: true,

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
    });

  const total =
    await prisma.activityLog.count({
      where,
    });

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
      activities,

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