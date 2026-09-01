import {
  createHash,
  randomBytes,
} from "node:crypto";

import type {
  CookieOptions,
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
  comparePassword,
  hashPassword,
} from "../utils/password.js";

import {
  createAuthToken,
} from "../utils/jwt.js";

import {
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
} from "../services/email.service.js";

/*
|--------------------------------------------------------------------------
| EMAIL VERIFICATION
|--------------------------------------------------------------------------
*/

const EMAIL_VERIFICATION_TOKEN_BYTES = 32;

const EMAIL_VERIFICATION_TTL_MS =
  24 *
  60 *
  60 *
  1000;

const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS =
  60 *
  1000;

function hashEmailVerificationToken(
  token: string
) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

function createEmailVerificationToken() {
  const token =
    randomBytes(
      EMAIL_VERIFICATION_TOKEN_BYTES
    ).toString("hex");

  const tokenHash =
    hashEmailVerificationToken(
      token
    );

  const expiresAt =
    new Date(
      Date.now() +
        EMAIL_VERIFICATION_TTL_MS
    );

  return {
    token,
    tokenHash,
    expiresAt,
  };
}

function createEmailVerificationUrl(
  token: string
) {
  const url =
    new URL(
      "/verify-email",
      env.CLIENT_URL
    );

  url.searchParams.set(
    "token",
    token
  );

  return url.toString();
}

/*
|--------------------------------------------------------------------------
| PASSWORD RESET
|--------------------------------------------------------------------------
*/

const PASSWORD_RESET_TOKEN_BYTES =
  32;

const PASSWORD_RESET_TTL_MS =
  60 *
  60 *
  1000;

const PASSWORD_RESET_RESEND_COOLDOWN_MS =
  60 *
  1000;

function hashPasswordResetToken(
  token: string
) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

function createPasswordResetToken() {
  const token =
    randomBytes(
      PASSWORD_RESET_TOKEN_BYTES
    ).toString("hex");

  const tokenHash =
    hashPasswordResetToken(
      token
    );

  const expiresAt =
    new Date(
      Date.now() +
        PASSWORD_RESET_TTL_MS
    );

  return {
    token,
    tokenHash,
    expiresAt,
  };
}

function createPasswordResetUrl(
  token: string
) {
  const url =
    new URL(
      "/reset-password",
      env.CLIENT_URL
    );

  url.searchParams.set(
    "token",
    token
  );

  return url.toString();
}

/*
|--------------------------------------------------------------------------
| VALIDATION
|--------------------------------------------------------------------------
*/

const registerSchema =
  z.object({
    name: z
      .string()
      .trim()
      .min(
        2,
        "Name must contain at least 2 characters."
      )
      .max(
        100,
        "Name is too long."
      ),

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

    password: z
      .string()
      .min(
        8,
        "Password must contain at least 8 characters."
      )
      .max(
        128,
        "Password is too long."
      )
      .regex(
        /[A-Z]/,
        "Password must contain at least one uppercase letter."
      )
      .regex(
        /[a-z]/,
        "Password must contain at least one lowercase letter."
      )
      .regex(
        /[0-9]/,
        "Password must contain at least one number."
      ),

    jobTitle: z
      .string()
      .trim()
      .max(100)
      .optional()
      .nullable(),
  });

const loginSchema =
  z.object({
    email: z
      .string()
      .trim()
      .email(
        "Enter a valid email address."
      )
      .transform(
        (value) =>
          value.toLowerCase()
      ),

    password: z
      .string()
      .min(
        1,
        "Password is required."
      ),
  });

const verifyEmailSchema =
  z.object({
    token: z
      .string()
      .trim()
      .length(
        64,
        "Verification token is invalid."
      ),
  });

const resendVerificationSchema =
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
  });

const forgotPasswordSchema =
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
  });

const resetPasswordSchema =
  z.object({
    token: z
      .string()
      .trim()
      .length(
        64,
        "Password reset token is invalid."
      ),

    password: z
      .string()
      .min(
        8,
        "Password must contain at least 8 characters."
      )
      .max(
        128,
        "Password is too long."
      )
      .regex(
        /[A-Z]/,
        "Password must contain at least one uppercase letter."
      )
      .regex(
        /[a-z]/,
        "Password must contain at least one lowercase letter."
      )
      .regex(
        /[0-9]/,
        "Password must contain at least one number."
      ),
  });

/*
|--------------------------------------------------------------------------
| COOKIE
|--------------------------------------------------------------------------
*/

const isProduction =
  env.NODE_ENV ===
  "production";

const authCookieOptions:
  CookieOptions = {
    httpOnly: true,

    secure:
      isProduction,

    sameSite:
      isProduction
        ? "none"
        : "lax",

    path: "/",
  };

const AUTH_COOKIE_MAX_AGE =
  7 *
  24 *
  60 *
  60 *
  1000;

function setAuthCookie(
  response: Response,
  token: string
) {
  response.cookie(
    env.AUTH_COOKIE_NAME,
    token,
    {
      ...authCookieOptions,

      maxAge:
        AUTH_COOKIE_MAX_AGE,
    }
  );
}

function clearAuthCookie(
  response: Response
) {
  response.clearCookie(
    env.AUTH_COOKIE_NAME,
    authCookieOptions
  );
}

/*
|--------------------------------------------------------------------------
| REGISTER
|--------------------------------------------------------------------------
*/

export async function register(
  request: Request,
  response: Response
) {
  const data =
    registerSchema.parse(
      request.body
    );

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
    existingUser
  ) {
    throw new AppError(
      "An account with this email already exists.",
      409,
      "EMAIL_ALREADY_EXISTS"
    );
  }

  const passwordHash =
    await hashPassword(
      data.password
    );

  const verification =
    createEmailVerificationToken();

  const user =
    await prisma.$transaction(
      async (tx) => {
        const createdUser =
          await tx.user.create({
            data: {
              name:
                data.name,

              email:
                data.email,

              passwordHash,

              jobTitle:
                data.jobTitle ||
                null,
            },

            select: {
              id: true,
              name: true,
              email: true,
              jobTitle: true,
              emailVerifiedAt: true,
              createdAt: true,
              updatedAt: true,
            },
          });

        await tx.notificationPreference.create({
          data: {
            userId:
              createdUser.id,
          },
        });

        await tx.emailVerificationToken.create({
          data: {
            userId:
              createdUser.id,

            tokenHash:
              verification.tokenHash,

            expiresAt:
              verification.expiresAt,
          },
        });

        return createdUser;
      }
    );

  let verificationEmailSent =
    true;

  try {
    await sendEmailVerificationEmail({
      to:
        user.email,

      name:
        user.name,

      verificationUrl:
        createEmailVerificationUrl(
          verification.token
        ),

      expiresAt:
        verification.expiresAt,
    });
  } catch {
    verificationEmailSent =
      false;
  }

  /*
   * Do not authenticate the user here.
   * They must verify their email first.
   */
  response
    .status(201)
    .json({
      success: true,

      message:
        verificationEmailSent
          ? "Account created. Check your email to verify your account."
          : "Account created, but the verification email could not be sent. Please request a new verification email.",

      data: {
        email:
          user.email,

        requiresEmailVerification:
          true,

        verificationEmailSent,
      },
    });
}

/*
|--------------------------------------------------------------------------
| VERIFY EMAIL
|--------------------------------------------------------------------------
*/

export async function verifyEmail(
  request: Request,
  response: Response
) {
  const data =
    verifyEmailSchema.parse(
      request.body
    );

  const tokenHash =
    hashEmailVerificationToken(
      data.token
    );

  const verificationRecord =
    await prisma.emailVerificationToken.findUnique({
      where: {
        tokenHash,
      },

      select: {
        id: true,
        userId: true,
        expiresAt: true,

        user: {
          select: {
            emailVerifiedAt: true,
          },
        },
      },
    });

  if (
    !verificationRecord
  ) {
    throw new AppError(
      "This verification link is invalid or has already been used.",
      400,
      "INVALID_VERIFICATION_TOKEN"
    );
  }

  if (
    verificationRecord.user
      .emailVerifiedAt
  ) {
    await prisma.emailVerificationToken.delete({
      where: {
        id:
          verificationRecord.id,
      },
    });

    response.json({
      success: true,

      message:
        "Your email address is already verified.",
    });

    return;
  }

  if (
    verificationRecord.expiresAt.getTime() <=
    Date.now()
  ) {
    await prisma.emailVerificationToken.delete({
      where: {
        id:
          verificationRecord.id,
      },
    });

    throw new AppError(
      "This verification link has expired. Request a new verification email.",
      410,
      "VERIFICATION_TOKEN_EXPIRED"
    );
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.user.update({
        where: {
          id:
            verificationRecord.userId,
        },

        data: {
          emailVerifiedAt:
            new Date(),
        },
      });

      await tx.emailVerificationToken.delete({
        where: {
          id:
            verificationRecord.id,
        },
      });
    }
  );

  response.json({
    success: true,

    message:
      "Email verified successfully. You can now sign in.",
  });
}

/*
|--------------------------------------------------------------------------
| RESEND VERIFICATION EMAIL
|--------------------------------------------------------------------------
*/

export async function resendVerificationEmail(
  request: Request,
  response: Response
) {
  const data =
    resendVerificationSchema.parse(
      request.body
    );

  const genericMessage =
    "If this account still needs verification, a verification email has been sent.";

  const user =
    await prisma.user.findUnique({
      where: {
        email:
          data.email,
      },

      select: {
        id: true,
        name: true,
        email: true,
        emailVerifiedAt: true,
      },
    });

  if (
    !user ||
    user.emailVerifiedAt
  ) {
    response.json({
      success: true,

      message:
        genericMessage,
    });

    return;
  }

  const existingToken =
    await prisma.emailVerificationToken.findUnique({
      where: {
        userId:
          user.id,
      },

      select: {
        createdAt: true,
      },
    });

  if (
    existingToken &&
    Date.now() -
      existingToken.createdAt.getTime() <
      EMAIL_VERIFICATION_RESEND_COOLDOWN_MS
  ) {
    response.json({
      success: true,

      message:
        genericMessage,
    });

    return;
  }

  const verification =
    createEmailVerificationToken();

  const createdAt =
    new Date();

  await prisma.emailVerificationToken.upsert({
    where: {
      userId:
        user.id,
    },

    update: {
      tokenHash:
        verification.tokenHash,

      expiresAt:
        verification.expiresAt,

      createdAt,
    },

    create: {
      userId:
        user.id,

      tokenHash:
        verification.tokenHash,

      expiresAt:
        verification.expiresAt,

      createdAt,
    },
  });

  await sendEmailVerificationEmail({
    to:
      user.email,

    name:
      user.name,

    verificationUrl:
      createEmailVerificationUrl(
        verification.token
      ),

    expiresAt:
      verification.expiresAt,
  });

  response.json({
    success: true,

    message:
      genericMessage,
  });
}

/*
|--------------------------------------------------------------------------
| FORGOT PASSWORD
|--------------------------------------------------------------------------
*/

export async function forgotPassword(
  request: Request,
  response: Response
) {
  const data =
    forgotPasswordSchema.parse(
      request.body
    );

  const genericMessage =
    "If an account exists for that email, a password reset link has been sent.";

  const user =
    await prisma.user.findUnique({
      where: {
        email:
          data.email,
      },

      select: {
        id: true,
        name: true,
        email: true,
      },
    });

  if (
    !user
  ) {
    response.json({
      success: true,

      message:
        genericMessage,
    });

    return;
  }

  const existingToken =
    await prisma.passwordResetToken.findUnique({
      where: {
        userId:
          user.id,
      },

      select: {
        createdAt: true,
      },
    });

  if (
    existingToken &&
    Date.now() -
      existingToken.createdAt.getTime() <
      PASSWORD_RESET_RESEND_COOLDOWN_MS
  ) {
    response.json({
      success: true,

      message:
        genericMessage,
    });

    return;
  }

  const reset =
    createPasswordResetToken();

  const createdAt =
    new Date();

  await prisma.passwordResetToken.upsert({
    where: {
      userId:
        user.id,
    },

    update: {
      tokenHash:
        reset.tokenHash,

      expiresAt:
        reset.expiresAt,

      createdAt,
    },

    create: {
      userId:
        user.id,

      tokenHash:
        reset.tokenHash,

      expiresAt:
        reset.expiresAt,

      createdAt,
    },
  });

  try {
    await sendPasswordResetEmail({
      to:
        user.email,

      name:
        user.name,

      resetUrl:
        createPasswordResetUrl(
          reset.token
        ),

      expiresAt:
        reset.expiresAt,
    });
  } catch (error) {
    /*
     * Do not reveal whether the email belongs
     * to an existing account by returning a
     * different HTTP response.
     *
     * The email service already logs the
     * provider-side failure.
     */
  }

  response.json({
    success: true,

    message:
      genericMessage,
  });
}

/*
|--------------------------------------------------------------------------
| RESET PASSWORD
|--------------------------------------------------------------------------
*/

export async function resetPassword(
  request: Request,
  response: Response
) {
  const data =
    resetPasswordSchema.parse(
      request.body
    );

  const tokenHash =
    hashPasswordResetToken(
      data.token
    );

  const resetRecord =
    await prisma.passwordResetToken.findUnique({
      where: {
        tokenHash,
      },

      select: {
        id: true,
        userId: true,
        expiresAt: true,
      },
    });

  if (
    !resetRecord
  ) {
    throw new AppError(
      "This password reset link is invalid or has already been used.",
      400,
      "INVALID_PASSWORD_RESET_TOKEN"
    );
  }

  if (
    resetRecord.expiresAt.getTime() <=
    Date.now()
  ) {
    await prisma.passwordResetToken.delete({
      where: {
        id:
          resetRecord.id,
      },
    });

    throw new AppError(
      "This password reset link has expired. Request a new one.",
      410,
      "PASSWORD_RESET_TOKEN_EXPIRED"
    );
  }

  const passwordHash =
    await hashPassword(
      data.password
    );

  await prisma.$transaction(
    async (tx) => {
      await tx.user.update({
        where: {
          id:
            resetRecord.userId,
        },

        data: {
          passwordHash,
        },
      });

      await tx.passwordResetToken.delete({
        where: {
          id:
            resetRecord.id,
        },
      });
    }
  );

  /*
   * If the reset link is opened in a browser
   * that already has a KiteDesk auth cookie,
   * remove that local cookie.
   */
  clearAuthCookie(
    response
  );

  response.json({
    success: true,

    message:
      "Password reset successfully. You can now sign in with your new password.",
  });
}

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

export async function login(
  request: Request,
  response: Response
) {
  const data =
    loginSchema.parse(
      request.body
    );

  const user =
    await prisma.user.findUnique({
      where: {
        email:
          data.email,
      },

      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        jobTitle: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

  if (
    !user
  ) {
    throw new AppError(
      "Invalid email or password.",
      401,
      "INVALID_CREDENTIALS"
    );
  }

  const passwordMatches =
    await comparePassword(
      data.password,
      user.passwordHash
    );

  if (
    !passwordMatches
  ) {
    throw new AppError(
      "Invalid email or password.",
      401,
      "INVALID_CREDENTIALS"
    );
  }

  if (
    !user.emailVerifiedAt
  ) {
    throw new AppError(
      "Please verify your email address before signing in.",
      403,
      "EMAIL_NOT_VERIFIED"
    );
  }

  const token =
    createAuthToken({
      userId:
        user.id,
    });

  setAuthCookie(
    response,
    token
  );

  const {
    passwordHash:
      _passwordHash,

    ...safeUser
  } = user;

  response.json({
    success: true,

    message:
      "Logged in successfully.",

    data: {
      user:
        safeUser,

      token,
    },
  });
}

/*
|--------------------------------------------------------------------------
| ME
|--------------------------------------------------------------------------
*/

export async function me(
  request: Request,
  response: Response
) {
  response.json({
    success: true,

    data: {
      user:
        request.user,
    },
  });
}

/*
|--------------------------------------------------------------------------
| LOGOUT
|--------------------------------------------------------------------------
*/

export async function logout(
  _request: Request,
  response: Response
) {
  clearAuthCookie(
    response
  );

  response.json({
    success: true,

    message:
      "Logged out successfully.",
  });
}
