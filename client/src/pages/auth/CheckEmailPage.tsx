import {
  useEffect,
  useMemo,
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

/*
|--------------------------------------------------------------------------
| CHECK EMAIL PAGE
|--------------------------------------------------------------------------
*/

function CheckEmailPage() {
  const [
    searchParams,
  ] =
    useSearchParams();

  const email =
    searchParams.get(
      "email"
    )?.trim() ?? "";

  const returnTo =
    getSafeReturnTo(
      searchParams.get(
        "returnTo"
      )
    );

  const initialEmailSent =
    searchParams.get(
      "sent"
    ) !== "0";

  const [
    isSending,
    setIsSending,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState(
      initialEmailSent
        ? ""
        : "Your account was created, but the verification email could not be sent. You can try sending it again below."
    );

  const [
    isError,
    setIsError,
  ] =
    useState(
      !initialEmailSent
    );

  const [
    cooldown,
    setCooldown,
  ] =
    useState(0);

  useEffect(
    () => {
      if (
        cooldown <= 0
      ) {
        return;
      }

      const timer =
        window.setInterval(
          () => {
            setCooldown(
              (current) =>
                Math.max(
                  0,
                  current - 1
                )
            );
          },
          1000
        );

      return () => {
        window.clearInterval(
          timer
        );
      };
    },
    [
      cooldown,
    ]
  );

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

  const registerUrl =
    useMemo(
      () => {
        if (
          !returnTo
        ) {
          return "/register";
        }

        return `/register?returnTo=${encodeURIComponent(
          returnTo
        )}`;
      },
      [
        returnTo,
      ]
    );

  async function handleResend() {
    if (
      !email ||
      isSending ||
      cooldown > 0
    ) {
      return;
    }

    setIsSending(
      true
    );

    setMessage("");

    setIsError(
      false
    );

    try {
      const response =
        await authService.resendVerification({
          email,
        });

      setMessage(
        response.message
      );

      setCooldown(
        60
      );
    } catch (error) {
      if (
        error instanceof
        ApiError
      ) {
        setMessage(
          error.message
        );
      } else {
        console.error(
          "Unable to resend verification email:",
          error
        );

        setMessage(
          "Unable to send the verification email. Please try again."
        );
      }

      setIsError(
        true
      );
    } finally {
      setIsSending(
        false
      );
    }
  }

  if (
    !email
  ) {
    return (
      <AuthLayout active="register">
        <div className="py-4 text-center">

          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-kite-blue-wash text-kite-blue-deep">
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
              <path d="M4 4h16v16H4z" />
              <path d="m4 6 8 6 8-6" />
            </svg>
          </div>

          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-kite-ink">
            Email address missing
          </h1>

          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-kite-muted">
            Start registration again so KiteDesk knows which email address needs verification.
          </p>

          <Link
            to={registerUrl}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-br from-kite-blue to-kite-blue-deep px-5 py-3 text-sm font-semibold text-white"
          >
            Back to registration
          </Link>

        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout active="register">

      <div className="py-2 text-center">

        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-kite-blue-wash text-kite-blue-deep">
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
            <rect
              x="3"
              y="5"
              width="18"
              height="14"
              rx="2"
            />
            <path d="m3 7 9 6 9-6" />
          </svg>
        </div>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-kite-ink">
          Check your email
        </h1>

        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-kite-muted">
          We sent a verification link to
          {" "}
          <span className="font-medium text-kite-ink">
            {email}
          </span>
          . Open that email and select
          {" "}
          <span className="font-medium text-kite-ink">
            Verify email address
          </span>
          {" "}
          to activate your account.
        </p>

        <div className="mt-6 rounded-xl border border-kite-line bg-kite-soft px-4 py-4 text-left">
          <p className="text-sm font-medium text-kite-ink">
            Didn&apos;t receive it?
          </p>

          <p className="mt-1 text-xs leading-5 text-kite-muted">
            Check your spam folder first. You can also request another verification email below.
          </p>

          <button
            type="button"
            onClick={() =>
              void handleResend()
            }
            disabled={
              isSending ||
              cooldown > 0
            }
            className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-kite-line bg-white px-4 py-2.5 text-sm font-medium text-kite-blue-deep transition hover:bg-kite-blue-wash disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSending
              ? "Sending..."
              : cooldown > 0
                ? `Send again in ${cooldown}s`
                : "Resend verification email"}
          </button>
        </div>

        {message && (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-left text-sm ${
              isError
                ? "border-red-100 bg-red-50 text-red-600"
                : "border-kite-line bg-kite-blue-wash text-kite-blue-deep"
            }`}
          >
            {message}
          </div>
        )}

        <p className="mt-7 text-sm text-kite-muted">
          Already verified?
          {" "}

          <Link
            to={loginUrl}
            className="font-medium text-kite-blue-deep hover:text-kite-ink"
          >
            Log in
          </Link>
        </p>

      </div>

    </AuthLayout>
  );
}

export default CheckEmailPage;
