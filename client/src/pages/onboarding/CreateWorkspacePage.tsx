import {
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  useNavigate,
} from "react-router";

import KiteDeskLogo from "../../components/auth/KiteDeskLogo";

import {
  useWorkspace,
} from "../../context/WorkspaceContext";

import {
  ApiError,
} from "../../lib/api";

/*
|--------------------------------------------------------------------------
| SLUG PREVIEW
|--------------------------------------------------------------------------
|
| The backend generates the real slug.
|
| This is only a visual preview for
| the user while typing the workspace
| name.
|
*/

function createSlugPreview(
  value: string
) {
  return value
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9\s-]/g,
      ""
    )
    .replace(
      /\s+/g,
      "-"
    )
    .replace(
      /-+/g,
      "-"
    );
}

function CreateWorkspacePage() {
  const navigate =
    useNavigate();

  const {
    createWorkspace,
  } =
    useWorkspace();

  const [
    workspaceName,
    setWorkspaceName,
  ] =
    useState("");

  const [
    errors,
    setErrors,
  ] =
    useState<{
      name?: string;
    }>({});

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  const [
    serverError,
    setServerError,
  ] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | URL PREVIEW
  |--------------------------------------------------------------------------
  */

  const workspaceSlugPreview =
    useMemo(
      () =>
        createSlugPreview(
          workspaceName
        ),
      [workspaceName]
    );

  /*
  |--------------------------------------------------------------------------
  | SUBMIT
  |--------------------------------------------------------------------------
  */

  const handleSubmit =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      setServerError("");

      const nextErrors: {
        name?: string;
      } = {};

      const trimmedName =
        workspaceName.trim();

      if (
        trimmedName.length <
        2
      ) {
        nextErrors.name =
          "Workspace name must contain at least 2 characters.";
      }

      if (
        Object.keys(
          nextErrors
        ).length > 0
      ) {
        setErrors(
          nextErrors
        );

        return;
      }

      setErrors({});

      setIsSubmitting(
        true
      );

      try {
        /*
         * REAL BACKEND REQUEST:
         *
         * POST /api/workspaces
         *
         * WorkspaceContext now waits
         * for Express/PostgreSQL and
         * returns the real workspace.
         */
        await createWorkspace({
          name:
            trimmedName,
        });

        /*
         * At this point:
         *
         * Workspace exists in PostgreSQL
         * OWNER membership exists
         * WorkspaceContext is updated
         */
        navigate(
          "/dashboard",
          {
            replace: true,
          }
        );
      } catch (error) {
        console.error(
          "Workspace creation failed:",
          error
        );

        if (
          error instanceof
          ApiError
        ) {
          setServerError(
            error.message
          );
        } else {
          setServerError(
            "Unable to create your workspace. Please try again."
          );
        }
      } finally {
        setIsSubmitting(
          false
        );
      }
    };

  return (
    <main className="auth-background min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[30px] border border-kite-line bg-white/80 shadow-[0_20px_60px_-30px_rgba(46,51,56,0.22)] backdrop-blur-sm sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]">

        {/* LEFT */}

        <section className="relative hidden w-[48%] overflow-hidden border-r border-kite-line lg:flex lg:flex-col lg:justify-center">
          <div className="relative z-10 px-14 xl:px-20">
            <div className="mb-12 flex h-40 w-40 items-center justify-center rounded-[38px] border border-kite-line bg-white/70 shadow-[0_20px_50px_-30px_rgba(46,51,56,0.25)]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2e3338"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-24 w-24"
              >
                <path
                  d="M12 2.5 19.5 9 12 21.5 4.5 9Z"
                  fill="#EAF1F6"
                />

                <path
                  d="M12 2.5V21.5M4.5 9H19.5"
                />

                <path
                  d="M12 21.5c-2.2 1.7-4.3 1.6-6.1.3"
                />
              </svg>
            </div>

            <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-kite-blue-deep">
              One last step
            </p>

            <h1 className="max-w-md text-5xl font-semibold leading-[1.08] tracking-[-0.03em] text-kite-ink">
              Give your team
              <br />
              a place to work.
            </h1>

            <p className="mt-6 max-w-sm text-[15px] leading-7 text-kite-muted">
              Your workspace keeps
              your projects, tasks,
              members, and activity
              organized in one place.
            </p>

            <div className="mt-12 max-w-sm space-y-5">
              {/* STEP 1 */}

              <div className="flex items-center gap-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-kite-blue-deep text-xs font-medium text-white">
                  ✓
                </span>

                <div>
                  <p className="text-sm font-medium text-kite-ink">
                    Create your account
                  </p>

                  <p className="mt-0.5 text-xs text-kite-muted">
                    Your KiteDesk
                    profile is ready.
                  </p>
                </div>
              </div>

              {/* STEP 2 */}

              <div className="flex items-center gap-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-kite-blue-wash text-xs font-semibold text-kite-blue-deep">
                  2
                </span>

                <div>
                  <p className="text-sm font-medium text-kite-ink">
                    Create your workspace
                  </p>

                  <p className="mt-0.5 text-xs text-kite-muted">
                    Set up your
                    team&apos;s home.
                  </p>
                </div>
              </div>

              {/* STEP 3 */}

              <div className="flex items-center gap-4 opacity-50">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-kite-line bg-white text-xs font-medium text-kite-muted">
                  3
                </span>

                <div>
                  <p className="text-sm font-medium text-kite-ink">
                    Invite your team
                  </p>

                  <p className="mt-0.5 text-xs text-kite-muted">
                    Add members when
                    you&apos;re ready.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <svg
            viewBox="0 0 400 400"
            fill="none"
            className="pointer-events-none absolute -right-24 top-12 h-[430px] w-[430px] opacity-[0.07]"
          >
            <path
              d="M200 40 335 165 200 355 65 165Z"
              stroke="#6E94B0"
              strokeWidth="1.3"
            />

            <path
              d="M200 40V355M65 165H335"
              stroke="#6E94B0"
            />
          </svg>

          <div className="pointer-events-none absolute -bottom-44 -left-32 h-[470px] w-[470px] rounded-full bg-kite-blue-wash/70 blur-3xl" />
        </section>

        {/* RIGHT */}

        <section className="flex w-full items-center justify-center px-5 py-8 sm:px-10 lg:w-[52%] lg:px-14">
          <div className="w-full max-w-[460px]">
            <div className="mb-10">
              <KiteDeskLogo />
            </div>

            <div className="mb-8">
              <p className="mb-2 text-sm font-medium text-kite-blue-deep lg:hidden">
                Step 2 of 3
              </p>

              <h2 className="text-3xl font-semibold tracking-tight text-kite-ink">
                Create your workspace
              </h2>

              <p className="mt-3 text-sm leading-6 text-kite-muted">
                Your workspace is
                where your team will
                organize projects and
                manage work.
              </p>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-6"
              noValidate
            >
              {/* NAME */}

              <div>
                <label
                  htmlFor="workspace-name"
                  className="mb-2 block text-sm font-medium text-kite-muted"
                >
                  Workspace name
                </label>

                <input
                  id="workspace-name"
                  type="text"
                  value={
                    workspaceName
                  }
                  onChange={(
                    event
                  ) => {
                    setWorkspaceName(
                      event.target
                        .value
                    );

                    setErrors(
                      (
                        current
                      ) => ({
                        ...current,
                        name:
                          undefined,
                      })
                    );

                    setServerError(
                      ""
                    );
                  }}
                  placeholder="e.g. Acme Team"
                  autoFocus
                  disabled={
                    isSubmitting
                  }
                  className={`w-full rounded-xl border bg-kite-soft px-4 py-3.5 text-[15px] text-kite-ink outline-none transition placeholder:text-kite-faint focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
                    errors.name
                      ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                      : "border-kite-line focus:border-kite-blue focus:ring-kite-blue-wash"
                  }`}
                />

                {errors.name && (
                  <p className="mt-2 text-sm text-red-500">
                    {
                      errors.name
                    }
                  </p>
                )}

                <p className="mt-2 text-xs leading-5 text-kite-faint">
                  Usually your
                  company, team, or
                  organization name.
                </p>
              </div>

              {/* URL PREVIEW */}

              <div>
                <label
                  htmlFor="workspace-slug"
                  className="mb-2 block text-sm font-medium text-kite-muted"
                >
                  Workspace URL
                </label>

                <div className="flex overflow-hidden rounded-xl border border-kite-line bg-kite-soft">
                  <div className="flex items-center border-r border-kite-line bg-white/60 px-4 text-sm text-kite-muted">
                    kitedesk.com/
                  </div>

                  <input
                    id="workspace-slug"
                    type="text"
                    value={
                      workspaceSlugPreview
                    }
                    readOnly
                    tabIndex={-1}
                    placeholder="your-workspace"
                    className="min-w-0 flex-1 cursor-default bg-transparent px-4 py-3.5 text-sm text-kite-muted outline-none placeholder:text-kite-faint"
                  />
                </div>

                <p className="mt-2 text-xs leading-5 text-kite-faint">
                  Your workspace URL
                  is generated
                  automatically. If the
                  address is already
                  taken, KiteDesk may
                  adjust it slightly.
                </p>
              </div>

              {/* OWNER INFO */}

              <div className="rounded-xl border border-kite-line bg-kite-soft p-4">
                <div className="flex gap-3">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-xs font-medium text-kite-blue-deep">
                    i
                  </div>

                  <p className="text-xs leading-5 text-kite-muted">
                    You&apos;ll
                    automatically
                    become the
                    workspace{" "}
                    <span className="font-medium text-kite-ink">
                      Owner
                    </span>
                    . You can invite
                    managers and
                    members afterward.
                  </p>
                </div>
              </div>

              {/* SERVER ERROR */}

              {serverError && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {serverError}
                </div>
              )}

              {/* SUBMIT */}

              <button
                type="submit"
                disabled={
                  isSubmitting
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-kite-blue-deep px-4 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_22px_-12px_rgba(110,148,176,0.8)] transition hover:-translate-y-[1px] hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Creating workspace..."
                  : "Create Workspace"}

                {!isSubmitting && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-4 w-4"
                  >
                    <path
                      d="m9 18 6-6-6-6"
                    />
                  </svg>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-xs leading-5 text-kite-faint">
              You can change your
              workspace details later
              in Workspace Settings.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default CreateWorkspacePage;