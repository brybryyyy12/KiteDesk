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
  createUniqueWorkspaceSlug,
} from "../utils/slug.js";

/*
|--------------------------------------------------------------------------
| VALIDATION
|--------------------------------------------------------------------------
*/

const createWorkspaceSchema =
  z.object({
    name: z
      .string()
      .trim()
      .min(
        2,
        "Workspace name must contain at least 2 characters."
      )
      .max(
        120,
        "Workspace name is too long."
      ),

    description: z
      .string()
      .trim()
      .max(
        2000,
        "Workspace description is too long."
      )
      .optional()
      .nullable(),
  });

const updateWorkspaceSchema =
  z
    .object({
      name: z
        .string()
        .trim()
        .min(
          2,
          "Workspace name must contain at least 2 characters."
        )
        .max(
          120,
          "Workspace name is too long."
        )
        .optional(),

      description: z
        .string()
        .trim()
        .max(
          2000,
          "Workspace description is too long."
        )
        .nullable()
        .optional(),
    })
    .refine(
      (data) =>
        data.name !==
          undefined ||
        data.description !==
          undefined,
      {
        message:
          "Provide at least one field to update.",
      }
    );

/*
|--------------------------------------------------------------------------
| CREATE WORKSPACE
|--------------------------------------------------------------------------
|
| Creating a workspace must also make
| its creator an OWNER.
|
| Both operations happen in the same
| transaction.
|
*/

export async function createWorkspace(
  request: Request,
  response: Response
) {
  if (!request.user) {
    throw new AppError(
      "Authentication required.",
      401,
      "UNAUTHENTICATED"
    );
  }

  const data =
    createWorkspaceSchema.parse(
      request.body
    );

  const slug =
    await createUniqueWorkspaceSlug(
      data.name
    );

  const result =
    await prisma.$transaction(
      async (tx) => {
        const workspace =
          await tx.workspace.create({
            data: {
              name:
                data.name,

              slug,

              description:
                data.description ||
                null,

              createdById:
                request.user!.id,
            },
          });

        const membership =
          await tx.workspaceMembership.create({
            data: {
              workspaceId:
                workspace.id,

              userId:
                request.user!.id,

              role:
                "OWNER",
            },
          });

        return {
          workspace,
          membership,
        };
      }
    );

  response
    .status(201)
    .json({
      success: true,

      message:
        "Workspace created successfully.",

      data: {
        workspace: {
          ...result.workspace,

          role:
            result.membership
              .role,

          joinedAt:
            result.membership
              .joinedAt,

          memberCount: 1,

          projectCount: 0,
        },
      },
    });
}

/*
|--------------------------------------------------------------------------
| GET MY WORKSPACES
|--------------------------------------------------------------------------
|
| Only return workspaces the logged-in
| user actually belongs to.
|
*/

export async function getMyWorkspaces(
  request: Request,
  response: Response
) {
  if (!request.user) {
    throw new AppError(
      "Authentication required.",
      401,
      "UNAUTHENTICATED"
    );
  }

  const memberships =
    await prisma.workspaceMembership.findMany({
      where: {
        userId:
          request.user.id,
      },

      include: {
        workspace: {
          include: {
            _count: {
              select: {
                memberships:
                  true,

                projects:
                  true,
              },
            },
          },
        },
      },

      orderBy: {
        joinedAt:
          "desc",
      },
    });

  const workspaces =
    memberships.map(
      (membership) => ({
        id:
          membership.workspace
            .id,

        name:
          membership.workspace
            .name,

        slug:
          membership.workspace
            .slug,

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

        role:
          membership.role,

        joinedAt:
          membership.joinedAt,

        memberCount:
          membership.workspace
            ._count
            .memberships,

        projectCount:
          membership.workspace
            ._count.projects,
      })
    );

  response.json({
    success: true,

    data: {
      workspaces,
    },
  });
}

/*
|--------------------------------------------------------------------------
| GET ONE WORKSPACE
|--------------------------------------------------------------------------
*/

export async function getWorkspace(
  request: Request,
  response: Response
) {
  const workspace =
    request.workspace;

  const membership =
    request.workspaceMembership;

  if (
    !workspace ||
    !membership
  ) {
    throw new AppError(
      "Workspace context is missing.",
      500
    );
  }

  const detailedWorkspace =
    await prisma.workspace.findUnique({
      where: {
        id:
          workspace.id,
      },

      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                jobTitle: true,
              },
            },
          },

          orderBy: [
            {
              role:
                "asc",
            },

            {
              joinedAt:
                "asc",
            },
          ],
        },

        _count: {
          select: {
            projects:
              true,
          },
        },
      },
    });

  if (!detailedWorkspace) {
    throw new AppError(
      "Workspace not found.",
      404,
      "WORKSPACE_NOT_FOUND"
    );
  }

  response.json({
    success: true,

    data: {
      workspace: {
        id:
          detailedWorkspace.id,

        name:
          detailedWorkspace.name,

        slug:
          detailedWorkspace.slug,

        description:
          detailedWorkspace.description,

        createdById:
          detailedWorkspace.createdById,

        createdAt:
          detailedWorkspace.createdAt,

        updatedAt:
          detailedWorkspace.updatedAt,

        role:
          membership.role,

        joinedAt:
          membership.joinedAt,

        memberCount:
          detailedWorkspace
            .memberships.length,

        projectCount:
          detailedWorkspace
            ._count.projects,

        members:
          detailedWorkspace.memberships.map(
            (
              workspaceMember
            ) => ({
              membershipId:
                workspaceMember.id,

              id:
                workspaceMember.user
                  .id,

              name:
                workspaceMember.user
                  .name,

              email:
                workspaceMember.user
                  .email,

              jobTitle:
                workspaceMember.user
                  .jobTitle,

              role:
                workspaceMember.role,

              joinedAt:
                workspaceMember
                  .joinedAt,
            })
          ),
      },
    },
  });
}

/*
|--------------------------------------------------------------------------
| UPDATE WORKSPACE
|--------------------------------------------------------------------------
|
| OWNER and MANAGER only.
|
| The workspace slug does NOT
| automatically change when the name
| changes.
|
| This gives us a stable identifier.
|
*/

export async function updateWorkspace(
  request: Request,
  response: Response
) {
  const workspace =
    request.workspace;

  if (!workspace) {
    throw new AppError(
      "Workspace context is missing.",
      500
    );
  }

  const data =
    updateWorkspaceSchema.parse(
      request.body
    );

  const updated =
    await prisma.workspace.update({
      where: {
        id:
          workspace.id,
      },

      data: {
        ...(data.name !==
          undefined && {
          name:
            data.name,
        }),

        ...(data.description !==
          undefined && {
          description:
            data.description ||
            null,
        }),
      },
    });

  response.json({
    success: true,

    message:
      "Workspace updated successfully.",

    data: {
      workspace: {
        ...updated,

        role:
          request
            .workspaceMembership
            ?.role,
      },
    },
  });
}