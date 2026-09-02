import {
  randomBytes,
} from "node:crypto";

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
  env,
} from "../config/env.js";

import {
  AppError,
} from "../utils/AppError.js";

import {
  sendWorkspaceInvitationEmail,
} from "../services/email.service.js";

const createInvitationSchema =
  z.object({
    email: z
      .string()
      .trim()
      .email(
        "Enter a valid email address."
      )
      .max(255)
      .transform(
        (value) =>
          value.toLowerCase()
      ),

    role: z
      .enum([
        "OWNER",
        "MANAGER",
        "MEMBER",
      ])
      .default("MEMBER"),
  });

const invitationParamsSchema =
  z.object({
    workspaceId: z
      .string()
      .uuid(
        "Invalid workspace ID."
      ),

    invitationId: z
      .string()
      .uuid(
        "Invalid invitation ID."
      ),
  });

const tokenParamsSchema =
  z.object({
    token: z
      .string()
      .min(
        20,
        "Invalid invitation token."
      )
      .max(255),
  });

const INVITATION_DURATION =
  7 *
  24 *
  60 *
  60 *
  1000;

/*
|--------------------------------------------------------------------------
| CREATE INVITATION
|--------------------------------------------------------------------------
*/

export async function createInvitation(
  request: Request,
  response: Response
) {
  const workspace =
    request.workspace;

  const actor =
    request.user;

  const actorMembership =
    request.workspaceMembership;

  if (
    !workspace ||
    !actor ||
    !actorMembership
  ) {
    throw new AppError(
      "Workspace context is missing.",
      500
    );
  }

  const data =
    createInvitationSchema.parse(
      request.body
    );

  /*
   * Managers may invite MEMBER only.
   */
  if (
    actorMembership.role ===
      "MANAGER" &&
    data.role !== "MEMBER"
  ) {
    throw new AppError(
      "Managers can only invite users as MEMBER.",
      403,
      "INSUFFICIENT_WORKSPACE_PERMISSION"
    );
  }

  /*
   * Check whether this email already
   * belongs to a user in the
   * workspace.
   */
  const existingUser =
    await prisma.user.findUnique({
      where: {
        email:
          data.email,
      },

      select: {
        id: true,
      },
    });

  if (existingUser) {
    const membership =
      await prisma.workspaceMembership.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId:
              workspace.id,

            userId:
              existingUser.id,
          },
        },

        select: {
          id: true,
        },
      });

    if (membership) {
      throw new AppError(
        "This user is already a member of the workspace.",
        409,
        "ALREADY_WORKSPACE_MEMBER"
      );
    }
  }

  const now =
    new Date();

  /*
   * Automatically mark expired
   * pending invitations.
   */
  await prisma.invitation.updateMany({
    where: {
      workspaceId:
        workspace.id,

      email:
        data.email,

      status:
        "PENDING",

      expiresAt: {
        lte: now,
      },
    },

    data: {
      status:
        "EXPIRED",
    },
  });

  /*
   * Prevent duplicate active
   * invitations.
   */
  const existingInvitation =
    await prisma.invitation.findFirst({
      where: {
        workspaceId:
          workspace.id,

        email:
          data.email,

        status:
          "PENDING",

        expiresAt: {
          gt: now,
        },
      },

      select: {
        id: true,
        expiresAt: true,
      },
    });

  if (existingInvitation) {
    throw new AppError(
      "An active invitation has already been sent to this email.",
      409,
      "INVITATION_ALREADY_EXISTS",
      {
        expiresAt:
          existingInvitation
            .expiresAt,
      }
    );
  }

  const token =
    randomBytes(32)
      .toString("hex");

  const expiresAt =
    new Date(
      Date.now() +
        INVITATION_DURATION
    );

  const invitation =
    await prisma.invitation.create({
      data: {
        workspaceId:
          workspace.id,

        email:
          data.email,

        role:
          data.role,

        token,

        invitedById:
          actor.id,

        expiresAt,
      },

      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

      /*
  |--------------------------------------------------------------------------
  | SEND INVITATION EMAIL
  |--------------------------------------------------------------------------
  */

  const invitationUrl =
    `${env.CLIENT_URL}/invitations/${invitation.token}`;

  try {
    await sendWorkspaceInvitationEmail({
      to:
        invitation.email,

      inviterName:
        actor.name,

      workspaceName:
        workspace.name,

      role:
        invitation.role,

      invitationUrl,

      expiresAt:
        invitation.expiresAt,
    });
  } catch (error) {
    /*
     * V1 behavior:
     *
     * If delivery fails, remove the
     * invitation so the inviter can
     * try again instead of being
     * blocked by a pending invitation
     * that nobody received.
     */
    await prisma.invitation.delete({
      where: {
        id:
          invitation.id,
      },
    });

    throw error;
  }

  response
    .status(201)
  .json({
    success: true,

    message:
      "Workspace invitation created successfully.",

    data: {
      invitation: {
        id:
          invitation.id,

        email:
          invitation.email,

        role:
          invitation.role,

        status:
          invitation.status,

        expiresAt:
          invitation.expiresAt,

        createdAt:
          invitation.createdAt,

        invitedBy:
          invitation.invitedBy,
      },

      /*
       * Development only.
       *
       * Later this URL can be sent
       * through an actual email service.
       */
      ...(env.NODE_ENV !==
        "production" && {
        developmentToken:
          invitation.token,

        developmentInviteUrl:
          `${env.CLIENT_URL}/invitations/${invitation.token}`,
      }),
    },
  });
}

/*
|--------------------------------------------------------------------------
| LIST WORKSPACE INVITATIONS
|--------------------------------------------------------------------------
*/

export async function getWorkspaceInvitations(
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

  const now =
    new Date();

  await prisma.invitation.updateMany({
    where: {
      workspaceId:
        workspace.id,

      status:
        "PENDING",

      expiresAt: {
        lte: now,
      },
    },

    data: {
      status:
        "EXPIRED",
    },
  });

  const invitations =
    await prisma.invitation.findMany({
      where: {
        workspaceId:
          workspace.id,
      },

      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        acceptedAt: true,
        createdAt: true,
        updatedAt: true,

        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },

      orderBy: {
        createdAt:
          "desc",
      },

      take: 100,
    });

  response.json({
    success: true,

    data: {
      invitations,
    },
  });
}

/*
|--------------------------------------------------------------------------
| REVOKE INVITATION
|--------------------------------------------------------------------------
*/

export async function revokeInvitation(
  request: Request,
  response: Response
) {
  const {
    workspaceId,
    invitationId,
  } =
    invitationParamsSchema.parse(
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

  const invitation =
    await prisma.invitation.findFirst({
      where: {
        id:
          invitationId,

        workspaceId,
      },
    });

  if (!invitation) {
    throw new AppError(
      "Invitation not found.",
      404,
      "INVITATION_NOT_FOUND"
    );
  }

  if (
    invitation.status !==
    "PENDING"
  ) {
    throw new AppError(
      "Only pending invitations can be revoked.",
      409,
      "INVITATION_NOT_PENDING"
    );
  }

  /*
   * Managers can only manage MEMBER
   * invitations.
   */
  if (
    actorMembership.role ===
      "MANAGER" &&
    invitation.role !==
      "MEMBER"
  ) {
    throw new AppError(
      "Managers can only revoke MEMBER invitations.",
      403,
      "INSUFFICIENT_WORKSPACE_PERMISSION"
    );
  }

  await prisma.invitation.update({
    where: {
      id:
        invitation.id,
    },

    data: {
      status:
        "REVOKED",
    },
  });

  response.json({
    success: true,

    message:
      "Invitation revoked successfully.",
  });
}

/*
|--------------------------------------------------------------------------
| GET INVITATION BY TOKEN
|--------------------------------------------------------------------------
*/

export async function getInvitation(
  request: Request,
  response: Response
) {
  const { token } =
    tokenParamsSchema.parse(
      request.params
    );

  /*
   * Viewing an invitation does NOT
   * require authentication.
   *
   * The token itself acts as the
   * temporary secret needed to view
   * the invitation.
   *
   * Authentication + email matching
   * are still required when accepting
   * or declining.
   */

  let invitation =
    await prisma.invitation.findUnique({
      where: {
        token,
      },

      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },

        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

  if (!invitation) {
    throw new AppError(
      "Invitation not found.",
      404,
      "INVITATION_NOT_FOUND"
    );
  }

  /*
   * If a pending invitation has
   * already passed its expiry date,
   * persist the EXPIRED status.
   */

  if (
    invitation.status ===
      "PENDING" &&
    invitation.expiresAt <=
      new Date()
  ) {
    invitation =
      await prisma.invitation.update({
        where: {
          id:
            invitation.id,
        },

        data: {
          status:
            "EXPIRED",
        },

        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
            },
          },

          invitedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
  }

  response.json({
    success: true,

    data: {
      invitation: {
        id:
          invitation.id,

        email:
          invitation.email,

        role:
          invitation.role,

        status:
          invitation.status,

        expiresAt:
          invitation.expiresAt,

        createdAt:
          invitation.createdAt,

        acceptedAt:
          invitation.acceptedAt,

        workspace:
          invitation.workspace,

        invitedBy:
          invitation.invitedBy,
      },
    },
  });
}

/*
|--------------------------------------------------------------------------
| ACCEPT INVITATION
|--------------------------------------------------------------------------
*/

export async function acceptInvitation(
  request: Request,
  response: Response
) {
  const { token } =
    tokenParamsSchema.parse(
      request.params
    );

  const user =
    request.user;

  if (!user) {
    throw new AppError(
      "Authentication required.",
      401
    );
  }

  /*
   * Unlike the old helper, this lookup
   * permits an already-ACCEPTED invitation.
   *
   * That makes accepting idempotent:
   * double-clicks/retries do not create
   * duplicate memberships or turn a
   * successful accept into a confusing
   * 409 response.
   */
  const invitation =
    await getInvitationForUser(
      token,
      user.email
    );

  /*
   * An ACCEPTED invitation must never become
   * a reusable way to rejoin after someone
   * is intentionally removed from a workspace.
   *
   * We only treat a repeated accept as
   * successful when the membership still
   * exists.
   */
  if (
    invitation.status ===
    "ACCEPTED"
  ) {
    const existingMembership =
      await prisma.workspaceMembership.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId:
              invitation.workspaceId,

            userId:
              user.id,
          },
        },
      });

    if (
      !existingMembership
    ) {
      throwInvitationStateError(
        invitation.status,
        invitation.expiresAt
      );
    }

    response.json({
      success: true,

      message:
        `You are already a member of ${invitation.workspace.name}.`,

      data: {
        workspace: {
          id:
            invitation.workspace.id,

          name:
            invitation.workspace.name,

          slug:
            invitation.workspace.slug,

          description:
            invitation.workspace
              .description,

          role:
            existingMembership.role,

          joinedAt:
            existingMembership.joinedAt,
        },

        alreadyMember:
          true,
      },
    });

    return;
  }

  assertInvitationCanBeAccepted(
    invitation
  );

  const now =
    new Date();

  const result =
    await prisma.$transaction(
      async (tx) => {
        /*
         * Atomically claim a still-pending
         * invitation.
         *
         * updateMany gives us a conditional
         * update so ACCEPT and DECLINE cannot
         * silently overwrite each other.
         */
        if (
          invitation.status ===
          "PENDING"
        ) {
          const claim =
            await tx.invitation.updateMany({
              where: {
                id:
                  invitation.id,

                status:
                  "PENDING",

                expiresAt: {
                  gt:
                    now,
                },
              },

              data: {
                status:
                  "ACCEPTED",

                acceptedAt:
                  now,
              },
            });

          /*
           * Another request may have changed
           * the invitation after our initial
           * read. Re-check the committed state
           * before continuing.
           */
          if (
            claim.count ===
            0
          ) {
            const current =
              await tx.invitation.findUnique({
                where: {
                  id:
                    invitation.id,
                },

                select: {
                  status: true,
                  expiresAt: true,
                },
              });

            if (
              !current
            ) {
              throw new AppError(
                "Invitation not found.",
                404,
                "INVITATION_NOT_FOUND"
              );
            }

            if (
              current.status !==
              "ACCEPTED"
            ) {
              throwInvitationStateError(
                current.status,
                current.expiresAt
              );
            }

            const concurrentMembership =
              await tx.workspaceMembership.findUnique({
                where: {
                  workspaceId_userId: {
                    workspaceId:
                      invitation.workspaceId,

                    userId:
                      user.id,
                  },
                },
              });

            if (
              !concurrentMembership
            ) {
              throwInvitationStateError(
                current.status,
                current.expiresAt
              );
            }
          }
        }

        /*
         * Normalize an already-existing
         * membership instead of throwing a
         * conflict for a still-pending invite.
         *
         * The compound unique key makes this
         * safe even if two accept requests
         * arrive at nearly the same time.
         */
        const existingMembership =
          await tx.workspaceMembership.findUnique({
            where: {
              workspaceId_userId: {
                workspaceId:
                  invitation.workspaceId,

                userId:
                  user.id,
              },
            },
          });

        const membership =
          existingMembership ??
          await tx.workspaceMembership.create({
            data: {
              workspaceId:
                invitation.workspaceId,

              userId:
                user.id,

              role:
                invitation.role,
            },
          });

        /*
         * Cancel any other pending
         * invitations for the same
         * email/workspace.
         */
        await tx.invitation.updateMany({
          where: {
            workspaceId:
              invitation.workspaceId,

            email:
              invitation.email,

            status:
              "PENDING",

            id: {
              not:
                invitation.id,
            },
          },

          data: {
            status:
              "REVOKED",
          },
        });

        return {
          membership,

          alreadyMember:
            existingMembership !==
            null,
        };
      }
    );

  response.json({
    success: true,

    message:
      result.alreadyMember
        ? `You are already a member of ${invitation.workspace.name}.`
        : `You joined ${invitation.workspace.name}.`,

    data: {
      workspace: {
        id:
          invitation.workspace.id,

        name:
          invitation.workspace.name,

        slug:
          invitation.workspace.slug,

        description:
          invitation.workspace
            .description,

        role:
          result.membership.role,

        joinedAt:
          result.membership.joinedAt,
      },

      alreadyMember:
        result.alreadyMember,
    },
  });
}

/*
|--------------------------------------------------------------------------
| DECLINE INVITATION
|--------------------------------------------------------------------------
*/

export async function declineInvitation(
  request: Request,
  response: Response
) {
  const { token } =
    tokenParamsSchema.parse(
      request.params
    );

  const user =
    request.user;

  if (!user) {
    throw new AppError(
      "Authentication required.",
      401
    );
  }

  const invitation =
    await getInvitationForUser(
      token,
      user.email
    );

  /*
   * Repeating a successful decline should
   * remain successful rather than showing
   * the user an unnecessary conflict.
   */
  if (
    invitation.status ===
    "DECLINED"
  ) {
    response.json({
      success: true,

      message:
        "Workspace invitation declined.",
    });

    return;
  }

  if (
    invitation.status !==
    "PENDING"
  ) {
    throwInvitationStateError(
      invitation.status,
      invitation.expiresAt
    );
  }

  const now =
    new Date();

  /*
   * Conditional update prevents a concurrent
   * ACCEPT request from being overwritten by
   * DECLINE (and vice versa).
   */
  const declined =
    await prisma.invitation.updateMany({
      where: {
        id:
          invitation.id,

        status:
          "PENDING",

        expiresAt: {
          gt:
            now,
        },
      },

      data: {
        status:
          "DECLINED",
      },
    });

  if (
    declined.count ===
    0
  ) {
    const current =
      await prisma.invitation.findUnique({
        where: {
          id:
            invitation.id,
        },

        select: {
          status: true,
          expiresAt: true,
        },
      });

    if (
      !current
    ) {
      throw new AppError(
        "Invitation not found.",
        404,
        "INVITATION_NOT_FOUND"
      );
    }

    if (
      current.status ===
      "DECLINED"
    ) {
      response.json({
        success: true,

        message:
          "Workspace invitation declined.",
      });

      return;
    }

    throwInvitationStateError(
      current.status,
      current.expiresAt
    );
  }

  response.json({
    success: true,

    message:
      "Workspace invitation declined.",
  });
}

/*
|--------------------------------------------------------------------------
| INVITATION VALIDATION
|--------------------------------------------------------------------------
*/

async function getInvitationForUser(
  token: string,
  userEmail: string
) {
  const invitation =
    await prisma.invitation.findUnique({
      where: {
        token,
      },

      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },

        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

  /*
   * Use the same error when the email
   * does not match so the protected
   * action does not reveal invitation
   * details to the wrong account.
   */
  if (
    !invitation ||
    invitation.email.toLowerCase() !==
      userEmail.toLowerCase()
  ) {
    throw new AppError(
      "Invitation not found.",
      404,
      "INVITATION_NOT_FOUND"
    );
  }

  /*
   * Persist expiry before returning the
   * invitation so every action sees the
   * same state.
   */
  if (
    invitation.status ===
      "PENDING" &&
    invitation.expiresAt <=
      new Date()
  ) {
    await prisma.invitation.updateMany({
      where: {
        id:
          invitation.id,

        status:
          "PENDING",
      },

      data: {
        status:
          "EXPIRED",
      },
    });

    return {
      ...invitation,

      status:
        "EXPIRED" as const,
    };
  }

  return invitation;
}

function assertInvitationCanBeAccepted(
  invitation: {
    status: string;
    expiresAt: Date;
  }
) {
  if (
    invitation.status ===
    "PENDING"
  ) {
    return;
  }

  throwInvitationStateError(
    invitation.status,
    invitation.expiresAt
  );
}

function throwInvitationStateError(
  status: string,
  expiresAt: Date
): never {
  if (
    status ===
      "EXPIRED" ||
    (
      status ===
        "PENDING" &&
      expiresAt <=
        new Date()
    )
  ) {
    throw new AppError(
      "This invitation has expired.",
      410,
      "INVITATION_EXPIRED"
    );
  }

  if (
    status ===
    "DECLINED"
  ) {
    throw new AppError(
      "This invitation has already been declined.",
      409,
      "INVITATION_DECLINED"
    );
  }

  if (
    status ===
    "REVOKED"
  ) {
    throw new AppError(
      "This invitation has been revoked.",
      410,
      "INVITATION_REVOKED"
    );
  }

  if (
    status ===
    "ACCEPTED"
  ) {
    throw new AppError(
      "This invitation has already been accepted.",
      409,
      "INVITATION_ACCEPTED"
    );
  }

  throw new AppError(
    "This invitation is no longer available.",
    409,
    "INVITATION_NOT_PENDING"
  );
}
