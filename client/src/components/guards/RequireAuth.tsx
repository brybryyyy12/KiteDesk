import type {
  ReactNode,
} from "react";

import {
  Navigate,
  useLocation,
} from "react-router";

import {
  useAuth,
} from "../../context/AuthContext";

type RequireAuthProps = {
  children: ReactNode;
};

export default function RequireAuth({
  children,
}: RequireAuthProps) {
  const {
    isAuthenticated,
    isLoading,
  } =
    useAuth();

  const location =
    useLocation();

  /*
   * Important:
   *
   * Don't redirect while /auth/me
   * is still checking the cookie.
   */
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F5F1]">
        <div className="text-sm text-[#7A8089]">
          Loading KiteDesk...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname,
        }}
      />
    );
  }

  return children;
}