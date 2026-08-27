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
*/

const isProduction =
  env.NODE_ENV ===
  "production";

const authCookieOptions:
  CookieOptions = {
    httpOnly: true,

    secure: isProduction,

    sameSite: "lax",

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

  const token =
    createAuthToken({
      userId:
        user.id,
    });

  setAuthCookie(
    response,
    token
  );

  response
    .status(201)
    .json({
      success: true,

      message:
        "Account created successfully.",

      data: {
        user,
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
  if (!user) {
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