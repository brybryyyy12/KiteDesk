import type {
  NextFunction,
  Request,
  Response,
} from "express";

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
  verifyAuthToken,
} from "../utils/jwt.js";

function getTokenFromRequest(
  request: Request
): string | null {
  /*
   * 1) Try Authorization header first
   *
   * Authorization: Bearer <token>
   */
  const authHeader =
    request.headers.authorization;

  if (
    typeof authHeader ===
    "string"
  ) {
    const [
      scheme,
      token,
    ] = authHeader.split(" ");

    if (
      scheme?.toLowerCase() === "bearer" &&
      token?.trim()
    ) {
      return token.trim();
    }
  }

  /*
   * 2) Fallback to HTTP-only cookie
   */
  const cookieToken =
    request.cookies?.[
      env.AUTH_COOKIE_NAME
    ];

  if (
    typeof cookieToken ===
      "string" &&
    cookieToken.trim()
  ) {
    return cookieToken.trim();
  }

  return null;
}

export async function requireAuth(
  request: Request,
  _response: Response,
  next: NextFunction
) {
  try {
    const token =
      getTokenFromRequest(
        request
      );

    if (!token) {
      throw new AppError(
        "Authentication required.",
        401,
        "UNAUTHENTICATED"
      );
    }

    let payload:
      ReturnType<
        typeof verifyAuthToken
      >;

    try {
      payload =
        verifyAuthToken(
          token
        );
    } catch {
      throw new AppError(
        "Invalid or expired authentication token.",
        401,
        "INVALID_TOKEN"
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: payload.userId,
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

    if (!user) {
      throw new AppError(
        "User account no longer exists.",
        401,
        "USER_NOT_FOUND"
      );
    }

    request.user = user;

    next();
  } catch (error) {
    next(error);
  }
}