import {
  apiFetch,
} from "../lib/api";

import type {
  AuthUserResponse,
  LoginInput,
  RegisterInput,
} from "../types/auth";

export const authService = {
  register(
    input: RegisterInput
  ) {
    return apiFetch<AuthUserResponse>(
      "/auth/register",
      {
        method: "POST",
        body: input,
      }
    );
  },

  login(
    input: LoginInput
  ) {
    return apiFetch<AuthUserResponse>(
      "/auth/login",
      {
        method: "POST",
        body: input,
      }
    );
  },

  me() {
    return apiFetch<AuthUserResponse>(
      "/auth/me"
    );
  },

  logout() {
    return apiFetch<{
      success: true;
      message: string;
    }>(
      "/auth/logout",
      {
        method: "POST",
      }
    );
  },
};