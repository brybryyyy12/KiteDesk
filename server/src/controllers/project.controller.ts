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

const dateSchema =
  z
    .string()
    .trim()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Date must use YYYY-MM-DD format."
    );

const createProjectSchema =
  z.object({
    name: z
      .string()
      .trim()
      .min(
        2,
        "Project name must contain at least 2 characters."
      )
      .max(
        150,
        "Project name is too long."
      ),

    description: z
      .string()
      .trim()
      .max(
        10000,
        "Project description is too long."
      )
      .optional()
      .nullable(),

    status: z
      .enum([
        "PLANNING",
        "IN_PROGRESS",
        "ON_HOLD",
        "COMPLETED",
      ])
      .default(
        "PLANNING"
      ),

    deadline:
      dateSchema
        .optional()
        .nullable(),

    /*
     * These are USER IDs,
     * not WorkspaceMembership IDs.
     */
    memberIds: z
      .array(
        z
          .string()
          .uuid(
            "Invalid member ID."
          )
      )
      .max(100)
      .default([]),
  });

const updateProjectSchema =
  z
    .object({
      name: z
        .string()
        .trim()
        .min(2)
        .max(150)
        .optional(),

      description: z
        .string()
        .trim()
        .max(10000)
        .nullable()
        .optional(),

      status: z
        .enum([
          "PLANNING",
          "IN_PROGRESS",
          "ON_HOLD",
          "COMPLETED",
        ])
        .optional(),

      deadline:
        dateSchema
          .nullable()
          .optional(),
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
  value: Date | null
) {
  if (!value) {
    return null;
  }

  return value
    .toISOString()
    .slice(0, 10);
}

/*
|--------------------------------------------------------------------------
| CREATE PROJECT
|--------------------------------------------------------------------------
*/

export async function createProject(
  request: Request,
  response: Response
) {
  const workspace =
    request.workspace;

  const user =
    request.user;

  if (
    !workspace ||
    !user
  ) {
    throw new AppError(
      "Workspace context is missing.",
      500
    );
  }

  const data =
    createProjectSchema.parse(
      request.body
    );

  /*
   * Remove duplicate IDs and always
   * add the project creator.
   */
  const requestedUserIds = [
    ...new Set([
      ...data.memberIds,
      user.id,
    ]),
  ];

  /*
   * Every ProjectMember must first
   * belong to the workspace.
   */
  const memberships =
    await prisma.workspaceMembership.findMany({
      where: {
        workspaceId:
          workspace.id,

        userId: {
          in:
            requestedUserIds,
        },
      },

      select: {
        userId: true,
      },
    });

  const validUserIds =
    new Set(
      memberships.map(
        (membership) =>
          membership.userId
      )
    );

  const invalidUserIds =
    requestedUserIds.filter(
      (userId) =>
        !validUserIds.has(
          userId
        )
    );

  if (
    invalidUserIds.length >
    0
  ) {
    throw new AppError(
      "One or more selected project members do not belong to this workspace.",
      400,
      "INVALID_PROJECT_MEMBERS",
      {
        invalidUserIds,
      }
    );
  }

  const projectId =
    await prisma.$transaction(
      async (tx) => {
        const project =
          await tx.project.create({
            data: {
              workspaceId:
                workspace.id,

              name:
                data.name,

              description:
                data.description ||
                null,

              status:
                data.status,

              deadline:
                toDateOnly(
                  data.deadline
                ),

              createdById:
                user.id,
            },
          });

        if (
          requestedUserIds.length >
          0
        ) {
          await tx.projectMember.createMany({
            data:
              requestedUserIds.map(
                (userId) => ({
                  projectId:
                    project.id,

                  userId,

                  addedById:
                    user.id,
                })
              ),
          });
        }

        await tx.activityLog.create({
          data: {
            projectId:
              project.id,

            actorId:
              user.id,

            type:
              "PROJECT_CREATED",

            message:
              `${user.name} created the project.`,
          },
        });

        return project.id;
      }
    );

  const project =
    await getProjectDetails(
      projectId
    );

  response
    .status(201)
    .json({
      success: true,

      message:
        "Project created successfully.",

      data: {
        project,
      },
    });
}

/*
|--------------------------------------------------------------------------
| LIST PROJECTS
|--------------------------------------------------------------------------
*/

export async function getProjects(
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

  const projects =
    await prisma.project.findMany({
      where: {
        workspaceId:
          workspace.id,

        /*
         * Owner / Manager:
         * all workspace projects.
         *
         * Member:
         * assigned projects only.
         */
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

      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },

        members: {
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

          orderBy: {
            addedAt:
              "asc",
          },
        },

        _count: {
          select: {
            tasks: true,
          },
        },

        tasks: {
          where: {
            status:
              "DONE",
          },

          select: {
            id: true,
          },
        },
      },

      orderBy: {
        updatedAt:
          "desc",
      },
    });

  response.json({
    success: true,

    data: {
      projects:
        projects.map(
          (project) =>
            mapProject(
              project
            )
        ),
    },
  });
}

/*
|--------------------------------------------------------------------------
| GET PROJECT
|--------------------------------------------------------------------------
*/

export async function getProject(
  request: Request,
  response: Response
) {
  const projectContext =
    request.project;

  if (!projectContext) {
    throw new AppError(
      "Project context is missing.",
      500
    );
  }

  const project =
    await getProjectDetails(
      projectContext.id
    );

  if (!project) {
    throw new AppError(
      "Project not found.",
      404,
      "PROJECT_NOT_FOUND"
    );
  }

  response.json({
    success: true,

    data: {
      project,
    },
  });
}

/*
|--------------------------------------------------------------------------
| UPDATE PROJECT
|--------------------------------------------------------------------------
*/

export async function updateProject(
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

  const data =
    updateProjectSchema.parse(
      request.body
    );

  const before = {
    name:
      project.name,

    description:
      project.description,

    status:
      project.status,

    deadline:
      formatDateOnly(
        project.deadline
      ),
  };

  await prisma.$transaction(
    async (tx) => {
      await tx.project.update({
        where: {
          id:
            project.id,
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

          ...(data.status !==
            undefined && {
            status:
              data.status,
          }),

          ...(data.deadline !==
            undefined && {
            deadline:
              toDateOnly(
                data.deadline
              ),
          }),
        },
      });

      await tx.activityLog.create({
        data: {
          projectId:
            project.id,

          actorId:
            user.id,

          type:
            "PROJECT_UPDATED",

          message:
            `${user.name} updated the project.`,

          metadata: {
            before,

            after: {
              ...before,
              ...data,
            },
          },
        },
      });
    }
  );

  const updated =
    await getProjectDetails(
      project.id
    );

  response.json({
    success: true,

    message:
      "Project updated successfully.",

    data: {
      project:
        updated,
    },
  });
}

/*
|--------------------------------------------------------------------------
| DELETE PROJECT
|--------------------------------------------------------------------------
|
| OWNER only.
|
| PostgreSQL/Prisma cascade deletes
| project tasks, members, comments,
| attachments and activity records.
|
*/

export async function deleteProject(
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

  await prisma.project.delete({
    where: {
      id:
        project.id,
    },
  });

  response.json({
    success: true,

    message:
      "Project deleted successfully.",
  });
}

/*
|--------------------------------------------------------------------------
| INTERNAL PROJECT QUERY
|--------------------------------------------------------------------------
*/

async function getProjectDetails(
  projectId: string
) {
  const project =
    await prisma.project.findUnique({
      where: {
        id:
          projectId,
      },

      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },

        members: {
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

          orderBy: {
            addedAt:
              "asc",
          },
        },

        _count: {
          select: {
            tasks: true,
          },
        },

        tasks: {
          where: {
            status:
              "DONE",
          },

          select: {
            id: true,
          },
        },
      },
    });

  if (!project) {
    return null;
  }

  return mapProject(
    project
  );
}

/*
|--------------------------------------------------------------------------
| RESPONSE MAPPER
|--------------------------------------------------------------------------
*/

function mapProject(
  project: {
    id: string;
    workspaceId: string;
    name: string;
    description:
      | string
      | null;

    status:
      | "PLANNING"
      | "IN_PROGRESS"
      | "ON_HOLD"
      | "COMPLETED";

    deadline:
      Date | null;

    createdById:
      string;

    createdAt:
      Date;

    updatedAt:
      Date;

    createdBy: {
      id: string;
      name: string;
    };

    members: Array<{
      id: string;
      addedAt: Date;

      user: {
        id: string;
        name: string;
        email: string;
        jobTitle:
          | string
          | null;
      };
    }>;

    _count: {
      tasks: number;
    };

    tasks: Array<{
      id: string;
    }>;
  }
) {
  return {
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
      formatDateOnly(
        project.deadline
      ),

    createdById:
      project.createdById,

    createdBy:
      project.createdBy,

    createdAt:
      project.createdAt,

    updatedAt:
      project.updatedAt,

    totalTasks:
      project._count.tasks,

    completedTasks:
      project.tasks.length,

    memberCount:
      project.members.length,

    members:
      project.members.map(
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
  };
}