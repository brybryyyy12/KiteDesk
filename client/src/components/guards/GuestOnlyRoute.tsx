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

type GuestOnlyRouteProps = {
  children: ReactNode;
};

function getSafeReturnTo(
  search: string
) {
  const params =
    new URLSearchParams(
      search
    );

  const returnTo =
    params.get(
      "returnTo"
    );

  if (
    !returnTo ||
    !returnTo.startsWith("/") ||
    returnTo.startsWith("//")
  ) {
    return "/dashboard";
  }

  return returnTo;
}

function GuestOnlyRoute({
  children,
}: GuestOnlyRouteProps) {
  const {
    isAuthenticated,
    isLoading,
  } =
    useAuth();

  const location =
    useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kite-bg">
        <div className="text-sm text-kite-muted">
          Loading KiteDesk...
        </div>
      </div>
    );
  }

  if (
    isAuthenticated
  ) {
    return (
      <Navigate
        to={getSafeReturnTo(
          location.search
        )}
        replace
      />
    );
  }

  return children;
}

export default GuestOnlyRoute;