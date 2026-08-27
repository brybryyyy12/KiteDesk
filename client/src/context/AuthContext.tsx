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
  ) => Promise<AuthUser>;

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

  /*
   * true while we determine whether
   * the browser currently has a
   * valid authenticated session.
   */
  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  /*
  |--------------------------------------------------------------------------
  | REFRESH USER
  |--------------------------------------------------------------------------
  |
  | apiFetch will send:
  |
  | Authorization: Bearer <token>
  |
  | when a stored token exists.
  |
  | The HTTP-only cookie remains a
  | backend fallback.
  |
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

          /*
           * If the token has become
           * invalid/expired, clear the
           * frontend authentication state.
           */
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
  |
  | When the application loads:
  |
  | GET /api/auth/me
  |
  | apiFetch will attempt Bearer auth.
  |
  | If no Bearer token exists, the
  | backend can still use its cookie.
  |
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

          /*
           * Stored token may be expired
           * or invalid.
           */
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

        /*
         * Store Bearer token so all
         * following API requests can
         * authenticate even when the
         * browser rejects the cookie.
         */
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

        const registeredUser =
          response.data.user;

        const token =
          response.data.token;

        /*
         * IMPORTANT:
         *
         * This token will immediately be
         * available when WorkspaceContext
         * requests GET /api/workspaces.
         */
        saveAuthToken(
          token
        );

        setUser(
          registeredUser
        );

        return registeredUser;
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
          /*
           * The Bearer token is still
           * available here, therefore
           * apiFetch can authenticate
           * this logout request.
           */
          await authService.logout();
        } catch (error) {
          /*
           * Logout should still clear
           * frontend authentication even
           * if the server is temporarily
           * unavailable.
           */
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