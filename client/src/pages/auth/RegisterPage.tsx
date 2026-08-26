import {
  useEffect,
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

import {
  invitationService,
} from "../../services/invitation.service";

type RegisterForm = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
};

type RegisterErrors = Partial<
  Record<
    keyof RegisterForm,
    string
  >
>;

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
| INVITATION TOKEN
|--------------------------------------------------------------------------
|
| Example:
|
| /invitations/abc123
|
| becomes:
|
| abc123
|
*/

function getInvitationToken(
  returnTo: string | null
) {
  if (!returnTo) {
    return null;
  }

  const match =
    returnTo.match(
      /^\/invitations\/([^/?#]+)/
    );

  if (!match) {
    return null;
  }

  return decodeURIComponent(
    match[1]
  );
}

function RegisterPage() {
  const navigate =
    useNavigate();

  const [
    searchParams,
  ] =
    useSearchParams();

  const {
    register,
  } =
    useAuth();

  /*
  |--------------------------------------------------------------------------
  | RETURN DESTINATION
  |--------------------------------------------------------------------------
  */

  const returnTo =
    getSafeReturnTo(
      searchParams.get(
        "returnTo"
      )
    );

  const invitationToken =
    getInvitationToken(
      returnTo
    );

  const isInvitationRegistration =
    Boolean(
      invitationToken
    );

  /*
  |--------------------------------------------------------------------------
  | FORM
  |--------------------------------------------------------------------------
  */

  const [
    form,
    setForm,
  ] =
    useState<RegisterForm>({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptedTerms: false,
    });

  const [
    errors,
    setErrors,
  ] =
    useState<RegisterErrors>(
      {}
    );

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    showConfirm,
    setShowConfirm,
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
  | INVITATION EMAIL
  |--------------------------------------------------------------------------
  */

  const [
    invitationEmail,
    setInvitationEmail,
  ] =
    useState<
      string | null
    >(null);

  const [
    invitationWorkspaceName,
    setInvitationWorkspaceName,
  ] =
    useState<
      string | null
    >(null);

  const [
    isLoadingInvitation,
    setIsLoadingInvitation,
  ] =
    useState(
      Boolean(
        invitationToken
      )
    );

  const [
    invitationError,
    setInvitationError,
  ] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | LOAD INVITATION
  |--------------------------------------------------------------------------
  |
  | If the user reached registration
  | through an invitation, fetch the
  | invitation and lock registration
  | to the invited email address.
  |
  */

  useEffect(
    () => {
      if (
        !invitationToken
      ) {
        setIsLoadingInvitation(
          false
        );

        return;
      }

      let active = true;

      const loadInvitation =
        async () => {
          setIsLoadingInvitation(
            true
          );

          setInvitationError(
            ""
          );

          try {
            const response =
              await invitationService.getByToken(
                invitationToken
              );

            if (!active) {
              return;
            }

            const invitation =
              response.data
                .invitation;

            /*
             * Only pending invitations
             * should be used to create
             * a new account.
             */

            if (
              invitation.status !==
              "PENDING"
            ) {
              setInvitationError(
                `This invitation is ${invitation.status.toLowerCase()} and can no longer be used.`
              );

              return;
            }

            const invitedEmail =
              invitation.email
                .trim()
                .toLowerCase();

            setInvitationEmail(
              invitedEmail
            );

            setInvitationWorkspaceName(
              invitation.workspace
                .name
            );

            /*
             * Prefill the email.
             */

            setForm(
              (
                current
              ) => ({
                ...current,

                email:
                  invitedEmail,
              })
            );
          } catch (error) {
            console.error(
              "Failed to load invitation:",
              error
            );

            if (
              !active
            ) {
              return;
            }

            if (
              error instanceof
              ApiError
            ) {
              setInvitationError(
                error.message
              );
            } else {
              setInvitationError(
                "Unable to load this invitation."
              );
            }
          } finally {
            if (
              active
            ) {
              setIsLoadingInvitation(
                false
              );
            }
          }
        };

      void loadInvitation();

      return () => {
        active = false;
      };
    },
    [
      invitationToken,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | VALIDATION
  |--------------------------------------------------------------------------
  */

  const validate =
    () => {
      const nextErrors:
        RegisterErrors = {};

      if (
        form.name
          .trim()
          .length < 2
      ) {
        nextErrors.name =
          "Please enter your full name.";
      }

      if (
        !form.email.trim()
      ) {
        nextErrors.email =
          "Email is required.";
      } else if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          form.email.trim()
        )
      ) {
        nextErrors.email =
          "Please enter a valid email.";
      }

      /*
       * Extra safety:
       *
       * registration through an
       * invitation must use the
       * invited email.
       */

      if (
        invitationEmail &&
        form.email
          .trim()
          .toLowerCase() !==
          invitationEmail
      ) {
        nextErrors.email =
          "You must register using the email address that received this invitation.";
      }

      if (
        form.password.length <
        8
      ) {
        nextErrors.password =
          "Password must contain at least 8 characters.";
      } else if (
        !/[A-Z]/.test(
          form.password
        ) ||
        !/[a-z]/.test(
          form.password
        ) ||
        !/[0-9]/.test(
          form.password
        )
      ) {
        nextErrors.password =
          "Use uppercase, lowercase, and a number.";
      }

      if (
        form.confirmPassword !==
        form.password
      ) {
        nextErrors.confirmPassword =
          "Passwords do not match.";
      }

      if (
        !form.acceptedTerms
      ) {
        nextErrors.acceptedTerms =
          "You must agree to the terms.";
      }

      return nextErrors;
    };

  /*
  |--------------------------------------------------------------------------
  | REGISTER
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

      if (
        invitationToken &&
        !invitationEmail
      ) {
        setMessage(
          "The invitation could not be verified."
        );

        return;
      }

      setErrors({});

      setIsSubmitting(
        true
      );

      try {
        /*
         * POST /api/auth/register
         */

        await register({
          name:
            form.name.trim(),

          email:
            form.email
              .trim()
              .toLowerCase(),

          password:
            form.password,
        });

        /*
         * INVITATION REGISTRATION
         *
         * Go back to the invitation
         * instead of workspace onboarding.
         */

        if (
          returnTo
        ) {
          navigate(
            returnTo,
            {
              replace: true,
            }
          );

          return;
        }

        /*
         * NORMAL REGISTRATION
         *
         * New users create their first
         * workspace.
         */

        navigate(
          "/onboarding/workspace",
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
              RegisterErrors = {};

            for (
              const issue of
              error.errors
            ) {
              if (
                issue.field ===
                "name"
              ) {
                backendErrors.name =
                  issue.message;
              }

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
            "Registration failed:",
            error
          );

          setMessage(
            "Unable to create your account. Please try again."
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
  | INPUT STYLE
  |--------------------------------------------------------------------------
  */

  const inputClass =
    (
      error?: string
    ) =>
      `w-full rounded-xl border bg-kite-soft px-4 py-3.5 text-[15px] text-kite-ink outline-none transition placeholder:text-kite-faint focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
        error
          ? "border-red-300 focus:border-red-400 focus:ring-red-50"
          : "border-kite-line focus:border-kite-blue focus:ring-kite-blue-wash"
      }`;

  /*
  |--------------------------------------------------------------------------
  | LOGIN URL
  |--------------------------------------------------------------------------
  */

  const loginUrl =
    returnTo
      ? `/login?returnTo=${encodeURIComponent(
          returnTo
        )}`
      : "/login";

  /*
  |--------------------------------------------------------------------------
  | INVITATION LOADING
  |--------------------------------------------------------------------------
  */

  if (
    isLoadingInvitation
  ) {
    return (
      <AuthLayout active="register">
        <div className="py-12 text-center">
          <p className="text-sm text-kite-muted">
            Checking your
            invitation...
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout active="register">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-kite-ink">
          {isInvitationRegistration
            ? "Create your account"
            : "Create account"}
        </h1>

        <p className="mt-1.5 text-sm leading-6 text-kite-muted">
          {invitationWorkspaceName
            ? `Create your KiteDesk account to join ${invitationWorkspaceName}.`
            : "Start your KiteDesk workspace in just a few minutes."}
        </p>
      </div>

      {/* INVITATION NOTICE */}

      {invitationEmail &&
        invitationWorkspaceName && (
          <div className="mb-5 rounded-xl border border-kite-line bg-kite-blue-wash px-4 py-3.5">
            <p className="text-xs font-medium uppercase tracking-wide text-kite-blue-deep">
              Workspace invitation
            </p>

            <p className="mt-1 text-sm text-kite-ink">
              You&apos;re creating
              an account to join{" "}
              <span className="font-medium">
                {
                  invitationWorkspaceName
                }
              </span>
              .
            </p>

            <p className="mt-1 text-xs text-kite-muted">
              {
                invitationEmail
              }
            </p>
          </div>
        )}

      {/* INVITATION ERROR */}

      {invitationError && (
        <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">
            {
              invitationError
            }
          </p>

          <Link
            to="/login"
            className="mt-2 inline-block text-sm font-medium text-kite-blue-deep"
          >
            Go to login
          </Link>
        </div>
      )}

      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-4"
        noValidate
      >
        {/* NAME */}

        <div>
          <label
            htmlFor="register-name"
            className="mb-2 block text-sm font-medium text-kite-muted"
          >
            Full name
          </label>

          <input
            id="register-name"
            type="text"
            value={
              form.name
            }
            disabled={
              isSubmitting ||
              Boolean(
                invitationError
              )
            }
            onChange={(
              event
            ) => {
              setForm({
                ...form,

                name:
                  event.target
                    .value,
              });

              setErrors({
                ...errors,

                name:
                  undefined,
              });

              setMessage("");
            }}
            placeholder="Your name"
            autoComplete="name"
            className={
              inputClass(
                errors.name
              )
            }
          />

          {errors.name && (
            <p className="mt-2 text-sm text-red-500">
              {
                errors.name
              }
            </p>
          )}
        </div>

        {/* EMAIL */}

        <div>
          <label
            htmlFor="register-email"
            className="mb-2 block text-sm font-medium text-kite-muted"
          >
            Email
          </label>

          <input
            id="register-email"
            type="email"
            value={
              form.email
            }
            disabled={
              isSubmitting ||
              Boolean(
                invitationEmail
              ) ||
              Boolean(
                invitationError
              )
            }
            onChange={(
              event
            ) => {
              /*
               * Invitation email is
               * intentionally locked.
               */

              if (
                invitationEmail
              ) {
                return;
              }

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
            className={
              inputClass(
                errors.email
              )
            }
          />

          {invitationEmail && (
            <p className="mt-2 text-xs leading-5 text-kite-faint">
              This email is locked
              because the invitation
              was sent to this
              address.
            </p>
          )}

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
            htmlFor="register-password"
            className="mb-2 block text-sm font-medium text-kite-muted"
          >
            Password
          </label>

          <div className="relative">
            <input
              id="register-password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={
                form.password
              }
              disabled={
                isSubmitting ||
                Boolean(
                  invitationError
                )
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

                  confirmPassword:
                    undefined,
                });

                setMessage("");
              }}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              className={`${inputClass(
                errors.password
              )} pr-16`}
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
              className="absolute inset-y-0 right-0 px-4 text-xs font-medium text-kite-muted hover:text-kite-ink disabled:cursor-not-allowed disabled:opacity-50"
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

        {/* CONFIRM PASSWORD */}

        <div>
          <label
            htmlFor="register-confirm"
            className="mb-2 block text-sm font-medium text-kite-muted"
          >
            Confirm password
          </label>

          <div className="relative">
            <input
              id="register-confirm"
              type={
                showConfirm
                  ? "text"
                  : "password"
              }
              value={
                form.confirmPassword
              }
              disabled={
                isSubmitting ||
                Boolean(
                  invitationError
                )
              }
              onChange={(
                event
              ) => {
                setForm({
                  ...form,

                  confirmPassword:
                    event.target
                      .value,
                });

                setErrors({
                  ...errors,

                  confirmPassword:
                    undefined,
                });

                setMessage("");
              }}
              placeholder="Repeat your password"
              autoComplete="new-password"
              className={`${inputClass(
                errors.confirmPassword
              )} pr-16`}
            />

            <button
              type="button"
              onClick={() =>
                setShowConfirm(
                  (value) =>
                    !value
                )
              }
              disabled={
                isSubmitting
              }
              className="absolute inset-y-0 right-0 px-4 text-xs font-medium text-kite-muted hover:text-kite-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              {showConfirm
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

        {/* TERMS */}

        <div>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-kite-muted">
            <input
              type="checkbox"
              checked={
                form.acceptedTerms
              }
              disabled={
                isSubmitting ||
                Boolean(
                  invitationError
                )
              }
              onChange={(
                event
              ) => {
                setForm({
                  ...form,

                  acceptedTerms:
                    event.target
                      .checked,
                });

                setErrors({
                  ...errors,

                  acceptedTerms:
                    undefined,
                });

                setMessage("");
              }}
              className="mt-1 h-4 w-4 accent-[#6E94B0]"
            />

            <span>
              I have read and
              agree to the{" "}
              <button
                type="button"
                className="font-medium text-kite-blue-deep"
              >
                Terms of Service
              </button>
              .
            </span>
          </label>

          {errors.acceptedTerms && (
            <p className="mt-2 text-sm text-red-500">
              {
                errors.acceptedTerms
              }
            </p>
          )}
        </div>

        {/* API ERROR */}

        {message && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {message}
          </div>
        )}

        {/* REGISTER */}

        <button
          type="submit"
          disabled={
            isSubmitting ||
            Boolean(
              invitationError
            )
          }
          className="w-full rounded-xl bg-gradient-to-br from-kite-blue to-kite-blue-deep px-4 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_22px_-12px_rgba(110,148,176,0.8)] transition hover:-translate-y-[1px] hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? "Creating account..."
            : isInvitationRegistration
              ? "Create Account & Continue"
              : "Register"}
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
          disabled
          type="button"
          title="Coming later"
          className="rounded-xl border border-kite-line bg-kite-soft px-4 py-3 text-sm font-medium text-kite-muted"
        >
          Google
        </button>

        <button
          disabled
          type="button"
          title="Coming later"
          className="rounded-xl border border-kite-line bg-kite-soft px-4 py-3 text-sm font-medium text-kite-muted"
        >
          GitHub
        </button>
      </div>

      <p className="mt-7 text-center text-sm text-kite-muted">
        Already have an
        account?{" "}

        <Link
          to={
            loginUrl
          }
          className="font-medium text-kite-blue-deep hover:text-kite-ink"
        >
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}

export default RegisterPage;