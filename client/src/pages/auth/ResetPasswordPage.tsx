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
  AUTH_TOKEN_KEY,
  useAuth,
} from "../../context/AuthContext";

import {
  ApiError,
} from "../../lib/api";

import {
  authService,
} from "../../services/auth.service";

type ResetPasswordErrors = {
  password?: string;
  confirmPassword?: string;
};

function validatePassword(
  password: string
) {
  if (
    password.length < 8
  ) {
    return "Password must contain at least 8 characters.";
  }

  if (
    password.length > 128
  ) {
    return "Password is too long.";
  }

  if (
    !/[A-Z]/.test(
      password
    )
  ) {
    return "Password must contain at least one uppercase letter.";
  }

  if (
    !/[a-z]/.test(
      password
    )
  ) {
    return "Password must contain at least one lowercase letter.";
  }

  if (
    !/[0-9]/.test(
      password
    )
  ) {
    return "Password must contain at least one number.";
  }

  return "";
}

function ResetPasswordPage() {
  const [
    searchParams,
  ] =
    useSearchParams();

  const token =
    searchParams.get(
      "token"
    )?.trim() ?? "";

  const {
    setUser,
  } =
    useAuth();

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState("");

  const [
    errors,
    setErrors,
  ] =
    useState<ResetPasswordErrors>({});

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] =
    useState(false);

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
    useState(
      token
        ? ""
        : "This password reset link is missing its token."
    );

  function validate() {
    const nextErrors:
      ResetPasswordErrors = {};

    const passwordError =
      validatePassword(
        password
      );

    if (
      passwordError
    ) {
      nextErrors.password =
        passwordError;
    }

    if (
      !confirmPassword
    ) {
      nextErrors.confirmPassword =
        "Please confirm your new password.";
    } else if (
      password !==
      confirmPassword
    ) {
      nextErrors.confirmPassword =
        "Passwords do not match.";
    }

    return nextErrors;
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !token
    ) {
      return;
    }

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
        await authService.resetPassword({
          token,
          password,
        });

      /*
       * The backend clears the auth cookie.
       * Also clear KiteDesk's Bearer-token
       * fallback in this browser.
       */
      try {
        window.localStorage.removeItem(
          AUTH_TOKEN_KEY
        );
      } catch (error) {
        console.warn(
          "Unable to remove local authentication token:",
          error
        );
      }

      setUser(
        null
      );

      setMessage(
        response.message
      );

      setIsComplete(
        true
      );

      setPassword("");
      setConfirmPassword("");
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
          const backendErrors:
            ResetPasswordErrors = {};

          for (
            const issue of
              error.errors
          ) {
            if (
              issue.field ===
              "password"
            ) {
              backendErrors.password =
                issue.message;
            }
          }

          setErrors(
            backendErrors
          );
        }
      } else {
        console.error(
          "Password reset failed:",
          error
        );

        setMessage(
          "Unable to reset your password. Please try again."
        );
      }
    } finally {
      setIsSubmitting(
        false
      );
    }
  }

  if (
    !token
  ) {
    return (
      <AuthLayout active="login">
        <div className="py-4 text-center">
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
              <path d="M12 16.5h.01" />
            </svg>
          </div>

          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-kite-ink">
            Invalid reset link
          </h1>

          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-kite-muted">
            {message}
          </p>

          <Link
            to="/forgot-password"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-br from-kite-blue to-kite-blue-deep px-5 py-3 text-sm font-semibold text-white"
          >
            Request a new link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (
    isComplete
  ) {
    return (
      <AuthLayout active="login">
        <div className="py-4 text-center">
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
              <path d="m5 12 4 4L19 6" />
            </svg>
          </div>

          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-kite-ink">
            Password updated
          </h1>

          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-kite-muted">
            {message ||
              "Your password has been reset successfully."}
          </p>

          <Link
            to="/login"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-br from-kite-blue to-kite-blue-deep px-5 py-3 text-sm font-semibold text-white"
          >
            Log in with new password
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout active="login">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-kite-ink">
          Create a new password
        </h1>

        <p className="mt-1.5 text-sm leading-6 text-kite-muted">
          Choose a new password for your KiteDesk account.
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
            htmlFor="reset-password"
            className="mb-2 block text-sm font-medium text-kite-muted"
          >
            New password
          </label>

          <div className="relative">
            <input
              id="reset-password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={
                password
              }
              onChange={(
                event
              ) => {
                setPassword(
                  event.target.value
                );

                setErrors({
                  ...errors,
                  password:
                    undefined,
                });

                setMessage("");
              }}
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={
                isSubmitting
              }
              className={`w-full rounded-xl border bg-kite-soft px-4 py-3.5 pr-16 text-[15px] text-kite-ink outline-none transition placeholder:text-kite-faint focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
                errors.password
                  ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                  : "border-kite-line focus:border-kite-blue focus:ring-kite-blue-wash"
              }`}
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (value) =>
                    !value
                )
              }
              disabled={
                isSubmitting
              }
              className="absolute inset-y-0 right-0 px-4 text-xs font-medium text-kite-muted transition hover:text-kite-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              {showPassword
                ? "Hide"
                : "Show"}
            </button>
          </div>

          {errors.password ? (
            <p className="mt-2 text-sm text-red-500">
              {
                errors.password
              }
            </p>
          ) : (
            <p className="mt-2 text-xs leading-5 text-kite-faint">
              8–128 characters with uppercase, lowercase, and at least one number.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="reset-confirm-password"
            className="mb-2 block text-sm font-medium text-kite-muted"
          >
            Confirm new password
          </label>

          <div className="relative">
            <input
              id="reset-confirm-password"
              type={
                showConfirmPassword
                  ? "text"
                  : "password"
              }
              value={
                confirmPassword
              }
              onChange={(
                event
              ) => {
                setConfirmPassword(
                  event.target.value
                );

                setErrors({
                  ...errors,
                  confirmPassword:
                    undefined,
                });

                setMessage("");
              }}
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={
                isSubmitting
              }
              className={`w-full rounded-xl border bg-kite-soft px-4 py-3.5 pr-16 text-[15px] text-kite-ink outline-none transition placeholder:text-kite-faint focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
                errors.confirmPassword
                  ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                  : "border-kite-line focus:border-kite-blue focus:ring-kite-blue-wash"
              }`}
            />

            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword(
                  (value) =>
                    !value
                )
              }
              disabled={
                isSubmitting
              }
              className="absolute inset-y-0 right-0 px-4 text-xs font-medium text-kite-muted transition hover:text-kite-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              {showConfirmPassword
                ? "Hide"
                : "Show"}
            </button>
          </div>

          {errors.confirmPassword && (
            <p className="mt-2 text-sm text-red-500">
              {
                errors.confirmPassword
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
            ? "Updating password..."
            : "Reset password"}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-kite-muted">
        Need a new reset link?{" "}

        <Link
          to="/forgot-password"
          className="font-medium text-kite-blue-deep hover:text-kite-ink"
        >
          Request another
        </Link>
      </p>
    </AuthLayout>
  );
}

export default ResetPasswordPage;
