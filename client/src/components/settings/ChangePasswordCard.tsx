import {
  useState,
  type FormEvent,
} from "react";

import {
  useSettings,
} from "../../context/SettingsContext";

/*
|--------------------------------------------------------------------------
| COMPONENT
|--------------------------------------------------------------------------
*/

function ChangePasswordCard() {
  const {
    changePassword,
    isChangingPassword,
  } =
    useSettings();

  const [
    currentPassword,
    setCurrentPassword,
  ] =
    useState("");

  const [
    newPassword,
    setNewPassword,
  ] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState("");

  const [
    showCurrentPassword,
    setShowCurrentPassword,
  ] =
    useState(false);

  const [
    showNewPassword,
    setShowNewPassword,
  ] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    success,
    setSuccess,
  ] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | VALIDATION
  |--------------------------------------------------------------------------
  */

  const validate = () => {
    if (
      !currentPassword
    ) {
      return "Enter your current password.";
    }

    if (
      newPassword.length <
      8
    ) {
      return "New password must contain at least 8 characters.";
    }

    if (
      newPassword.length >
      128
    ) {
      return "New password is too long.";
    }

    if (
      currentPassword ===
      newPassword
    ) {
      return "New password must be different from your current password.";
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      return "New passwords do not match.";
    }

    return "";
  };

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

      setError(
        ""
      );

      setSuccess(
        ""
      );

      const validationError =
        validate();

      if (
        validationError
      ) {
        setError(
          validationError
        );

        return;
      }

      try {
        const message =
          await changePassword({
            currentPassword,

            newPassword,
          });

        setSuccess(
          message
        );

        /*
         * Clear all passwords from
         * component memory after save.
         */
        setCurrentPassword(
          ""
        );

        setNewPassword(
          ""
        );

        setConfirmPassword(
          ""
        );

        setShowCurrentPassword(
          false
        );

        setShowNewPassword(
          false
        );

        setShowConfirmPassword(
          false
        );
      } catch (
        caughtError
      ) {
        setError(
          caughtError instanceof
            Error
            ? caughtError.message
            : "Unable to change password."
        );
      }
    };

  const hasInput =
    Boolean(
      currentPassword ||
      newPassword ||
      confirmPassword
    );

  return (
    <form
      onSubmit={
        handleSubmit
      }
    >
      <section className="overflow-hidden rounded-2xl border border-kite-line bg-white">

        {/* HEADER */}
        <div className="border-b border-kite-line px-5 py-5 sm:px-6">

          <h3 className="font-semibold text-kite-ink">
            Password
          </h3>

          <p className="mt-1 text-sm leading-6 text-kite-muted">
            Update the password used to sign in to your KiteDesk account.
          </p>

        </div>

        {/* FORM */}
        <div className="space-y-5 p-5 sm:p-6">

          {/* CURRENT PASSWORD */}
          <PasswordField
            id="current-password"
            label="Current password"
            value={
              currentPassword
            }
            show={
              showCurrentPassword
            }
            autoComplete="current-password"
            disabled={
              isChangingPassword
            }
            onShowChange={
              setShowCurrentPassword
            }
            onChange={(
              value
            ) => {
              setCurrentPassword(
                value
              );

              setError(
                ""
              );

              setSuccess(
                ""
              );
            }}
          />

          <div className="grid gap-5 md:grid-cols-2">

            {/* NEW PASSWORD */}
            <PasswordField
              id="new-password"
              label="New password"
              value={
                newPassword
              }
              show={
                showNewPassword
              }
              autoComplete="new-password"
              disabled={
                isChangingPassword
              }
              onShowChange={
                setShowNewPassword
              }
              onChange={(
                value
              ) => {
                setNewPassword(
                  value
                );

                setError(
                  ""
                );

                setSuccess(
                  ""
                );
              }}
            />

            {/* CONFIRM */}
            <PasswordField
              id="confirm-new-password"
              label="Confirm new password"
              value={
                confirmPassword
              }
              show={
                showConfirmPassword
              }
              autoComplete="new-password"
              disabled={
                isChangingPassword
              }
              onShowChange={
                setShowConfirmPassword
              }
              onChange={(
                value
              ) => {
                setConfirmPassword(
                  value
                );

                setError(
                  ""
                );

                setSuccess(
                  ""
                );
              }}
            />

          </div>

          <p className="text-xs leading-5 text-kite-faint">
            Your password must contain at least 8 characters.
          </p>

          {/* ERROR */}
          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">

              <p className="text-sm text-red-600">
                {
                  error
                }
              </p>

            </div>
          )}

          {/* SUCCESS */}
          {success && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">

              <p className="text-sm font-medium text-emerald-700">
                ✓ {
                  success
                }
              </p>

            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="flex flex-col justify-between gap-3 border-t border-kite-line bg-kite-soft/50 px-5 py-4 sm:flex-row sm:items-center sm:px-6">

          <p className="text-xs leading-5 text-kite-muted">
            You will remain signed in after changing your password.
          </p>

          <button
            type="submit"
            disabled={
              !hasInput ||
              isChangingPassword
            }
            className="rounded-xl bg-kite-blue-deep px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isChangingPassword
              ? "Changing Password..."
              : "Change Password"}
          </button>

        </div>

      </section>
    </form>
  );
}

/*
|--------------------------------------------------------------------------
| PASSWORD FIELD
|--------------------------------------------------------------------------
*/

function PasswordField({
  id,
  label,
  value,
  show,
  autoComplete,
  disabled,
  onChange,
  onShowChange,
}: {
  id: string;

  label: string;

  value: string;

  show: boolean;

  autoComplete:
    | "current-password"
    | "new-password";

  disabled: boolean;

  onChange: (
    value: string
  ) => void;

  onShowChange: (
    show: boolean
  ) => void;
}) {
  return (
    <div>

      <label
        htmlFor={
          id
        }
        className="mb-2 block text-sm font-medium text-kite-muted"
      >
        {
          label
        }
      </label>

      <div className="relative">

        <input
          id={
            id
          }
          type={
            show
              ? "text"
              : "password"
          }
          value={
            value
          }
          disabled={
            disabled
          }
          autoComplete={
            autoComplete
          }
          onChange={(
            event
          ) =>
            onChange(
              event.target.value
            )
          }
          className="w-full rounded-xl border border-kite-line bg-kite-soft px-4 py-3.5 pr-16 text-sm text-kite-ink outline-none transition focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash disabled:cursor-not-allowed disabled:opacity-60"
        />

        <button
          type="button"
          disabled={
            disabled
          }
          onClick={() =>
            onShowChange(
              !show
            )
          }
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-medium text-kite-muted transition hover:bg-white hover:text-kite-ink disabled:cursor-not-allowed"
        >
          {show
            ? "Hide"
            : "Show"}
        </button>

      </div>

    </div>
  );
}

export default ChangePasswordCard;