import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router";

import KiteDeskLogo from "../../components/auth/KiteDeskLogo";

import {
  useAuth,
} from "../../context/AuthContext";

import {
  useWorkspace,
} from "../../context/WorkspaceContext";

import {
  ApiError,
} from "../../lib/api";

import {
  invitationService,
  type InvitationDetails,
  type InvitationRole,
} from "../../services/invitation.service";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function formatRole(
  role: InvitationRole
) {
  switch (role) {
    case "OWNER":
      return "Owner";

    case "MANAGER":
      return "Manager";

    case "MEMBER":
      return "Member";
  }
}

function formatDate(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  ).format(date);
}

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

function InvitationPage() {
  const {
    token,
  } =
    useParams<{
      token: string;
    }>();

  const navigate =
    useNavigate();

  const {
    user,
    isAuthenticated,
    isLoading:
      isAuthLoading,
  } =
    useAuth();

  const {
    refreshWorkspaces,
  } =
    useWorkspace();

  /*
  |--------------------------------------------------------------------------
  | INVITATION STATE
  |--------------------------------------------------------------------------
  */

  const [
    invitation,
    setInvitation,
  ] =
    useState<
      InvitationDetails | null
    >(null);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    isAccepting,
    setIsAccepting,
  ] =
    useState(false);

  const [
    isDeclining,
    setIsDeclining,
  ] =
    useState(false);

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | LOAD INVITATION
  |--------------------------------------------------------------------------
  */

  const loadInvitation =
    useCallback(
      async () => {
        if (!token) {
          setError(
            "This invitation link is invalid."
          );

          setIsLoading(
            false
          );

          return;
        }

        setIsLoading(
          true
        );

        setError("");

        try {
          const response =
            await invitationService.getByToken(
              token
            );

          setInvitation(
            response.data
              .invitation
          );
        } catch (error) {
          console.error(
            "Failed to load invitation:",
            error
          );

          if (
            error instanceof
              ApiError
          ) {
            setError(
              error.message
            );
          } else {
            setError(
              "Unable to load this invitation."
            );
          }
        } finally {
          setIsLoading(
            false
          );
        }
      },
      [
        token,
      ]
    );

  useEffect(
    () => {
      void loadInvitation();
    },
    [
      loadInvitation,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | LOGIN / REGISTER
  |--------------------------------------------------------------------------
  |
  | Preserve the invitation route so
  | the user returns here after auth.
  |
  */

  const goToLogin =
    () => {
      if (!token) {
        return;
      }

      const returnTo =
        `/invitations/${token}`;

      navigate(
        `/login?returnTo=${encodeURIComponent(
          returnTo
        )}`
      );
    };

  const goToRegister =
    () => {
      if (!token) {
        return;
      }

      const returnTo =
        `/invitations/${token}`;

      navigate(
        `/register?returnTo=${encodeURIComponent(
          returnTo
        )}`
      );
    };

  /*
  |--------------------------------------------------------------------------
  | ACCEPT
  |--------------------------------------------------------------------------
  */

  const handleAccept =
    async () => {
      if (!token) {
        return;
      }

      if (
        !isAuthenticated
      ) {
        goToLogin();

        return;
      }

      setIsAccepting(
        true
      );

      setError("");

      setSuccessMessage(
        ""
      );

      try {
        const response =
          await invitationService.accept(
            token
          );

        setSuccessMessage(
          response.message ||
            "Invitation accepted."
        );

        /*
         * User now belongs to another
         * workspace, so refresh the real
         * workspace list.
         */
        await refreshWorkspaces();

        navigate(
          "/dashboard",
          {
            replace: true,
          }
        );
      } catch (error) {
        console.error(
          "Failed to accept invitation:",
          error
        );

        if (
          error instanceof
            ApiError
        ) {
          setError(
            error.message
          );
        } else {
          setError(
            "Unable to accept this invitation."
          );
        }
      } finally {
        setIsAccepting(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | DECLINE
  |--------------------------------------------------------------------------
  */

  const handleDecline =
    async () => {
      if (!token) {
        return;
      }

      if (
        !isAuthenticated
      ) {
        goToLogin();

        return;
      }

      const confirmed =
        window.confirm(
          "Decline this workspace invitation?"
        );

      if (
        !confirmed
      ) {
        return;
      }

      setIsDeclining(
        true
      );

      setError("");

      setSuccessMessage(
        ""
      );

      try {
        const response =
          await invitationService.decline(
            token
          );

        setSuccessMessage(
          response.message ||
            "Invitation declined."
        );

        /*
         * Reload so the UI now reflects
         * DECLINED status from backend.
         */
        await loadInvitation();
      } catch (error) {
        console.error(
          "Failed to decline invitation:",
          error
        );

        if (
          error instanceof
            ApiError
        ) {
          setError(
            error.message
          );
        } else {
          setError(
            "Unable to decline this invitation."
          );
        }
      } finally {
        setIsDeclining(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (
    isLoading ||
    isAuthLoading
  ) {
    return (
      <InvitationLoading />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | LOAD ERROR / INVALID
  |--------------------------------------------------------------------------
  */

  if (
    !invitation
  ) {
    return (
      <InvitationUnavailable
        message={
          error ||
          "This invitation could not be found."
        }
        onRetry={
          token
            ? () =>
                void loadInvitation()
            : undefined
        }
        onHome={() =>
          navigate("/")
        }
      />
    );
  }

  const role =
    formatRole(
      invitation.role
    );

  const isPending =
    invitation.status ===
    "PENDING";

  const emailMatches =
    user?.email
      .trim()
      .toLowerCase() ===
    invitation.email
      .trim()
      .toLowerCase();

  const isWorking =
    isAccepting ||
    isDeclining;

  /*
  |--------------------------------------------------------------------------
  | PAGE
  |--------------------------------------------------------------------------
  */

  return (
    <>
      {/* ENTRY ANIMATION */}
      <style>
        {`
          @keyframes kitedesk-invitation-enter {
            0% {
              opacity: 0;
              transform: translate3d(0, 10px, 0) scale(0.995);
            }

            100% {
              opacity: 1;
              transform: translate3d(0, 0, 0) scale(1);
            }
          }

          .kitedesk-invitation-enter {
            animation:
              kitedesk-invitation-enter
              380ms
              cubic-bezier(0.22, 1, 0.36, 1)
              both;
          }

          @media (prefers-reduced-motion: reduce) {
            .kitedesk-invitation-enter {
              animation: none !important;
            }
          }
        `}
      </style>

      <main className="auth-background min-h-[100dvh] overflow-x-hidden bg-kite-bg sm:p-6 lg:p-8">

        <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl overflow-hidden bg-white/80 backdrop-blur-sm sm:min-h-[calc(100dvh-3rem)] sm:rounded-[30px] sm:border sm:border-kite-line sm:shadow-[0_20px_60px_-30px_rgba(46,51,56,0.22)] lg:min-h-[calc(100dvh-4rem)]">

          {/* DESKTOP BRANDING */}
          <section className="relative hidden w-[48%] overflow-hidden border-r border-kite-line lg:flex lg:flex-col lg:justify-center">

            <div className="relative z-10 px-14 xl:px-20">

              {/* KITE */}
              <div className="relative mb-12">

                <div className="grid h-40 w-40 place-items-center rounded-[38px] border border-kite-line bg-white/70 shadow-[0_20px_50px_-30px_rgba(46,51,56,0.25)]">

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

                    <g transform="rotate(45 12 12)">

                      <path
                        d="M12 2.5 19.5 9 12 21.5 4.5 9Z"
                        fill="#EAF1F6"
                      />

                      <path d="M12 2.5V21.5M4.5 9H19.5" />

                      <path d="M12 21.5c-2.2 1.7-4.3 1.6-6.1.3" />

                    </g>

                  </svg>

                </div>

                <div className="absolute -right-4 bottom-1 grid h-13 w-13 place-items-center rounded-2xl border border-kite-line bg-white shadow-sm">

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6e94b0"
                    strokeWidth="1.6"
                    className="h-6 w-6"
                    aria-hidden="true"
                  >
                    <path d="m5 12 4 4 10-10" />
                  </svg>

                </div>

              </div>

              <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-kite-blue-deep">
                Workspace invitation
              </p>

              <h1 className="max-w-md text-5xl font-semibold leading-[1.08] tracking-[-0.03em] text-kite-ink">
                Work together,
                <br />
                stay aligned.
              </h1>

              <p className="mt-6 max-w-sm text-[15px] leading-7 text-kite-muted">
                Join your team in KiteDesk to organize projects,
                manage tasks, and keep work moving.
              </p>

              {/* SIMPLE STEPS */}
              <div className="mt-12 max-w-sm space-y-1">

                <InvitationStep
                  number="01"
                  label="Review your invitation"
                />

                <InvitationStep
                  number="02"
                  label="Sign in or create an account"
                />

                <InvitationStep
                  number="03"
                  label="Join your workspace"
                  last
                />

              </div>

            </div>

            {/* DECORATION */}
            <svg
              className="pointer-events-none absolute -right-20 top-8 h-[420px] w-[420px] opacity-[0.07]"
              viewBox="0 0 400 400"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M200 40 335 165 200 355 65 165Z"
                stroke="#6e94b0"
                strokeWidth="1.3"
              />

              <path
                d="M200 40V355M65 165H335"
                stroke="#6e94b0"
                strokeWidth="1"
              />
            </svg>

            <div className="pointer-events-none absolute -bottom-44 -left-32 h-[470px] w-[470px] rounded-full bg-kite-blue-wash/70 blur-3xl" />

          </section>

          {/* INVITATION CONTENT */}
          <section className="flex min-w-0 w-full items-start justify-center px-4 py-5 sm:items-center sm:px-8 sm:py-8 lg:w-[52%] lg:px-12 xl:px-14">

            <div className="kitedesk-invitation-enter w-full max-w-[460px]">

              {/* MOBILE / TABLET CARD */}
              <div className="w-full bg-white px-1 py-3 sm:rounded-[24px] sm:border sm:border-kite-line sm:px-8 sm:py-9 sm:shadow-[0_14px_40px_-25px_rgba(46,51,56,0.22)]">

                {/* LOGO */}
                <div className="mb-7 sm:mb-9">
                  <KiteDeskLogo />
                </div>

                {/* MOBILE INVITATION ICON */}
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-kite-blue-wash text-kite-blue-deep lg:hidden">

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="h-6 w-6"
                    aria-hidden="true"
                  >
                    <path d="M4 6h16v12H4Z" />

                    <path d="m4 7 8 6 8-6" />
                  </svg>

                </div>

                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-kite-blue-deep sm:text-sm sm:normal-case sm:tracking-normal">
                  You&apos;re invited
                </p>

                <h2 className="mt-2 break-words text-2xl font-semibold tracking-tight text-kite-ink sm:text-3xl">
                  Join{" "}
                  {
                    invitation.workspace
                      .name
                  }
                </h2>

                <p className="mt-3 text-sm leading-6 text-kite-muted">
                  You&apos;ve been invited to join this workspace as a{" "}
                  <span className="font-medium text-kite-ink">
                    {role}
                  </span>
                  .
                </p>

                {/* DETAILS */}
                <div className="mt-6 overflow-hidden rounded-2xl border border-kite-line bg-kite-soft sm:mt-8">

                  {/* WORKSPACE */}
                  <div className="border-b border-kite-line p-4 sm:p-5">

                    <p className="text-[10px] font-medium uppercase tracking-wide text-kite-faint sm:text-xs">
                      Workspace
                    </p>

                    <p className="mt-1 break-words text-sm font-semibold text-kite-ink sm:text-base">
                      {
                        invitation.workspace
                          .name
                      }
                    </p>

                  </div>

                  {/* ROLE / EXPIRES */}
                  <div className="grid grid-cols-2 divide-x divide-kite-line">

                    <div className="min-w-0 p-4 sm:p-5">

                      <p className="text-[10px] text-kite-faint sm:text-xs">
                        Role
                      </p>

                      <p className="mt-1 truncate text-sm font-medium text-kite-ink">
                        {role}
                      </p>

                    </div>

                    <div className="min-w-0 p-4 sm:p-5">

                      <p className="text-[10px] text-kite-faint sm:text-xs">
                        Expires
                      </p>

                      <p className="mt-1 break-words text-xs font-medium leading-5 text-kite-ink sm:text-sm">
                        {formatDate(
                          invitation.expiresAt
                        )}
                      </p>

                    </div>

                  </div>

                </div>

                {/* INVITED EMAIL */}
                <div className="mt-4 rounded-xl border border-kite-line bg-white p-4 sm:mt-5">

                  <div className="flex min-w-0 items-center gap-3">

                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-kite-soft text-kite-muted">

                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <path d="M4 6h16v12H4Z" />
                        <path d="m4 7 8 6 8-6" />
                      </svg>

                    </div>

                    <div className="min-w-0">

                      <p className="text-[10px] text-kite-faint sm:text-xs">
                        Invitation sent to
                      </p>

                      <p className="mt-0.5 truncate text-sm font-medium text-kite-ink">
                        {
                          invitation.email
                        }
                      </p>

                    </div>

                  </div>

                </div>

                {/* ERROR */}
                {error && (
                  <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">

                    <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-red-100 text-[10px] font-semibold text-red-600">
                      !
                    </div>

                    <p className="min-w-0 break-words text-sm leading-6 text-red-600">
                      {error}
                    </p>

                  </div>
                )}

                {/* SUCCESS */}
                {successMessage && (
                  <div className="mt-5 flex items-start gap-3 rounded-xl border border-kite-line bg-kite-blue-wash px-4 py-3">

                    <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-[10px] font-semibold text-kite-blue-deep">
                      ✓
                    </div>

                    <p className="min-w-0 break-words text-sm leading-6 text-kite-ink">
                      {
                        successMessage
                      }
                    </p>

                  </div>
                )}

                {/* NON-PENDING */}
                {!isPending && (
                  <div className="mt-6 rounded-xl border border-kite-line bg-kite-soft p-4">

                    <div className="flex items-start gap-3">

                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-kite-muted">

                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          className="h-4.5 w-4.5"
                          aria-hidden="true"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="8"
                          />

                          <path d="M12 8v4M12 16h.01" />
                        </svg>

                      </div>

                      <div>

                        <p className="text-sm font-medium capitalize text-kite-ink">
                          Invitation{" "}
                          {
                            invitation.status
                              .toLowerCase()
                          }
                        </p>

                        <p className="mt-1 text-xs leading-5 text-kite-muted">
                          This invitation can no longer be accepted.
                        </p>

                      </div>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          isAuthenticated
                            ? "/dashboard"
                            : "/login"
                        )
                      }
                      className="mt-4 w-full rounded-xl border border-kite-line bg-white px-4 py-3 text-sm font-medium text-kite-ink transition hover:bg-kite-soft"
                    >
                      {isAuthenticated
                        ? "Go to Dashboard"
                        : "Go to Login"}
                    </button>

                  </div>
                )}

                {/* LOGGED OUT */}
                {isPending &&
                  !isAuthenticated && (
                  <div className="mt-6">

                    <p className="mb-3 text-xs leading-5 text-kite-muted">
                      Sign in with the invited email address, or create an account if you don&apos;t have one yet.
                    </p>

                    <div className="grid grid-cols-2 gap-2 sm:gap-3">

                      <button
                        type="button"
                        onClick={
                          goToLogin
                        }
                        className="rounded-xl bg-kite-blue-deep px-3 py-3.5 text-sm font-semibold text-white transition hover:brightness-95 sm:px-4"
                      >
                        Log in
                      </button>

                      <button
                        type="button"
                        onClick={
                          goToRegister
                        }
                        className="rounded-xl border border-kite-line bg-white px-3 py-3.5 text-sm font-medium text-kite-ink transition hover:bg-kite-soft sm:px-4"
                      >
                        Create account
                      </button>

                    </div>

                  </div>
                )}

                {/* WRONG ACCOUNT */}
                {isPending &&
                  isAuthenticated &&
                  !emailMatches && (
                  <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">

                    <div className="flex items-start gap-3">

                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-amber-600">

                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          className="h-4.5 w-4.5"
                          aria-hidden="true"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="8"
                          />

                          <path d="M12 8v4M12 16h.01" />
                        </svg>

                      </div>

                      <div className="min-w-0">

                        <p className="text-sm font-medium text-amber-800">
                          Different account signed in
                        </p>

                        <p className="mt-1 break-words text-xs leading-5 text-amber-700">
                          This invitation was sent to{" "}
                          <span className="font-medium">
                            {
                              invitation.email
                            }
                          </span>
                          , but you&apos;re currently signed in as{" "}
                          <span className="font-medium">
                            {user?.email}
                          </span>
                          .
                        </p>

                      </div>

                    </div>

                    <p className="mt-3 border-t border-amber-200 pt-3 text-xs leading-5 text-amber-700">
                      Sign in with the invited account before accepting this invitation.
                    </p>

                  </div>
                )}

                {/* ACCEPT / DECLINE */}
                {isPending &&
                  isAuthenticated &&
                  emailMatches && (
                  <div className="mt-6">

                    <div className="mb-3 rounded-xl bg-kite-blue-wash/60 px-4 py-3">

                      <p className="text-xs leading-5 text-kite-muted">
                        Accepting will add your account to{" "}
                        <span className="font-medium text-kite-ink">
                          {
                            invitation.workspace
                              .name
                          }
                        </span>{" "}
                        as a{" "}
                        <span className="font-medium text-kite-ink">
                          {role}
                        </span>
                        .
                      </p>

                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:gap-3">

                      <button
                        type="button"
                        onClick={() =>
                          void handleDecline()
                        }
                        disabled={
                          isWorking
                        }
                        className="rounded-xl border border-kite-line bg-white px-3 py-3.5 text-sm font-medium text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
                      >
                        {isDeclining
                          ? "Declining..."
                          : "Decline"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void handleAccept()
                        }
                        disabled={
                          isWorking
                        }
                        className="rounded-xl bg-kite-blue-deep px-3 py-3.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
                      >
                        {isAccepting
                          ? "Joining..."
                          : "Accept Invite"}
                      </button>

                    </div>

                  </div>
                )}

              </div>

              {/* MOBILE FOOTER */}
              <p className="mt-6 text-center text-[10px] uppercase tracking-[0.12em] text-kite-faint lg:hidden">
                Workspace collaboration with KiteDesk
              </p>

            </div>

          </section>

        </div>

      </main>
    </>
  );
}

/*
|--------------------------------------------------------------------------
| DESKTOP STEP
|--------------------------------------------------------------------------
*/

function InvitationStep({
  number,
  label,
  last = false,
}: {
  number: string;
  label: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 py-4 ${
        last
          ? ""
          : "border-b border-kite-line"
      }`}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-xs font-medium text-kite-muted">
        {number}
      </span>

      <p className="text-sm text-kite-muted">
        {label}
      </p>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| LOADING
|--------------------------------------------------------------------------
*/

function InvitationLoading() {
  return (
    <main className="auth-background flex min-h-[100dvh] items-center justify-center bg-kite-bg px-4 py-8">

      <div className="w-full max-w-[430px] rounded-[24px] border border-kite-line bg-white p-6 shadow-[0_14px_40px_-25px_rgba(46,51,56,0.22)] sm:p-8">

        <KiteDeskLogo />

        <div className="mt-8 animate-pulse">

          <div className="h-3 w-24 rounded bg-kite-line" />

          <div className="mt-3 h-8 w-56 max-w-full rounded-xl bg-kite-line" />

          <div className="mt-3 h-4 w-full rounded bg-kite-line" />

          <div className="mt-2 h-4 w-3/4 rounded bg-kite-line" />

          <div className="mt-7 h-32 rounded-2xl bg-kite-soft" />

          <div className="mt-4 h-16 rounded-xl bg-kite-soft" />

          <div className="mt-6 grid grid-cols-2 gap-3">

            <div className="h-12 rounded-xl bg-kite-line" />

            <div className="h-12 rounded-xl bg-kite-line" />

          </div>

        </div>

        <p className="mt-6 text-center text-xs text-kite-faint">
          Loading invitation...
        </p>

      </div>

    </main>
  );
}

/*
|--------------------------------------------------------------------------
| UNAVAILABLE
|--------------------------------------------------------------------------
*/

function InvitationUnavailable({
  message,
  onRetry,
  onHome,
}: {
  message: string;

  onRetry?:
    () => void;

  onHome:
    () => void;
}) {
  return (
    <main className="auth-background flex min-h-[100dvh] items-center justify-center bg-kite-bg px-4 py-8 sm:px-6">

      <div className="w-full max-w-md rounded-[24px] border border-kite-line bg-white p-5 text-center shadow-[0_14px_40px_-25px_rgba(46,51,56,0.22)] sm:p-8">

        <div className="flex justify-start">
          <KiteDeskLogo />
        </div>

        <div className="mx-auto mt-8 grid h-14 w-14 place-items-center rounded-2xl bg-kite-soft text-kite-muted">

          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="h-7 w-7"
            aria-hidden="true"
          >
            <path d="M4 6h16v12H4Z" />

            <path d="m4 7 8 6 8-6" />

            <path d="m8 9 8 6" />
          </svg>

        </div>

        <h1 className="mt-5 text-xl font-semibold tracking-tight text-kite-ink sm:text-2xl">
          Invitation unavailable
        </h1>

        <p className="mx-auto mt-2 max-w-sm break-words text-sm leading-6 text-kite-muted">
          {message}
        </p>

        <div
          className={`mt-6 grid gap-2 ${
            onRetry
              ? "grid-cols-2"
              : "grid-cols-1"
          } sm:gap-3`}
        >

          {onRetry && (
            <button
              type="button"
              onClick={
                onRetry
              }
              className="rounded-xl border border-kite-line bg-white px-4 py-3 text-sm font-medium text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink"
            >
              Try Again
            </button>
          )}

          <button
            type="button"
            onClick={
              onHome
            }
            className="rounded-xl bg-kite-blue-deep px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95"
          >
            Go to KiteDesk
          </button>

        </div>

      </div>

    </main>
  );
}

export default InvitationPage;