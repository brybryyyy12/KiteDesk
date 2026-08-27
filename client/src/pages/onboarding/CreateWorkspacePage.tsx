import {
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

/*
|--------------------------------------------------------------------------
| CREATE WORKSPACE PAGE
|--------------------------------------------------------------------------
|
| This page serves two purposes:
|
| 1. First-time onboarding
|    - User may create a workspace
|    - User may skip and enter KiteDesk
|
| 2. Additional workspace creation
|    - Existing users may create another workspace
|    - Newly-created workspace becomes active
|
*/

function CreateWorkspacePage() {
  const navigate =
    useNavigate();

  const {
    createWorkspace,
    workspaces,
  } =
    useWorkspace();

  const hasExistingWorkspace =
    workspaces.length > 0;

  const [
    workspaceName,
    setWorkspaceName,
  ] =
    useState("");

  const [
    description,
    setDescription,
  ] =
    useState("");

  const [
    errors,
    setErrors,
  ] =
    useState<{
      name?: string;
      form?: string;
    }>({});

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | CREATE WORKSPACE
  |--------------------------------------------------------------------------
  */

  const handleSubmit =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      if (
        isSubmitting
      ) {
        return;
      }

      const nextErrors: {
        name?: string;
        form?: string;
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
        trimmedName.length >
        120
      ) {
        nextErrors.name =
          "Workspace name cannot exceed 120 characters.";
      }

      if (
        Object.keys(
          nextErrors
        ).length >
        0
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
         * WorkspaceContext calls the real
         * backend:
         *
         * POST /api/workspaces
         *
         * The backend generates the slug.
         */
        await createWorkspace({
          name:
            trimmedName,

          description:
            description.trim(),
        });

        /*
         * createWorkspace also makes the
         * new workspace the active one.
         */
        navigate(
          "/dashboard",
          {
            replace: true,
          }
        );
      } catch (
        error
      ) {
        console.error(
          "Failed to create workspace:",
          error
        );

        setErrors({
          form:
            error instanceof Error
              ? error.message
              : "Unable to create your workspace. Please try again.",
        });
      } finally {
        setIsSubmitting(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | SKIP / CANCEL
  |--------------------------------------------------------------------------
  */

  const handleSecondaryAction =
    () => {
      if (
        hasExistingWorkspace
      ) {
        /*
         * Existing user came here to
         * create another workspace.
         */
        navigate(
          "/workspace",
          {
            replace: true,
          }
        );

        return;
      }

      /*
       * First-time user:
       *
       * Having no workspace is now a valid
       * state. Let them enter KiteDesk.
       */
      navigate(
        "/dashboard",
        {
          replace: true,
        }
      );
    };

  return (
    <main className="auth-background min-h-screen p-3 sm:p-6 lg:p-8">

      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-6xl overflow-hidden rounded-[24px] border border-kite-line bg-white/80 shadow-[0_20px_60px_-30px_rgba(46,51,56,0.22)] backdrop-blur-sm sm:min-h-[calc(100vh-3rem)] sm:rounded-[30px] lg:min-h-[calc(100vh-4rem)]">

        {/* LEFT */}
        <section className="relative hidden w-[48%] overflow-hidden border-r border-kite-line lg:flex lg:flex-col lg:justify-center">

          <div className="relative z-10 px-14 xl:px-20">

            {/* KITE */}
            <div className="mb-12 grid h-40 w-40 place-items-center rounded-[38px] border border-kite-line bg-white/70 shadow-[0_20px_50px_-30px_rgba(46,51,56,0.25)]">

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2e3338"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-24 w-24"
                aria-hidden="true"
              >
                <path
                  d="M12 2.5 19.5 9 12 21.5 4.5 9Z"
                  fill="#EAF1F6"
                />

                <path d="M12 2.5V21.5M4.5 9H19.5" />

                <path d="M12 21.5c-2.2 1.7-4.3 1.6-6.1.3" />
              </svg>

            </div>

            <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-kite-blue-deep">
              {hasExistingWorkspace
                ? "New workspace"
                : "Set up now or later"}
            </p>

            <h1 className="max-w-md text-5xl font-semibold leading-[1.08] tracking-[-0.03em] text-kite-ink">
              {hasExistingWorkspace ? (
                <>
                  Create another
                  <br />
                  place to work.
                </>
              ) : (
                <>
                  Build your team
                  <br />
                  when you&apos;re ready.
                </>
              )}
            </h1>

            <p className="mt-6 max-w-sm text-[15px] leading-7 text-kite-muted">
              {hasExistingWorkspace
                ? "Workspaces keep separate teams, projects, tasks, and members organized under the same KiteDesk account."
                : "Create a workspace now to start collaborating, or explore KiteDesk first and create one whenever you're ready."}
            </p>

            {/* BENEFITS */}
            <div className="mt-12 max-w-sm space-y-5">

              <OnboardingPoint
                number="1"
                completed={
                  !hasExistingWorkspace
                }
                title={
                  hasExistingWorkspace
                    ? "Your account"
                    : "Create your account"
                }
                description={
                  hasExistingWorkspace
                    ? "Use one account across multiple workspaces."
                    : "Your KiteDesk profile is ready."
                }
              />

              <OnboardingPoint
                number="2"
                active
                title={
                  hasExistingWorkspace
                    ? "Add another workspace"
                    : "Create a workspace"
                }
                description="Organize projects, tasks, and members."
              />

              <OnboardingPoint
                number="3"
                title="Invite your team"
                description="Add collaborators whenever you're ready."
              />

            </div>

          </div>

          {/* DECORATION */}
          <svg
            viewBox="0 0 400 400"
            fill="none"
            className="pointer-events-none absolute -right-24 top-12 h-[430px] w-[430px] opacity-[0.07]"
            aria-hidden="true"
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

            <div className="mb-8 sm:mb-10">
              <KiteDeskLogo />
            </div>

            {/* HEADER */}
            <div className="mb-7 sm:mb-8">

              <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-kite-blue-deep lg:hidden">
                {hasExistingWorkspace
                  ? "New workspace"
                  : "Optional setup"}
              </p>

              <h2 className="text-2xl font-semibold tracking-tight text-kite-ink sm:text-3xl">
                {hasExistingWorkspace
                  ? "Create another workspace"
                  : "Create your first workspace"}
              </h2>

              <p className="mt-3 text-sm leading-6 text-kite-muted">
                {hasExistingWorkspace
                  ? "Keep another team, organization, or project group separate from your current workspace."
                  : "A workspace gives your team a shared home for projects and tasks. You can also skip this and create one later."}
              </p>

            </div>

            {/* FORM ERROR */}
            {errors.form && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3"
              >
                <p className="text-sm font-medium text-red-700">
                  Couldn&apos;t create workspace
                </p>

                <p className="mt-1 text-xs leading-5 text-red-600">
                  {errors.form}
                </p>
              </div>
            )}

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-5"
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
                  disabled={
                    isSubmitting
                  }
                  onChange={(
                    event
                  ) => {
                    setWorkspaceName(
                      event.target.value
                    );

                    setErrors(
                      (
                        current
                      ) => ({
                        ...current,
                        name:
                          undefined,
                        form:
                          undefined,
                      })
                    );
                  }}
                  placeholder="e.g. Product Team"
                  autoComplete="organization"
                  autoFocus
                  maxLength={
                    120
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
                  Usually your company, team, organization, or group name.
                </p>

              </div>

              {/* DESCRIPTION */}
              <div>

                <label
                  htmlFor="workspace-description"
                  className="mb-2 block text-sm font-medium text-kite-muted"
                >
                  Description{" "}
                  <span className="font-normal text-kite-faint">
                    (optional)
                  </span>
                </label>

                <textarea
                  id="workspace-description"
                  value={
                    description
                  }
                  disabled={
                    isSubmitting
                  }
                  onChange={(
                    event
                  ) => {
                    setDescription(
                      event.target.value
                    );

                    setErrors(
                      (
                        current
                      ) => ({
                        ...current,
                        form:
                          undefined,
                      })
                    );
                  }}
                  placeholder="What will this workspace be used for?"
                  rows={
                    3
                  }
                  className="w-full resize-none rounded-xl border border-kite-line bg-kite-soft px-4 py-3.5 text-sm leading-6 text-kite-ink outline-none transition placeholder:text-kite-faint focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash disabled:cursor-not-allowed disabled:opacity-60"
                />

              </div>

              {/* OWNER INFO */}
              <div className="rounded-xl border border-kite-line bg-kite-soft p-4">

                <div className="flex gap-3">

                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-xs font-medium text-kite-blue-deep">
                    i
                  </div>

                  <p className="text-xs leading-5 text-kite-muted">
                    You&apos;ll automatically become the{" "}
                    <span className="font-medium text-kite-ink">
                      Owner
                    </span>{" "}
                    of this workspace. Your role can be different in other workspaces you join.
                  </p>

                </div>

              </div>

              {/* CREATE */}
              <button
                type="submit"
                disabled={
                  isSubmitting
                }
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-kite-blue-deep px-4 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_22px_-12px_rgba(110,148,176,0.8)] transition hover:-translate-y-[1px] hover:brightness-[1.03] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
              >
                {isSubmitting
                  ? "Creating workspace..."
                  : hasExistingWorkspace
                    ? "Create Workspace"
                    : "Create My Workspace"}

                {!isSubmitting && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                )}

              </button>

              {/* SKIP / CANCEL */}
              <button
                type="button"
                disabled={
                  isSubmitting
                }
                onClick={
                  handleSecondaryAction
                }
                className="min-h-12 w-full rounded-xl border border-kite-line bg-white px-4 py-3 text-sm font-medium text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                {hasExistingWorkspace
                  ? "Cancel"
                  : "Skip for now"}
              </button>

            </form>

            <p className="mt-5 text-center text-xs leading-5 text-kite-faint">
              {hasExistingWorkspace
                ? "Your existing workspaces will not be changed."
                : "You can create a workspace later from the Workspace page."}
            </p>

          </div>

        </section>

      </div>

    </main>
  );
}

/*
|--------------------------------------------------------------------------
| ONBOARDING POINT
|--------------------------------------------------------------------------
*/

function OnboardingPoint({
  number,
  title,
  description,
  completed = false,
  active = false,
}: {
  number: string;
  title: string;
  description: string;
  completed?: boolean;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 ${
        !completed &&
        !active
          ? "opacity-50"
          : ""
      }`}
    >

      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-medium ${
          completed
            ? "bg-kite-blue-deep text-white"
            : active
              ? "bg-kite-blue-wash font-semibold text-kite-blue-deep"
              : "border border-kite-line bg-white text-kite-muted"
        }`}
      >
        {completed
          ? "✓"
          : number}
      </span>

      <div className="min-w-0">

        <p className="text-sm font-medium text-kite-ink">
          {title}
        </p>

        <p className="mt-0.5 text-xs leading-5 text-kite-muted">
          {description}
        </p>

      </div>

    </div>
  );
}

export default CreateWorkspacePage;