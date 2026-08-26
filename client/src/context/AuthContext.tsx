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
   * isLoading means:
   *
   * "We don't know yet whether
   * this browser has a valid
   * login cookie."
   */
  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const refreshUser =
    useCallback(
      async () => {
        try {
          const response =
            await authService.me();

          setUser(
            response.data.user
          );

          return response
            .data.user;
        } catch {
          setUser(null);

          return null;
        }
      },
      []
    );

  /*
   * Restore login when the app
   * first loads or refreshes.
   *
   * We don't use localStorage
   * for authentication.
   *
   * The server's HTTP-only
   * cookie is the source of truth.
   */
  useEffect(
    () => {
      let active = true;

      async function initializeAuth() {
        try {
          const response =
            await authService.me();

          if (!active) {
            return;
          }

          setUser(
            response.data.user
          );
        } catch {
          if (!active) {
            return;
          }

          setUser(null);
        } finally {
          if (active) {
            setIsLoading(
              false
            );
          }
        }
      }

      void initializeAuth();

      return () => {
        active = false;
      };
    },
    []
  );

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

        setUser(
          loggedInUser
        );

        return loggedInUser;
      },
      []
    );

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

        setUser(
          registeredUser
        );

        return registeredUser;
      },
      []
    );

  const logout =
    useCallback(
      async () => {
        try {
          await authService.logout();
        } finally {
          /*
           * Clear frontend state even
           * if the logout request has
           * a temporary network error.
           */
          setUser(null);
        }
      },
      []
    );

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

export function useAuth() {
  const context =
    useContext(
      AuthContext
    );

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
}