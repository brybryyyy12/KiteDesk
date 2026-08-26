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

const membershipParamsSchema =
  z.object({
    workspaceId: z
      .string()
      .uuid(
        "Invalid workspace ID."
      ),

    membershipId: z
      .string()
      .uuid(
        "Invalid membership ID."
      ),
  });

const updateRoleSchema =
  z.object({
    role: z.enum([
      "OWNER",
      "MANAGER",
      "MEMBER",
    ]),
  });

/*
|--------------------------------------------------------------------------
| GET WORKSPACE MEMBERS
|--------------------------------------------------------------------------
*/

export async function getWorkspaceMembers(
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

  const memberships =
    await prisma.workspaceMembership.findMany({
      where: {
        workspaceId:
          workspace.id,
      },

      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            jobTitle: true,
            createdAt: true,
          },
        },
      },

      orderBy: [
        {
          role: "asc",
        },

        {
          joinedAt: "asc",
        },
      ],
    });

  response.json({
    success: true,

    data: {
      members:
        memberships.map(
          (membership) => ({
            membershipId:
              membership.id,

            id:
              membership.user.id,

            name:
              membership.user.name,

            email:
              membership.user.email,

            jobTitle:
              membership.user
                .jobTitle,

            role:
              membership.role,

            joinedAt:
              membership.joinedAt,

            accountCreatedAt:
              membership.user
                .createdAt,
          })
        ),
    },
  });
}

/*
|--------------------------------------------------------------------------
| UPDATE MEMBER ROLE
|--------------------------------------------------------------------------
|
| OWNER only.
|
| Important:
|
| A workspace must always contain at
| least one OWNER.
|
*/

export async function updateWorkspaceMemberRole(
  request: Request,
  response: Response
) {
  const {
    workspaceId,
    membershipId,
  } =
    membershipParamsSchema.parse(
      request.params
    );

  const { role } =
    updateRoleSchema.parse(
      request.body
    );

  const targetMembership =
    await prisma.workspaceMembership.findFirst({
      where: {
        id:
          membershipId,

        workspaceId,
      },

      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

  if (!targetMembership) {
    throw new AppError(
      "Workspace member not found.",
      404,
      "WORKSPACE_MEMBER_NOT_FOUND"
    );
  }

  /*
   * Nothing to change.
   */
  if (
    targetMembership.role ===
    role
  ) {
    response.json({
      success: true,

      message:
        "Member already has this role.",

      data: {
        member: {
          membershipId:
            targetMembership.id,

          id:
            targetMembership.user
              .id,

          name:
            targetMembership.user
              .name,

          email:
            targetMembership.user
              .email,

          role:
            targetMembership.role,

          joinedAt:
            targetMembership
              .joinedAt,
        },
      },
    });

    return;
  }

  /*
   * Prevent removing the final
   * OWNER role.
   */
  if (
    targetMembership.role ===
      "OWNER" &&
    role !== "OWNER"
  ) {
    const ownerCount =
      await prisma.workspaceMembership.count({
        where: {
          workspaceId,

          role: "OWNER",
        },
      });

    if (ownerCount <= 1) {
      throw new AppError(
        "The workspace must have at least one owner. Promote another member to OWNER before changing this role.",
        409,
        "LAST_OWNER_REQUIRED"
      );
    }
  }

  const updated =
    await prisma.workspaceMembership.update({
      where: {
        id:
          targetMembership.id,
      },

      data: {
        role,
      },

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
    });

  response.json({
    success: true,

    message:
      "Workspace member role updated successfully.",

    data: {
      member: {
        membershipId:
          updated.id,

        id:
          updated.user.id,

        name:
          updated.user.name,

        email:
          updated.user.email,

        jobTitle:
          updated.user.jobTitle,

        role:
          updated.role,

        joinedAt:
          updated.joinedAt,
      },
    },
  });
}

/*
|--------------------------------------------------------------------------
| REMOVE WORKSPACE MEMBER
|--------------------------------------------------------------------------
|
| OWNER:
| - may remove OWNER/MANAGER/MEMBER
| - cannot remove the last OWNER
|
| MANAGER:
| - may remove MEMBER only
|
*/

export async function removeWorkspaceMember(
  request: Request,
  response: Response
) {
  const {
    workspaceId,
    membershipId,
  } =
    membershipParamsSchema.parse(
      request.params
    );

  const actorMembership =
    request.workspaceMembership;

  if (!actorMembership) {
    throw new AppError(
      "Workspace membership is required.",
      403
    );
  }

  const targetMembership =
    await prisma.workspaceMembership.findFirst({
      where: {
        id:
          membershipId,

        workspaceId,
      },

      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

  if (!targetMembership) {
    throw new AppError(
      "Workspace member not found.",
      404,
      "WORKSPACE_MEMBER_NOT_FOUND"
    );
  }

  /*
   * Managers may only remove
   * regular members.
   */
  if (
    actorMembership.role ===
      "MANAGER" &&
    targetMembership.role !==
      "MEMBER"
  ) {
    throw new AppError(
      "Managers can only remove workspace members with the MEMBER role.",
      403,
      "INSUFFICIENT_WORKSPACE_PERMISSION"
    );
  }

  /*
   * Last owner protection.
   */
  if (
    targetMembership.role ===
    "OWNER"
  ) {
    const ownerCount =
      await prisma.workspaceMembership.count({
        where: {
          workspaceId,

          role: "OWNER",
        },
      });

    if (ownerCount <= 1) {
      throw new AppError(
        "The last workspace owner cannot be removed.",
        409,
        "LAST_OWNER_REQUIRED"
      );
    }
  }

  await removeMembershipAndCleanup(
    workspaceId,
    targetMembership.userId,
    targetMembership.id
  );

  response.json({
    success: true,

    message:
      `${targetMembership.user.name} was removed from the workspace.`,
  });
}

/*
|--------------------------------------------------------------------------
| LEAVE WORKSPACE
|--------------------------------------------------------------------------
|
| Any member may leave.
|
| The final OWNER cannot leave.
|
*/

export async function leaveWorkspace(
  request: Request,
  response: Response
) {
  const membership =
    request.workspaceMembership;

  const workspace =
    request.workspace;

  if (
    !membership ||
    !workspace
  ) {
    throw new AppError(
      "Workspace context is missing.",
      500
    );
  }

  if (
    membership.role ===
    "OWNER"
  ) {
    const ownerCount =
      await prisma.workspaceMembership.count({
        where: {
          workspaceId:
            workspace.id,

          role: "OWNER",
        },
      });

    if (ownerCount <= 1) {
      throw new AppError(
        "You are the last workspace owner. Promote another member to OWNER before leaving.",
        409,
        "LAST_OWNER_REQUIRED"
      );
    }
  }

  await removeMembershipAndCleanup(
    workspace.id,
    membership.userId,
    membership.id
  );

  response.json({
    success: true,

    message:
      "You left the workspace successfully.",
  });
}

/*
|--------------------------------------------------------------------------
| MEMBERSHIP CLEANUP
|--------------------------------------------------------------------------
|
| Removing someone from the workspace
| also removes project membership and
| unassigns their tasks in this
| workspace.
|
| Their historical comments/activity
| remain intact.
|
*/

async function removeMembershipAndCleanup(
  workspaceId: string,
  userId: string,
  membershipId: string
) {
  await prisma.$transaction(
    async (tx) => {
      const projects =
        await tx.project.findMany({
          where: {
            workspaceId,
          },

          select: {
            id: true,
          },
        });

      const projectIds =
        projects.map(
          (project) =>
            project.id
        );

      if (
        projectIds.length > 0
      ) {
        /*
         * Remove from projects.
         */
        await tx.projectMember.deleteMany({
          where: {
            userId,

            projectId: {
              in: projectIds,
            },
          },
        });

        /*
         * They no longer belong to
         * the workspace, so tasks
         * cannot remain assigned to
         * them.
         */
        await tx.task.updateMany({
          where: {
            assigneeId:
              userId,

            projectId: {
              in: projectIds,
            },
          },

          data: {
            assigneeId:
              null,
          },
        });
      }

      await tx.workspaceMembership.delete({
        where: {
          id:
            membershipId,
        },
      });
    }
  );
}