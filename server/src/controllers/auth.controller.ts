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

/*
|--------------------------------------------------------------------------
| COOKIE
|--------------------------------------------------------------------------
|
| Development:
|
| http://localhost:5173
| http://localhost:5000
|
| secure   = false
| sameSite = lax
|
| Production:
|
| https://kitedesk.onrender.com
| https://kitedesk-api.onrender.com
|
| secure   = true
| sameSite = none
|
| NOTE:
|
| We still keep the HTTP-only cookie
| for browsers that support it.
|
| The token is also returned in the
| JSON response so the frontend can
| send:
|
| Authorization: Bearer <token>
|
| This helps browsers that block
| cross-site cookies.
|
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

/*
|--------------------------------------------------------------------------
| SET AUTH COOKIE
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| CLEAR AUTH COOKIE
|--------------------------------------------------------------------------
*/

function clearAuthCookie(
  response: Response
) {
  /*
   * Clearing must use the same
   * cookie scope used when the
   * cookie was created.
   */
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

  /*
   * Check whether the email
   * already belongs to an account.
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

  if (
    existingUser
  ) {
    throw new AppError(
      "An account with this email already exists.",
      409,
      "EMAIL_ALREADY_EXISTS"
    );
  }

  /*
   * Hash password before storing.
   */
  const passwordHash =
    await hashPassword(
      data.password
    );

  /*
   * User + notification preferences
   * should either both succeed
   * or both fail.
   */
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

        return createdUser;
      }
    );

  /*
   * Create JWT.
   */
  const token =
    createAuthToken({
      userId:
        user.id,
    });

  /*
   * Keep cookie authentication
   * for supported browsers.
   */
  setAuthCookie(
    response,
    token
  );

  /*
   * Also return token so the
   * frontend can use Bearer auth.
   */
  response
    .status(201)
    .json({
      success: true,

      message:
        "Account created successfully.",

      data: {
        user,

        token,
      },
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

  /*
   * Find user by normalized email.
   */
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
        createdAt: true,
        updatedAt: true,
      },
    });

  /*
   * Keep the same error message
   * for an unknown email and
   * incorrect password.
   */
  if (
    !user
  ) {
    throw new AppError(
      "Invalid email or password.",
      401,
      "INVALID_CREDENTIALS"
    );
  }

  /*
   * Verify password.
   */
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

  /*
   * Create JWT.
   */
  const token =
    createAuthToken({
      userId:
        user.id,
    });

  /*
   * Keep cookie authentication
   * for browsers that support it.
   */
  setAuthCookie(
    response,
    token
  );

  /*
   * Never return passwordHash
   * to the frontend.
   */
  const {
    passwordHash:
      _passwordHash,

    ...safeUser
  } = user;

  /*
   * Return both user and token.
   *
   * Token is used by the frontend
   * for Authorization: Bearer ...
   */
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
  /*
   * requireAuth middleware has
   * already populated request.user.
   */
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
  /*
   * Remove HTTP-only cookie.
   *
   * Frontend will separately remove
   * its stored Bearer token.
   */
  clearAuthCookie(
    response
  );

  response.json({
    success: true,

    message:
      "Logged out successfully.",
  });
}