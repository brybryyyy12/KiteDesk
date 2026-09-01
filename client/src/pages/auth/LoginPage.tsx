import {
  useState,
  type FormEvent,
} from "react";

import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router";

import AuthLayout from "../../components/auth/AuthLayout";

import {
  useAuth,
} from "../../context/AuthContext";

import {
  ApiError,
} from "../../lib/api";

type LoginForm = {
  email: string;
  password: string;
  rememberMe: boolean;
};

type LoginErrors = {
  email?: string;
  password?: string;
};

/*
|--------------------------------------------------------------------------
| SAFE RETURN PATH
|--------------------------------------------------------------------------
|
| We only allow internal KiteDesk paths.
|
| Valid:
| /invitations/abc123
| /dashboard
|
| Invalid:
| https://evil-site.com
| //evil-site.com
|
*/

function getSafeReturnTo(
  value: string | null
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/dashboard";
  }

  return value;
}

function LoginPage() {
  const navigate =
    useNavigate();

  const [
    searchParams,
  ] =
    useSearchParams();

  const {
    login,
  } =
    useAuth();

  /*
  |--------------------------------------------------------------------------
  | RETURN DESTINATION
  |--------------------------------------------------------------------------
  |
  | Example:
  |
  | /login?returnTo=%2Finvitations%2Fabc123
  |
  | becomes:
  |
  | /invitations/abc123
  |
  */

  const returnTo =
    getSafeReturnTo(
      searchParams.get(
        "returnTo"
      )
    );

  const [
    form,
    setForm,
  ] =
    useState<LoginForm>({
      email: "",
      password: "",
      rememberMe: false,
    });

  const [
    errors,
    setErrors,
  ] =
    useState<LoginErrors>({});

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | VALIDATION
  |--------------------------------------------------------------------------
  */

  const validate = () => {
    const nextErrors:
      LoginErrors = {};

    const email =
      form.email.trim();

    if (!email) {
      nextErrors.email =
        "Email is required.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      nextErrors.email =
        "Please enter a valid email.";
    }

    if (!form.password) {
      nextErrors.password =
        "Password is required.";
    }

    return nextErrors;
  };

  /*
  |--------------------------------------------------------------------------
  | LOGIN
  |--------------------------------------------------------------------------
  */

  const handleSubmit =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      setMessage("");

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

      setIsSubmitting(
        true
      );

      try {
        /*
         * POST /api/auth/login
         *
         * AuthContext stores the returned
         * user and keeps the Bearer-token
         * fallback used by the deployed app.
         */

        await login({
          email:
            form.email
              .trim()
              .toLowerCase(),

          password:
            form.password,
        });

        /*
         * Normal login:
         *
         * /dashboard
         *
         * Invitation login:
         *
         * /invitations/:token
         */

        navigate(
          returnTo,
          {
            replace: true,
          }
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
            const backendErrors:
              LoginErrors = {};

            for (
              const issue of
              error.errors
            ) {
              if (
                issue.field ===
                "email"
              ) {
                backendErrors.email =
                  issue.message;
              }

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
            "Login failed:",
            error
          );

          setMessage(
            "Unable to sign in. Please try again."
          );
        }
      } finally {
        setIsSubmitting(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | REGISTER LINK
  |--------------------------------------------------------------------------
  |
  | If the user came from an invitation,
  | preserve that invitation when moving
  | from Login → Register.
  |
  */

  const registerUrl =
    returnTo !==
    "/dashboard"
      ? `/register?returnTo=${encodeURIComponent(
          returnTo
        )}`
      : "/register";

  const forgotPasswordUrl =
    form.email.trim()
      ? `/forgot-password?email=${encodeURIComponent(
          form.email
            .trim()
            .toLowerCase()
        )}`
      : "/forgot-password";

  return (
    <AuthLayout active="login">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-kite-ink">
          Welcome back
        </h1>

        <p className="mt-1.5 text-sm leading-6 text-kite-muted">
          Log in to continue to
          your workspace.
        </p>
      </div>

      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-5"
        noValidate
      >
        {/* EMAIL */}

        <div>
          <label
            htmlFor="login-email"
            className="mb-2 block text-sm font-medium text-kite-muted"
          >
            Email
          </label>

          <input
            id="login-email"
            type="email"
            value={
              form.email
            }
            onChange={(
              event
            ) => {
              setForm({
                ...form,

                email:
                  event.target
                    .value,
              });

              setErrors({
                ...errors,

                email:
                  undefined,
              });

              setMessage("");
            }}
            placeholder="you@kitedesk.com"
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

        {/* PASSWORD */}

        <div>
          <label
            htmlFor="login-password"
            className="mb-2 block text-sm font-medium text-kite-muted"
          >
            Password
          </label>

          <div className="relative">
            <input
              id="login-password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={
                form.password
              }
              onChange={(
                event
              ) => {
                setForm({
                  ...form,

                  password:
                    event.target
                      .value,
                });

                setErrors({
                  ...errors,

                  password:
                    undefined,
                });

                setMessage("");
              }}
              placeholder="••••••••"
              autoComplete="current-password"
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

          {errors.password && (
            <p className="mt-2 text-sm text-red-500">
              {
                errors.password
              }
            </p>
          )}
        </div>

        {/* REMEMBER / FORGOT */}

        <div className="flex items-center justify-between gap-3 text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-kite-muted">
            <input
              type="checkbox"
              checked={
                form.rememberMe
              }
              disabled={
                isSubmitting
              }
              onChange={(
                event
              ) =>
                setForm({
                  ...form,

                  rememberMe:
                    event.target
                      .checked,
                })
              }
              className="h-4 w-4 accent-[#6E94B0]"
            />

            Remember me
          </label>

          <Link
            to={
              forgotPasswordUrl
            }
            className="font-medium text-kite-blue-deep transition hover:text-kite-ink"
          >
            Forgot password?
          </Link>
        </div>

        {/* API ERROR */}

        {message && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {message}
          </div>
        )}

        {/* LOGIN */}

        <button
          type="submit"
          disabled={
            isSubmitting
          }
          className="w-full rounded-xl bg-gradient-to-br from-kite-blue to-kite-blue-deep px-4 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_22px_-12px_rgba(110,148,176,0.8)] transition hover:-translate-y-[1px] hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? "Logging in..."
            : "Log in"}
        </button>
      </form>

      {/* DIVIDER */}

      <div className="my-6 flex items-center gap-4 text-xs text-kite-faint">
        <div className="h-px flex-1 bg-kite-line" />

        <span>
          Or use the following
          methods
        </span>

        <div className="h-px flex-1 bg-kite-line" />
      </div>

      {/* SOCIAL */}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled
          title="Coming later"
          className="rounded-xl border border-kite-line bg-kite-soft px-4 py-3 text-sm font-medium text-kite-muted"
        >
          Google
        </button>

        <button
          type="button"
          disabled
          title="Coming later"
          className="rounded-xl border border-kite-line bg-kite-soft px-4 py-3 text-sm font-medium text-kite-muted"
        >
          GitHub
        </button>
      </div>

      <p className="mt-7 text-center text-sm text-kite-muted">
        Don&apos;t have an
        account yet?{" "}

        <Link
          to={
            registerUrl
          }
          className="font-medium text-kite-blue-deep hover:text-kite-ink"
        >
          Register now!
        </Link>
      </p>
    </AuthLayout>
  );
}

export default LoginPage;