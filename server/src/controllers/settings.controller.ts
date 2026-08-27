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
  comparePassword,
  hashPassword,
} from "../utils/password.js";

/*
|--------------------------------------------------------------------------
| VALIDATION
|--------------------------------------------------------------------------
*/

const updateProfileSchema =
  z
    .object({
      displayName: z
        .string()
        .trim()
        .min(
          2,
          "Display name must contain at least 2 characters."
        )
        .max(
          100,
          "Display name is too long."
        )
        .optional(),

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
        )
        .optional(),

      jobTitle: z
        .string()
        .trim()
        .max(
          100,
          "Job title is too long."
        )
        .nullable()
        .optional(),
    })
    .refine(
      (data) =>
        Object.keys(data)
          .length > 0,
      {
        message:
          "Provide at least one profile field to update.",
      }
    );

const updateNotificationPreferencesSchema =
  z
    .object({
      taskAssignments:
        z.boolean()
          .optional(),

      reviewActivity:
        z.boolean()
          .optional(),

      comments:
        z.boolean()
          .optional(),

      deadlines:
        z.boolean()
          .optional(),

      projectMembership:
        z.boolean()
          .optional(),
    })
    .refine(
      (data) =>
        Object.keys(data)
          .length > 0,
      {
        message:
          "Provide at least one notification preference to update.",
      }
    );

const changePasswordSchema =
  z
    .object({
      currentPassword: z
        .string()
        .min(
          1,
          "Current password is required."
        ),

    newPassword: z
    .string()
    .min(
      8,
      "New password must contain at least 8 characters."
    )
    .max(
      128,
      "New password is too long."
    )
    .regex(
      /[A-Z]/,
      "New password must contain at least one uppercase letter."
    )
    .regex(
      /[a-z]/,
      "New password must contain at least one lowercase letter."
    )
    .regex(
      /[0-9]/,
      "New password must contain at least one number."
    ),
    })
    .refine(
      (data) =>
        data.currentPassword !==
        data.newPassword,
      {
        message:
          "New password must be different from your current password.",

        path: [
          "newPassword",
        ],
      }
    );

/*
|--------------------------------------------------------------------------
| GET PROFILE
|--------------------------------------------------------------------------
*/

export async function getProfileSettings(
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

  const profile =
    await prisma.user.findUnique({
      where: {
        id:
          user.id,
      },

      select: {
        id: true,
        name: true,
        email: true,
        jobTitle: true,
        createdAt: true,
        updatedAt: true,
      },
    });

  if (!profile) {
    throw new AppError(
      "User not found.",
      404,
      "USER_NOT_FOUND"
    );
  }

  response.json({
    success: true,

    data: {
      profile: {
        id:
          profile.id,

        displayName:
          profile.name,

        email:
          profile.email,

        jobTitle:
          profile.jobTitle,

        createdAt:
          profile.createdAt,

        updatedAt:
          profile.updatedAt,
      },
    },
  });
}

/*
|--------------------------------------------------------------------------
| UPDATE PROFILE
|--------------------------------------------------------------------------
*/

export async function updateProfileSettings(
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

  const data =
    updateProfileSchema.parse(
      request.body
    );

  if (
    data.email &&
    data.email !==
      user.email
  ) {
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

    if (
      existingUser &&
      existingUser.id !==
        user.id
    ) {
      throw new AppError(
        "An account with this email already exists.",
        409,
        "EMAIL_ALREADY_EXISTS"
      );
    }
  }

  const updated =
    await prisma.user.update({
      where: {
        id:
          user.id,
      },

      data: {
        ...(data.displayName !==
          undefined && {
          name:
            data.displayName,
        }),

        ...(data.email !==
          undefined && {
          email:
            data.email,
        }),

        ...(data.jobTitle !==
          undefined && {
          jobTitle:
            data.jobTitle ||
            null,
        }),
      },

      select: {
        id: true,
        name: true,
        email: true,
        jobTitle: true,
        createdAt: true,
        updatedAt: true,
      },
    });

  response.json({
    success: true,

    message:
      "Profile updated successfully.",

    data: {
      profile: {
        id:
          updated.id,

        displayName:
          updated.name,

        email:
          updated.email,

        jobTitle:
          updated.jobTitle,

        createdAt:
          updated.createdAt,

        updatedAt:
          updated.updatedAt,
      },
    },
  });
}

/*
|--------------------------------------------------------------------------
| GET NOTIFICATION PREFERENCES
|--------------------------------------------------------------------------
*/

export async function getNotificationPreferences(
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

  const preferences =
    await prisma.notificationPreference.upsert({
      where: {
        userId:
          user.id,
      },

      update: {},

      create: {
        userId:
          user.id,
      },
    });

  response.json({
    success: true,

    data: {
      preferences: {
        taskAssignments:
          preferences.taskAssignments,

        reviewActivity:
          preferences.reviewActivity,

        comments:
          preferences.comments,

        deadlines:
          preferences.deadlines,

        projectMembership:
          preferences.projectMembership,
      },
    },
  });
}

/*
|--------------------------------------------------------------------------
| UPDATE NOTIFICATION PREFERENCES
|--------------------------------------------------------------------------
*/

export async function updateNotificationPreferences(
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

  const data =
    updateNotificationPreferencesSchema.parse(
      request.body
    );

  const preferences =
    await prisma.notificationPreference.upsert({
      where: {
        userId:
          user.id,
      },

      create: {
        userId:
          user.id,

        taskAssignments:
          data.taskAssignments ??
          true,

        reviewActivity:
          data.reviewActivity ??
          true,

        comments:
          data.comments ??
          true,

        deadlines:
          data.deadlines ??
          true,

        projectMembership:
          data.projectMembership ??
          true,
      },

      update: {
        ...(data.taskAssignments !==
          undefined && {
          taskAssignments:
            data.taskAssignments,
        }),

        ...(data.reviewActivity !==
          undefined && {
          reviewActivity:
            data.reviewActivity,
        }),

        ...(data.comments !==
          undefined && {
          comments:
            data.comments,
        }),

        ...(data.deadlines !==
          undefined && {
          deadlines:
            data.deadlines,
        }),

        ...(data.projectMembership !==
          undefined && {
          projectMembership:
            data.projectMembership,
        }),
      },
    });

  response.json({
    success: true,

    message:
      "Notification preferences updated successfully.",

    data: {
      preferences: {
        taskAssignments:
          preferences.taskAssignments,

        reviewActivity:
          preferences.reviewActivity,

        comments:
          preferences.comments,

        deadlines:
          preferences.deadlines,

        projectMembership:
          preferences.projectMembership,
      },
    },
  });
}

/*
|--------------------------------------------------------------------------
| CHANGE PASSWORD
|--------------------------------------------------------------------------
*/

export async function changePassword(
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

  const data =
    changePasswordSchema.parse(
      request.body
    );

  /*
   * request.user intentionally does
   * not expose passwordHash, so load
   * the hash directly from the DB.
   */
  const account =
    await prisma.user.findUnique({
      where: {
        id:
          user.id,
      },

      select: {
        id: true,

        passwordHash:
          true,
      },
    });

  if (!account) {
    throw new AppError(
      "User not found.",
      404,
      "USER_NOT_FOUND"
    );
  }

  /*
   * Never trust the frontend to verify
   * the existing password.
   */
  const passwordMatches =
    await comparePassword(
      data.currentPassword,
      account.passwordHash
    );

  if (!passwordMatches) {
    throw new AppError(
      "Current password is incorrect.",
      401,
      "INVALID_CURRENT_PASSWORD"
    );
  }

  /*
   * Hash using the exact same helper
   * used during account registration.
   */
  const newPasswordHash =
    await hashPassword(
      data.newPassword
    );

  await prisma.user.update({
    where: {
      id:
        user.id,
    },

    data: {
      passwordHash:
        newPasswordHash,
    },
  });

  response.json({
    success: true,

    message:
      "Password changed successfully.",
  });
}