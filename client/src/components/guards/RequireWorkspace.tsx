import type {
  ReactNode,
} from "react";

import {
  Navigate,
} from "react-router";

import {
  useWorkspace,
} from "../../context/WorkspaceContext";

type RequireWorkspaceProps = {
  children: ReactNode;
};

function RequireWorkspace({
  children,
}: RequireWorkspaceProps) {
  const {
    hasWorkspace,
    isLoading,
    error,
  } = useWorkspace();

  /*
  |--------------------------------------------------------------------------
  | WAIT FOR WORKSPACE API
  |--------------------------------------------------------------------------
  |
  | On refresh:
  |
  | AuthContext
  |   ↓
  | GET /api/auth/me
  |
  | WorkspaceContext
  |   ↓
  | GET /api/workspaces
  |
  | We must wait until that second
  | request finishes before deciding
  | whether the user needs onboarding.
  |
  */

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kite-bg">
        <div className="text-sm text-kite-muted">
          Loading workspace...
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | LOAD ERROR
  |--------------------------------------------------------------------------
  |
  | Do NOT redirect to onboarding when
  | the API failed.
  |
  | An API/network failure does not mean
  | the user has no workspace.
  |
  */

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kite-bg px-6">
        <div className="w-full max-w-md rounded-2xl border border-kite-line bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-kite-ink">
            Unable to load workspace
          </h2>

          <p className="mt-2 text-sm leading-6 text-kite-muted">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
            className="mt-5 rounded-xl bg-gradient-to-br from-kite-blue to-kite-blue-deep px-5 py-2.5 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | NO WORKSPACE
  |--------------------------------------------------------------------------
  */

  if (!hasWorkspace) {
    return (
      <Navigate
        to="/onboarding/workspace"
        replace
      />
    );
  }

  return children;
}

export default RequireWorkspace;