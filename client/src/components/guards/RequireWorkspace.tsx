import type {
  ReactNode,
} from "react";

import {
  useNavigate,
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
  const navigate =
    useNavigate();

  const {
    hasWorkspace,
    isLoading,
    error,
    refreshWorkspaces,
  } =
    useWorkspace();

  /*
  |--------------------------------------------------------------------------
  | WAIT FOR WORKSPACE API
  |--------------------------------------------------------------------------
  |
  | WorkspaceContext needs to finish:
  |
  | GET /api/workspaces
  |
  | before we decide whether the user
  | currently has an available workspace.
  |
  */

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100dvh-73px)] items-center justify-center bg-kite-bg px-4">

        <div className="text-center">

          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-kite-line border-t-kite-blue-deep" />

          <p className="mt-4 text-sm text-kite-muted">
            Loading workspace...
          </p>

        </div>

      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | WORKSPACE API ERROR
  |--------------------------------------------------------------------------
  |
  | A failed API request does NOT mean
  | that the user has zero workspaces.
  |
  | Keep this separate from the valid
  | no-workspace state.
  |
  */

  if (error) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-73px)] max-w-[900px] items-center justify-center px-4 py-10 sm:px-6">

        <section className="w-full max-w-lg rounded-2xl border border-kite-line bg-white px-5 py-10 text-center shadow-sm sm:px-8 sm:py-12">

          {/* ERROR ICON */}

          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-red-500">

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
              />

              <path d="M12 8v5" />

              <path d="M12 17h.01" />
            </svg>

          </div>

          <h1 className="mt-5 text-xl font-semibold tracking-tight text-kite-ink">
            Unable to load your workspace
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-kite-muted">
            {error}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">

            <button
              type="button"
              onClick={() =>
                void refreshWorkspaces()
              }
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-kite-blue-deep px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
            >
              Try Again
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/dashboard"
                )
              }
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-kite-line bg-white px-5 py-3 text-sm font-medium text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink"
            >
              Go to Dashboard
            </button>

          </div>

        </section>

      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | NO WORKSPACE
  |--------------------------------------------------------------------------
  |
  | Having zero workspaces is now a valid
  | authenticated state.
  |
  | Do NOT redirect the user back to
  | onboarding.
  |
  | Routes wrapped in RequireWorkspace
  | instead show this friendly requirement
  | screen.
  |
  */

  if (!hasWorkspace) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-73px)] max-w-[1000px] items-center justify-center px-4 py-10 sm:px-6">

        <section className="w-full overflow-hidden rounded-2xl border border-kite-line bg-white shadow-sm">

          <div className="px-5 py-10 text-center sm:px-8 sm:py-14">

            {/* WORKSPACE ICON */}

            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-kite-blue-wash text-kite-blue-deep sm:h-20 sm:w-20">

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8 sm:h-9 sm:w-9"
                aria-hidden="true"
              >
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="15"
                  rx="2"
                />

                <path d="M8 5V3h8v2" />

                <path d="M8 11h8" />

                <path d="M12 8v6" />
              </svg>

            </div>

            <h1 className="mt-6 text-xl font-semibold tracking-tight text-kite-ink sm:text-2xl">
              A workspace is required
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-kite-muted">
              Projects and tasks belong to a
              workspace. Create one when
              you&apos;re ready to start
              organizing work and collaborating
              with your team.
            </p>

            {/* ACTIONS */}

            <div className="mx-auto mt-7 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/workspace/new"
                  )
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-kite-blue-deep px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
              >

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>

                Create Workspace

              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/dashboard"
                  )
                }
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-kite-line bg-white px-5 py-3 text-sm font-medium text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink"
              >
                Go to Dashboard
              </button>

            </div>

          </div>

          {/* INFO */}

          <div className="border-t border-kite-line bg-kite-soft/60 px-5 py-5 sm:px-8">

            <div className="grid gap-3 sm:grid-cols-3">

              <WorkspaceRequirementItem
                title="Projects"
                description="Organize related work."
              />

              <WorkspaceRequirementItem
                title="Team"
                description="Invite and manage members."
              />

              <WorkspaceRequirementItem
                title="Tasks"
                description="Assign and track work."
              />

            </div>

          </div>

        </section>

      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | WORKSPACE AVAILABLE
  |--------------------------------------------------------------------------
  */

  return children;
}

/*
|--------------------------------------------------------------------------
| REQUIREMENT ITEM
|--------------------------------------------------------------------------
*/

function WorkspaceRequirementItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-kite-line bg-white p-4">

      <div className="flex items-start gap-3">

        <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-kite-blue-wash text-xs font-semibold text-kite-blue-deep">
          ✓
        </div>

        <div className="min-w-0">

          <p className="text-sm font-medium text-kite-ink">
            {title}
          </p>

          <p className="mt-1 text-xs leading-5 text-kite-muted">
            {description}
          </p>

        </div>

      </div>

    </div>
  );
}

export default RequireWorkspace;