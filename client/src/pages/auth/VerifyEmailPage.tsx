import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
  useSearchParams,
} from "react-router";

import AuthLayout from "../../components/auth/AuthLayout";

import {
  ApiError,
} from "../../lib/api";

import {
  authService,
} from "../../services/auth.service";

/*
|--------------------------------------------------------------------------
| SAFE RETURN PATH
|--------------------------------------------------------------------------
*/

function getSafeReturnTo(
  value: string | null
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return null;
  }

  return value;
}

type VerificationState =
  | "verifying"
  | "success"
  | "error";

/*
|--------------------------------------------------------------------------
| VERIFY EMAIL PAGE
|--------------------------------------------------------------------------
*/

function VerifyEmailPage() {
  const [
    searchParams,
  ] =
    useSearchParams();

  const token =
    searchParams.get(
      "token"
    )?.trim() ?? "";

  const returnTo =
    getSafeReturnTo(
      searchParams.get(
        "returnTo"
      )
    );

  const [
    state,
    setState,
  ] =
    useState<VerificationState>(
      token
        ? "verifying"
        : "error"
    );

  const [
    message,
    setMessage,
  ] =
    useState(
      token
        ? "Verifying your email address..."
        : "The verification link is missing its token."
    );

  /*
   * React StrictMode may run this effect
   * twice during development.
   *
   * The ref prevents the verification
   * token from being submitted twice.
   *
   * IMPORTANT:
   * Do not ignore the first request's
   * response during StrictMode cleanup.
   * That would leave the page stuck on
   * "Verifying your email".
   */
  const hasStarted =
    useRef(false);

  const loginUrl =
    useMemo(
      () => {
        if (
          !returnTo
        ) {
          return "/login";
        }

        return `/login?returnTo=${encodeURIComponent(
          returnTo
        )}`;
      },
      [
        returnTo,
      ]
    );

  useEffect(
    () => {
      if (
        !token ||
        hasStarted.current
      ) {
        return;
      }

      hasStarted.current =
        true;

      async function verify() {
        try {
          const response =
            await authService.verifyEmail({
              token,
            });

          setState(
            "success"
          );

          setMessage(
            response.message
          );
        } catch (error) {
          setState(
            "error"
          );

          if (
            error instanceof
            ApiError
          ) {
            setMessage(
              error.message
            );

            return;
          }

          console.error(
            "Email verification failed:",
            error
          );

          setMessage(
            "Unable to verify your email address. Please request a new verification email."
          );
        }
      }

      void verify();
    },
    [
      token,
    ]
  );

  return (
    <AuthLayout active="register">

      <div className="py-4 text-center">

        {state ===
          "verifying" && (
          <>
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-kite-line border-t-kite-blue-deep" />

            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-kite-ink">
              Verifying your email
            </h1>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-kite-muted">
              {message}
            </p>
          </>
        )}

        {state ===
          "success" && (
          <>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-kite-blue-wash text-kite-blue-deep">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
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

                <path d="m8 12 2.5 2.5L16 9" />
              </svg>
            </div>

            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-kite-ink">
              Email verified
            </h1>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-kite-muted">
              {message}
            </p>

            <Link
              to={loginUrl}
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-br from-kite-blue to-kite-blue-deep px-5 py-3 text-sm font-semibold text-white shadow-sm"
            >
              Continue to login
            </Link>
          </>
        )}

        {state ===
          "error" && (
          <>
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

            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-kite-ink">
              Verification failed
            </h1>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-kite-muted">
              {message}
            </p>

            <p className="mx-auto mt-3 max-w-sm text-xs leading-5 text-kite-faint">
              If you requested another verification email, use the newest email because older verification links are invalidated.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">

              <Link
                to={loginUrl}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-br from-kite-blue to-kite-blue-deep px-5 py-3 text-sm font-semibold text-white"
              >
                Go to login
              </Link>

              <Link
                to="/register"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-kite-line bg-white px-5 py-3 text-sm font-medium text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink"
              >
                Back to registration
              </Link>

            </div>
          </>
        )}

      </div>

    </AuthLayout>
  );
}

export default VerifyEmailPage;
