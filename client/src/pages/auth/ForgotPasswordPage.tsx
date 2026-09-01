import {
  useState,
  type FormEvent,
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

type ForgotPasswordErrors = {
  email?: string;
};

function ForgotPasswordPage() {
  const [
    searchParams,
  ] =
    useSearchParams();

  const [
    email,
    setEmail,
  ] =
    useState(
      searchParams.get(
        "email"
      )?.trim() ?? ""
    );

  const [
    errors,
    setErrors,
  ] =
    useState<ForgotPasswordErrors>({});

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  const [
    isComplete,
    setIsComplete,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const normalizedEmail =
    email
      .trim()
      .toLowerCase();

  function validate() {
    const nextErrors:
      ForgotPasswordErrors = {};

    if (
      !normalizedEmail
    ) {
      nextErrors.email =
        "Email is required.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail
      )
    ) {
      nextErrors.email =
        "Please enter a valid email.";
    }

    return nextErrors;
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const validationErrors =
      validate();

    if (
      Object.keys(
        validationErrors
      ).length > 0
    ) {
      setErrors(
        validationErrors
      );

      return;
    }

    setErrors({});
    setMessage("");
    setIsSubmitting(
      true
    );

    try {
      const response =
        await authService.forgotPassword({
          email:
            normalizedEmail,
        });

      setMessage(
        response.message
      );

      setIsComplete(
        true
      );
    } catch (error) {
      if (
        error instanceof
        ApiError
      ) {
        setMessage(
          error.message
        );

        if (
          error.errors &&
          error.errors.length >
            0
        ) {
          for (
            const issue of
              error.errors
          ) {
            if (
              issue.field ===
              "email"
            ) {
              setErrors({
                email:
                  issue.message,
              });
            }
          }
        }
      } else {
        console.error(
          "Forgot password request failed:",
          error
        );

        setMessage(
          "Unable to request a password reset. Please try again."
        );
      }
    } finally {
      setIsSubmitting(
        false
      );
    }
  }

  if (
    isComplete
  ) {
    return (
      <AuthLayout active="login">
        <div className="py-3 text-center">
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
            Check your email
          </h1>

          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-kite-muted">
            {message ||
              "If an account exists for that email, a password reset link has been sent."}
          </p>

          <p className="mx-auto mt-3 max-w-sm text-xs leading-5 text-kite-faint">
            For security, KiteDesk shows the same message whether or not an account exists for{" "}
            <span className="font-medium text-kite-muted">
              {normalizedEmail}
            </span>
            .
          </p>

          <div className="mt-7 flex flex-col gap-3">
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-br from-kite-blue to-kite-blue-deep px-5 py-3 text-sm font-semibold text-white"
            >
              Back to login
            </Link>

            <button
              type="button"
              onClick={() => {
                setIsComplete(
                  false
                );

                setMessage("");
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-kite-line bg-white px-5 py-3 text-sm font-medium text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink"
            >
              Try another email
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout active="login">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-kite-ink">
          Forgot your password?
        </h1>

        <p className="mt-1.5 text-sm leading-6 text-kite-muted">
          Enter the email you use for KiteDesk and we&apos;ll send you a secure reset link.
        </p>
      </div>

      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-5"
        noValidate
      >
        <div>
          <label
            htmlFor="forgot-password-email"
            className="mb-2 block text-sm font-medium text-kite-muted"
          >
            Email
          </label>

          <input
            id="forgot-password-email"
            type="email"
            value={
              email
            }
            onChange={(
              event
            ) => {
              setEmail(
                event.target.value
              );

              setErrors({});
              setMessage("");
            }}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={
              isSubmitting
            }
            className={`w-full rounded-xl border bg-kite-soft px-4 py-3.5 text-[15px] text-kite-ink outline-none transition placeholder:text-kite-faint focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
              errors.email
                ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                : "border-kite-line focus:border-kite-blue focus:ring-kite-blue-wash"
            }`}
          />

          {errors.email && (
            <p className="mt-2 text-sm text-red-500">
              {
                errors.email
              }
            </p>
          )}
        </div>

        {message && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={
            isSubmitting
          }
          className="w-full rounded-xl bg-gradient-to-br from-kite-blue to-kite-blue-deep px-4 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_22px_-12px_rgba(110,148,176,0.8)] transition hover:-translate-y-[1px] hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? "Sending..."
            : "Send reset link"}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-kite-muted">
        Remember your password?{" "}

        <Link
          to="/login"
          className="font-medium text-kite-blue-deep hover:text-kite-ink"
        >
          Back to login
        </Link>
      </p>
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
