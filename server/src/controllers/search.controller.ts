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

const searchQuerySchema =
  z.object({
    q: z
      .string()
      .trim()
      .min(
        2,
        "Search query must contain at least 2 characters."
      )
      .max(
        100,
        "Search query cannot exceed 100 characters."
      ),
  });

export async function searchWorkspace(
  request: Request,
  response: Response
) {
  const workspace =
    request.workspace;

  const user =
    request.user;

  const membership =
    request.workspaceMembership;

  if (
    !workspace ||
    !user ||
    !membership
  ) {
    throw new AppError(
      "Workspace context is missing.",
      500
    );
  }

  const { q } =
    searchQuerySchema.parse(
      request.query
    );

  const accessibleProjectWhere = {
    workspaceId:
      workspace.id,
    archivedAt: null,

    ...(membership.role ===
      "MEMBER" && {
      members: {
        some: {
          userId:
            user.id,
        },
      },
    }),
  };

  const projects =
    await prisma.project.findMany({
      where: {
        ...accessibleProjectWhere,

        OR: [
          {
            name: {
              contains: q,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: q,
              mode: "insensitive",
            },
          },
        ],
      },

      select: {
        id: true,
        name: true,
        description: true,
        status: true,
      },

      orderBy: {
        updatedAt: "desc",
      },

      take: 8,
    });

  const tasks =
    await prisma.task.findMany({
      where: {
        project: {
          ...accessibleProjectWhere,
        },

        OR: [
          {
            title: {
              contains: q,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: q,
              mode: "insensitive",
            },
          },
        ],
      },

      select: {
        id: true,
        projectId: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        type: true,
        project: {
          select: {
            name: true,
          },
        },
      },

      orderBy: {
        updatedAt: "desc",
      },

      take: 8,
    });

  response.json({
    success: true,

    data: {
      query: q,
      projects,
      tasks,
    },
  });
}
