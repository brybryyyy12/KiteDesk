import {
  apiFetch,
} from "../lib/api";

import type {
  AuthUserResponse,
  LoginInput,
  MeResponse,
  RegisterInput,
  RegisterResponse,
  ResendVerificationInput,
  ResendVerificationResponse,
  VerifyEmailInput,
  VerifyEmailResponse,
} from "../types/auth";

export const authService = {
  register(
    input: RegisterInput
  ) {
    return apiFetch<RegisterResponse>(
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
    return apiFetch<MeResponse>(
      "/auth/me"
    );
  },

  verifyEmail(
    input: VerifyEmailInput
  ) {
    return apiFetch<VerifyEmailResponse>(
      "/auth/verify-email",
      {
        method: "POST",
        body: input,
      }
    );
  },

  resendVerification(
    input: ResendVerificationInput
  ) {
    return apiFetch<ResendVerificationResponse>(
      "/auth/resend-verification",
      {
        method: "POST",
        body: input,
      }
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
