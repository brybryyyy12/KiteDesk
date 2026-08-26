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

const projectParamsSchema =
  z.object({
    workspaceId: z
      .string()
      .uuid(
        "Invalid workspace ID."
      ),

    projectId: z
      .string()
      .uuid(
        "Invalid project ID."
      ),
  });

export async function requireProjectAccess(
  request: Request,
  _response: Response,
  next: NextFunction
) {
  if (
    !request.user ||
    !request.workspaceMembership
  ) {
    throw new AppError(
      "Workspace access is required.",
      403,
      "WORKSPACE_ACCESS_REQUIRED"
    );
  }

  const {
    workspaceId,
    projectId,
  } =
    projectParamsSchema.parse(
      request.params
    );

  /*
   * Project must belong to the
   * workspace in the URL.
   */
  const project =
    await prisma.project.findFirst({
      where: {
        id:
          projectId,

        workspaceId,
      },
    });

  if (!project) {
    throw new AppError(
      "Project not found.",
      404,
      "PROJECT_NOT_FOUND"
    );
  }

  const projectMembership =
    await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId:
            project.id,

          userId:
            request.user.id,
        },
      },
    });

  /*
   * OWNER and MANAGER have
   * workspace-wide project access.
   *
   * MEMBER must explicitly belong to
   * this project.
   */
  if (
    request.workspaceMembership
      .role === "MEMBER" &&
    !projectMembership
  ) {
    /*
     * Return 404 rather than
     * revealing that another
     * inaccessible project exists.
     */
    throw new AppError(
      "Project not found or you do not have access to it.",
      404,
      "PROJECT_NOT_FOUND"
    );
  }

  request.project = {
    id:
      project.id,

    workspaceId:
      project.workspaceId,

    name:
      project.name,

    description:
      project.description,

    status:
      project.status,

    deadline:
      project.deadline,

    createdById:
      project.createdById,

    createdAt:
      project.createdAt,

    updatedAt:
      project.updatedAt,
  };

  request.projectMembership =
    projectMembership
      ? {
          id:
            projectMembership.id,

          projectId:
            projectMembership
              .projectId,

          userId:
            projectMembership
              .userId,

          addedById:
            projectMembership
              .addedById,

          addedAt:
            projectMembership
              .addedAt,
        }
      : null;

  next();
}