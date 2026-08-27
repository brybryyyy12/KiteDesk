export type AuthUser = {
  id: string;

  name: string;

  email: string;

  jobTitle: string | null;

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

export type AuthUserResponse = {
  success: true;

  message?: string;

  data: {
    user: AuthUser;

    token: string;
  };
};