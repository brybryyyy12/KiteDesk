export type AuthUser = {
  id: string;

  name: string;

  email: string;

  jobTitle: string | null;

  emailVerifiedAt?: string | null;

  createdAt: string;

  updatedAt: string;
};

export type LoginInput = {
  email: string;

  password: string;
};

export type RegisterInput = {
  name: string;

  email: string;

  password: string;

  jobTitle?: string | null;
};

export type RegisterResult = {
  email: string;

  requiresEmailVerification: true;

  verificationEmailSent: boolean;
};

export type RegisterResponse = {
  success: true;

  message: string;

  data: RegisterResult;
};

export type AuthUserResponse = {
  success: true;

  message?: string;

  data: {
    user: AuthUser;

    token: string;
  };
};

export type MeResponse = {
  success: true;

  data: {
    user: AuthUser;
  };
};

export type VerifyEmailInput = {
  token: string;
};

export type VerifyEmailResponse = {
  success: true;

  message: string;
};

export type ResendVerificationInput = {
  email: string;
};

export type ResendVerificationResponse = {
  success: true;

  message: string;
};

/*
|--------------------------------------------------------------------------
| PASSWORD RECOVERY
|--------------------------------------------------------------------------
*/

export type ForgotPasswordInput = {
  email: string;
};

export type ForgotPasswordResponse = {
  success: true;

  message: string;
};

export type ResetPasswordInput = {
  token: string;

  password: string;
};

export type ResetPasswordResponse = {
  success: true;

  message: string;
};
