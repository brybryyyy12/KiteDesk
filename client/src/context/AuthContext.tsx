import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  authService,
} from "../services/auth.service";

import type {
  AuthUser,
  LoginInput,
  RegisterInput,
  RegisterResult,
} from "../types/auth";

/*
|--------------------------------------------------------------------------
| AUTH TOKEN STORAGE
|--------------------------------------------------------------------------
|
| The backend still uses the HTTP-only
| cookie when the browser supports it.
|
| We also store the JWT so browsers
| that reject the cross-site cookie
| can authenticate with:
|
| Authorization: Bearer <token>
|
*/

export const AUTH_TOKEN_KEY =
  "kitedesk_auth_token";

/*
|--------------------------------------------------------------------------
| SAFE TOKEN STORAGE
|--------------------------------------------------------------------------
*/

function saveAuthToken(
  token: string
) {
  try {
    window.localStorage.setItem(
      AUTH_TOKEN_KEY,
      token
    );
  } catch (error) {
    console.warn(
      "Unable to save authentication token:",
      error
    );
  }
}

function removeAuthToken() {
  try {
    window.localStorage.removeItem(
      AUTH_TOKEN_KEY
    );
  } catch (error) {
    console.warn(
      "Unable to remove authentication token:",
      error
    );
  }
}

/*
|--------------------------------------------------------------------------
| CONTEXT TYPE
|--------------------------------------------------------------------------
*/

type AuthContextValue = {
  user: AuthUser | null;

  isAuthenticated: boolean;

  isLoading: boolean;

  login: (
    input: LoginInput
  ) => Promise<AuthUser>;

  register: (
    input: RegisterInput
  ) => Promise<RegisterResult>;

  logout: () =>
    Promise<void>;

  refreshUser: () =>
    Promise<AuthUser | null>;

  setUser:
    React.Dispatch<
      React.SetStateAction<
        AuthUser | null
      >
    >;
};

const AuthContext =
  createContext<
    AuthContextValue | undefined
  >(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

/*
|--------------------------------------------------------------------------
| AUTH PROVIDER
|--------------------------------------------------------------------------
*/

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [
    user,
    setUser,
  ] =
    useState<
      AuthUser | null
    >(null);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  /*
  |--------------------------------------------------------------------------
  | REFRESH USER
  |--------------------------------------------------------------------------
  */

  const refreshUser =
    useCallback(
      async () => {
        try {
          const response =
            await authService.me();

          const currentUser =
            response.data.user;

          setUser(
            currentUser
          );

          return currentUser;
        } catch (error) {
          console.warn(
            "Unable to refresh authenticated user:",
            error
          );

          removeAuthToken();

          setUser(
            null
          );

          return null;
        }
      },
      []
    );

  /*
  |--------------------------------------------------------------------------
  | INITIALIZE AUTH
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      let active =
        true;

      async function initializeAuth() {
        try {
          const response =
            await authService.me();

          if (
            !active
          ) {
            return;
          }

          setUser(
            response.data.user
          );
        } catch {
          if (
            !active
          ) {
            return;
          }

          removeAuthToken();

          setUser(
            null
          );
        } finally {
          if (
            active
          ) {
            setIsLoading(
              false
            );
          }
        }
      }

      void initializeAuth();

      return () => {
        active =
          false;
      };
    },
    []
  );

  /*
  |--------------------------------------------------------------------------
  | LOGIN
  |--------------------------------------------------------------------------
  */

  const login =
    useCallback(
      async (
        input: LoginInput
      ) => {
        const response =
          await authService.login(
            input
          );

        const loggedInUser =
          response.data.user;

        const token =
          response.data.token;

        saveAuthToken(
          token
        );

        setUser(
          loggedInUser
        );

        return loggedInUser;
      },
      []
    );

  /*
  |--------------------------------------------------------------------------
  | REGISTER
  |--------------------------------------------------------------------------
  |
  | Registration no longer authenticates
  | the user.
  |
  | The backend creates an unverified
  | account, sends a verification email,
  | and returns only verification state.
  |
  */

  const register =
    useCallback(
      async (
        input: RegisterInput
      ) => {
        const response =
          await authService.register(
            input
          );

        /*
         * Never create a frontend session
         * from a registration response.
         */
        removeAuthToken();

        setUser(
          null
        );

        return response.data;
      },
      []
    );

  /*
  |--------------------------------------------------------------------------
  | LOGOUT
  |--------------------------------------------------------------------------
  */

  const logout =
    useCallback(
      async () => {
        try {
          await authService.logout();
        } catch (error) {
          console.warn(
            "Server logout request failed:",
            error
          );
        } finally {
          removeAuthToken();

          setUser(
            null
          );
        }
      },
      []
    );

  /*
  |--------------------------------------------------------------------------
  | CONTEXT VALUE
  |--------------------------------------------------------------------------
  */

  const value =
    useMemo<AuthContextValue>(
      () => ({
        user,

        isAuthenticated:
          user !== null,

        isLoading,

        login,

        register,

        logout,

        refreshUser,

        setUser,
      }),
      [
        user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      ]
    );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

/*
|--------------------------------------------------------------------------
| AUTH HOOK
|--------------------------------------------------------------------------
*/

export function useAuth() {
  const context =
    useContext(
      AuthContext
    );

  if (
    !context
  ) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
}
