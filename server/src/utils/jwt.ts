import jwt, {
  type JwtPayload,
  type SignOptions,
} from "jsonwebtoken";

import {
  env,
} from "../config/env.js";

export type AuthTokenPayload = {
  userId: string;
};

export function createAuthToken(
  payload: AuthTokenPayload
) {
  const options: SignOptions =
    {
      expiresIn:
        env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
    };

  return jwt.sign(
    payload,
    env.JWT_SECRET,
    options
  );
}

export function verifyAuthToken(
  token: string
): AuthTokenPayload {
  const decoded =
    jwt.verify(
      token,
      env.JWT_SECRET
    ) as JwtPayload;

  if (
    typeof decoded.userId !==
    "string"
  ) {
    throw new Error(
      "Invalid authentication token."
    );
  }

  return {
    userId:
      decoded.userId,
  };
}