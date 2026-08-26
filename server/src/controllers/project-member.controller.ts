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

const addMembersSchema =
  z.object({
    userIds: z
      .array(
        z
          .string()
          .uuid(
            "Invalid user ID."
          )
      )
      .min(
        1,
        "Select at least one member."
      )
      .max(100),
  });

const removeMemberParamsSchema =
  z.object({
    workspaceId:
      z.string().uuid(),

    projectId:
      z.string().uuid(),

    userId:
      z.string().uuid(
        "Invalid user ID."
      ),
  });

/*
|--------------------------------------------------------------------------
| GET PROJECT MEMBERS
|--------------------------------------------------------------------------
*/

export async function getProjectMembers(
  request: Request,
  response: Response
) {
  const project =
    request.project;

  if (!project) {
    throw new AppError(
      "Project context is missing.",
      500
    );
  }

  const members =
    await prisma.projectMember.findMany({
      where: {
        projectId:
          project.id,
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

        addedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },

      orderBy: {
        addedAt:
          "asc",
      },
    });

  response.json({
    success: true,

    data: {
      members:
        members.map(
          (member) => ({
            projectMemberId:
              member.id,

            id:
              member.user.id,

            name:
              member.user.name,

            email:
              member.user.email,

            jobTitle:
              member.user
                .jobTitle,

            addedAt:
              member.addedAt,

            addedBy:
              member.addedBy,
          })
        ),
    },
  });
}

/*
|--------------------------------------------------------------------------
| ADD PROJECT MEMBERS
|--------------------------------------------------------------------------
*/

export async function addProjectMembers(
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
      "Project context is missing.",
      500
    );
  }

  const data =
    addMembersSchema.parse(
      request.body
    );

  const userIds = [
    ...new Set(
      data.userIds
    ),
  ];

  /*
   * Verify that every user actually
   * belongs to this workspace.
   */
  const workspaceMembers =
    await prisma.workspaceMembership.findMany({
      where: {
        workspaceId:
          workspace.id,

        userId: {
          in:
            userIds,
        },
      },

      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

  const workspaceUserIds =
    new Set(
      workspaceMembers.map(
        (membership) =>
          membership.userId
      )
    );

  const invalidUserIds =
    userIds.filter(
      (userId) =>
        !workspaceUserIds.has(
          userId
        )
    );

  if (
    invalidUserIds.length >
    0
  ) {
    throw new AppError(
      "One or more selected users do not belong to this workspace.",
      400,
      "INVALID_PROJECT_MEMBERS",
      {
        invalidUserIds,
      }
    );
  }

  const existingMembers =
    await prisma.projectMember.findMany({
      where: {
        projectId:
          project.id,

        userId: {
          in:
            userIds,
        },
      },

      select: {
        userId: true,
      },
    });

  const existingIds =
    new Set(
      existingMembers.map(
        (member) =>
          member.userId
      )
    );

  const newUserIds =
    userIds.filter(
      (userId) =>
        !existingIds.has(
          userId
        )
    );

  if (
    newUserIds.length ===
    0
  ) {
    response.json({
      success: true,

      message:
        "All selected users are already project members.",

      data: {
        addedCount: 0,
      },
    });

    return;
  }

  const namesById =
    new Map(
      workspaceMembers.map(
        (membership) => [
          membership.userId,
          membership.user.name,
        ]
      )
    );

  await prisma.$transaction(
    async (tx) => {
      await tx.projectMember.createMany({
        data:
          newUserIds.map(
            (userId) => ({
              projectId:
                project.id,

              userId,

              addedById:
                actor.id,
            })
          ),
      });

      await tx.activityLog.createMany({
        data:
          newUserIds.map(
            (userId) => ({
              projectId:
                project.id,

              actorId:
                actor.id,

              type:
                "PROJECT_MEMBER_ADDED",

              message:
                `${actor.name} added ${
                  namesById.get(
                    userId
                  ) ??
                  "a member"
                } to the project.`,
            })
          ),
      });
    }
  );

  const members =
    await prisma.projectMember.findMany({
      where: {
        projectId:
          project.id,

        userId: {
          in:
            newUserIds,
        },
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
      `${newUserIds.length} project member${
        newUserIds.length === 1
          ? ""
          : "s"
      } added successfully.`,

    data: {
      addedCount:
        newUserIds.length,

      members:
        members.map(
          (member) => ({
            projectMemberId:
              member.id,

            id:
              member.user.id,

            name:
              member.user.name,

            email:
              member.user.email,

            jobTitle:
              member.user
                .jobTitle,

            addedAt:
              member.addedAt,
          })
        ),
    },
  });
}

/*
|--------------------------------------------------------------------------
| REMOVE PROJECT MEMBER
|--------------------------------------------------------------------------
|
| Removing someone from a project:
|
| ✓ removes ProjectMember
| ✓ unassigns their tasks in this project
|
| It does NOT:
|
| ✗ delete tasks
| ✗ delete comments
| ✗ delete activity history
| ✗ remove them from the workspace
|
*/

export async function removeProjectMember(
  request: Request,
  response: Response
) {
  const project =
    request.project;

  const actor =
    request.user;

  if (
    !project ||
    !actor
  ) {
    throw new AppError(
      "Project context is missing.",
      500
    );
  }

  const {
    userId,
  } =
    removeMemberParamsSchema.parse(
      request.params
    );

  const membership =
    await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId:
            project.id,

          userId,
        },
      },

      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

  if (!membership) {
    throw new AppError(
      "Project member not found.",
      404,
      "PROJECT_MEMBER_NOT_FOUND"
    );
  }

  await prisma.$transaction(
    async (tx) => {
      /*
       * Tasks remain, but the removed
       * person cannot stay assigned.
       */
      await tx.task.updateMany({
        where: {
          projectId:
            project.id,

          assigneeId:
            userId,
        },

        data: {
          assigneeId:
            null,
        },
      });

      await tx.projectMember.delete({
        where: {
          id:
            membership.id,
        },
      });

      await tx.activityLog.create({
        data: {
          projectId:
            project.id,

          actorId:
            actor.id,

          type:
            "PROJECT_MEMBER_REMOVED",

          message:
            `${actor.name} removed ${membership.user.name} from the project.`,
        },
      });
    }
  );

  response.json({
    success: true,

    message:
      `${membership.user.name} was removed from the project.`,
  });
}