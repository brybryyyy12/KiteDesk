import type {
  NextFunction,
  Request,
  RequestHandler,
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

const workspaceParamsSchema =
  z.object({
    workspaceId: z
      .string()
      .uuid(
        "Invalid workspace ID."
      ),
  });

export async function requireWorkspaceMembership(
  request: Request,
  _response: Response,
  next: NextFunction
) {
  if (!request.user) {
    throw new AppError(
      "Authentication required.",
      401,
      "UNAUTHENTICATED"
    );
  }

  const {
    workspaceId,
  } =
    workspaceParamsSchema.parse(
      request.params
    );

  const membership =
    await prisma.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId:
            request.user.id,
        },
      },

      include: {
        workspace: true,
      },
    });

  /*
   * Don't reveal whether the
   * workspace exists to users
   * who aren't members.
   */
  if (!membership) {
    throw new AppError(
      "Workspace not found or you do not have access to it.",
      404,
      "WORKSPACE_NOT_FOUND"
    );
  }

  request.workspace = {
    id:
      membership.workspace.id,

    name:
      membership.workspace.name,

    slug:
      membership.workspace.slug,

    description:
      membership.workspace
        .description,

    createdById:
      membership.workspace
        .createdById,

    createdAt:
      membership.workspace
        .createdAt,

    updatedAt:
      membership.workspace
        .updatedAt,
  };

  request.workspaceMembership =
    {
      id:
        membership.id,

      workspaceId:
        membership.workspaceId,

      userId:
        membership.userId,

      role:
        membership.role,

      joinedAt:
        membership.joinedAt,
    };

  next();
}

type AllowedRole =
  | "OWNER"
  | "MANAGER"
  | "MEMBER";

export function requireWorkspaceRole(
  ...allowedRoles: AllowedRole[]
): RequestHandler {
  return (
    request,
    _response,
    next
  ) => {
    const membership =
      request.workspaceMembership;

    if (!membership) {
      next(
        new AppError(
          "Workspace membership is required.",
          403,
          "WORKSPACE_ACCESS_REQUIRED"
        )
      );

      return;
    }

    if (
      !allowedRoles.includes(
        membership.role
      )
    ) {
      next(
        new AppError(
          "You do not have permission to perform this action.",
          403,
          "INSUFFICIENT_WORKSPACE_PERMISSION"
        )
      );

      return;
    }

    next();
  };
}