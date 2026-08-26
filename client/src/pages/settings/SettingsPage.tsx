import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router";

import {
  useSettings,
  type NotificationPreferences,
} from "../../context/SettingsContext";

import {
  useWorkspace,
} from "../../context/WorkspaceContext";

import ChangePasswordCard from "../../components/settings/ChangePasswordCard";
/*
|--------------------------------------------------------------------------
| SECTIONS
|--------------------------------------------------------------------------
*/

type SettingsSection =
  | "profile"
  | "notifications"
  | "account"
  | "workspace"
  | "appearance";

const sections: {
  id: SettingsSection;

  label: string;

  description: string;
}[] = [
  {
    id: "profile",

    label: "Profile",

    description:
      "How teammates see you",
  },

  {
    id: "notifications",

    label: "Notifications",

    description:
      "Choose which alerts you receive",
  },

  {
    id: "account",

    label:
      "Account & Security",

    description:
      "Login and account information",
  },

  {
    id: "workspace",

    label:
      "Workspace Access",

    description:
      "Your workspace and role",
  },

  {
    id: "appearance",

    label: "Appearance",

    description:
      "Theme and display preferences",
  },
];

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

function SettingsPage() {
  const location =
    useLocation();

  const navigate =
    useNavigate();

  const {
    settings,

    isLoaded,

    isLoading,

    isSavingProfile,

    isSavingNotifications,

    error,

    refreshSettings,

    updateProfile,

    updateNotificationPreferences,
  } =
    useSettings();

  const {
    workspace,
  } =
    useWorkspace();

  /*
  |--------------------------------------------------------------------------
  | ACTIVE SECTION
  |--------------------------------------------------------------------------
  */

  const activeSection =
    getSectionFromHash(
      location.hash
    );

  const openSection =
    (
      section:
        SettingsSection
    ) => {
      navigate(
        `/settings#${section}`
      );
    };

  /*
  |--------------------------------------------------------------------------
  | PROFILE FORM
  |--------------------------------------------------------------------------
  */

  const [
    displayName,
    setDisplayName,
  ] =
    useState("");

  const [
    jobTitle,
    setJobTitle,
  ] =
    useState("");

  const [
    profileErrors,
    setProfileErrors,
  ] =
    useState<{
      displayName?:
        string;

      jobTitle?:
        string;
    }>({});

  const [
    profileSaved,
    setProfileSaved,
  ] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | ACCOUNT FORM
  |--------------------------------------------------------------------------
  */

  const [
    accountEmail,
    setAccountEmail,
  ] =
    useState("");

  const [
    accountEmailError,
    setAccountEmailError,
  ] =
    useState("");

  const [
    accountSaved,
    setAccountSaved,
  ] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | NOTIFICATION UI
  |--------------------------------------------------------------------------
  */

  const [
    notificationAction,
    setNotificationAction,
  ] =
    useState<
      keyof NotificationPreferences |
      null
    >(null);

  const [
    notificationSaved,
    setNotificationSaved,
  ] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | SYNC API DATA → FORMS
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      setDisplayName(
        settings.profile
          .displayName
      );

      setJobTitle(
        settings.profile
          .jobTitle ??
          ""
      );

      setAccountEmail(
        settings.profile
          .email
      );
    },
    [
      settings.profile,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | PROFILE CHANGES
  |--------------------------------------------------------------------------
  */

  const profileHasChanges =
    displayName.trim() !==
      settings.profile
        .displayName ||
    jobTitle.trim() !==
      (settings.profile
        .jobTitle ??
        "");

  const resetProfileForm =
    () => {
      setDisplayName(
        settings.profile
          .displayName
      );

      setJobTitle(
        settings.profile
          .jobTitle ??
          ""
      );

      setProfileErrors(
        {}
      );

      setProfileSaved(
        false
      );
    };

  const handleProfileSubmit =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      const errors: {
        displayName?:
          string;

        jobTitle?:
          string;
      } = {};

      const nextName =
        displayName.trim();

      const nextJobTitle =
        jobTitle.trim();

      if (
        nextName.length <
        2
      ) {
        errors.displayName =
          "Display name must contain at least 2 characters.";
      }

      if (
        nextName.length >
        100
      ) {
        errors.displayName =
          "Display name is too long.";
      }

      if (
        nextJobTitle.length >
        100
      ) {
        errors.jobTitle =
          "Job title is too long.";
      }

      if (
        Object.keys(
          errors
        ).length >
        0
      ) {
        setProfileErrors(
          errors
        );

        return;
      }

      setProfileErrors(
        {}
      );

      setProfileSaved(
        false
      );

      try {
        await updateProfile(
          {
            displayName:
              nextName,

            jobTitle:
              nextJobTitle ||
              null,
          }
        );

        setProfileSaved(
          true
        );

        window.setTimeout(
          () => {
            setProfileSaved(
              false
            );
          },
          2500
        );
      } catch {
        /*
         * Error comes from SettingsContext.
         */
      }
    };

  /*
  |--------------------------------------------------------------------------
  | ACCOUNT CHANGES
  |--------------------------------------------------------------------------
  */

  const accountHasChanges =
    accountEmail
      .trim()
      .toLowerCase() !==
    settings.profile
      .email
      .toLowerCase();

  const resetAccountForm =
    () => {
      setAccountEmail(
        settings.profile
          .email
      );

      setAccountEmailError(
        ""
      );

      setAccountSaved(
        false
      );
    };

  const handleAccountSubmit =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      const nextEmail =
        accountEmail
          .trim()
          .toLowerCase();

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (
        !emailRegex.test(
          nextEmail
        )
      ) {
        setAccountEmailError(
          "Enter a valid email address."
        );

        return;
      }

      setAccountEmailError(
        ""
      );

      setAccountSaved(
        false
      );

      try {
        await updateProfile(
          {
            email:
              nextEmail,
          }
        );

        setAccountSaved(
          true
        );

        window.setTimeout(
          () => {
            setAccountSaved(
              false
            );
          },
          2500
        );
      } catch {
        /*
         * EMAIL_ALREADY_EXISTS and other
         * API errors are shown using the
         * SettingsContext error message.
         */
      }
    };

  /*
  |--------------------------------------------------------------------------
  | NOTIFICATION PREFERENCE
  |--------------------------------------------------------------------------
  */

  const handleNotificationChange =
    async (
      key:
        keyof NotificationPreferences,

      enabled:
        boolean
    ) => {
      if (
        notificationAction
      ) {
        return;
      }

      setNotificationAction(
        key
      );

      setNotificationSaved(
        false
      );

      const patch:
        Partial<NotificationPreferences> =
        {
          [key]:
            enabled,
        };

      try {
        await updateNotificationPreferences(
          patch
        );

        setNotificationSaved(
          true
        );

        window.setTimeout(
          () => {
            setNotificationSaved(
              false
            );
          },
          2000
        );
      } catch {
        /*
         * API error displayed by context.
         */
      } finally {
        setNotificationAction(
          null
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOADING
  |--------------------------------------------------------------------------
  */

  if (
    !isLoaded
  ) {
    return (
      <SettingsSkeleton />
    );
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1300px]">

      {/* HEADER */}
      <div className="mb-5 sm:mb-7">

        <h1 className="text-2xl font-semibold tracking-tight text-kite-ink sm:text-3xl">
          Settings
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-kite-muted">
          Manage your profile, notifications, account, and personal KiteDesk preferences.
        </p>

      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-5 flex flex-col items-start justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">

          <p className="text-sm text-red-600">
            {
              error
            }
          </p>

          <button
            type="button"
            onClick={() =>
              void refreshSettings()
            }
            className="shrink-0 text-xs font-medium text-red-700"
          >
            Retry
          </button>

        </div>
      )}

      <div className="grid min-w-0 gap-5 sm:gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">

        {/* SETTINGS NAVIGATION */}
        <aside className="min-w-0">

          <div className="flex min-w-0 gap-2 overflow-x-auto rounded-2xl border border-kite-line bg-white p-2 lg:block lg:overflow-visible">

            {sections.map(
              (
                section
              ) => {
                const active =
                  activeSection ===
                  section.id;

                return (
                  <button
                    key={
                      section.id
                    }
                    type="button"
                    onClick={() =>
                      openSection(
                        section.id
                      )
                    }
                    className={`shrink-0 whitespace-nowrap rounded-xl px-4 py-2.5 text-left transition lg:w-full lg:whitespace-normal lg:py-3 ${
                      active
                        ? "bg-kite-blue-wash"
                        : "hover:bg-kite-soft"
                    }`}
                  >

                    <div className="flex items-center justify-between gap-3">

                      <div className="min-w-0">

                        <p
                          className={`text-sm font-medium ${
                            active
                              ? "text-kite-blue-deep"
                              : "text-kite-ink"
                          }`}
                        >
                          {
                            section.label
                          }
                        </p>

                        <p className="mt-1 hidden text-xs leading-5 text-kite-muted lg:block">
                          {
                            section.description
                          }
                        </p>

                      </div>

                      {section.id ===
                        "appearance" && (
                        <span className="shrink-0 rounded-md bg-kite-soft px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-kite-muted">
                          Soon
                        </span>
                      )}

                    </div>

                  </button>
                );
              }
            )}

          </div>

        </aside>

        {/* CONTENT */}
        <main className="min-w-0">

          {/* PROFILE */}
          {activeSection ===
            "profile" && (
            <form
              onSubmit={
                handleProfileSubmit
              }
              className="space-y-5"
            >

              <section className="overflow-hidden rounded-2xl border border-kite-line bg-white">

                <SettingsHeader
                  title="Profile"
                  description="Control how your personal information appears to teammates inside KiteDesk."
                />

                <div className="p-4 sm:p-6">

                  {/* PROFILE PREVIEW */}
                  <div className="mb-6 flex min-w-0 items-center gap-3 sm:mb-7 sm:gap-4">

                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-kite-blue-wash text-base font-semibold text-kite-blue-deep sm:h-16 sm:w-16 sm:text-lg">
                      {getInitials(
                        displayName ||
                          settings.profile
                            .displayName
                      )}
                    </div>

                    <div className="min-w-0">

                      <p className="truncate font-semibold text-kite-ink">
                        {displayName ||
                          "KiteDesk User"}
                      </p>

                      <p className="mt-1 truncate text-sm text-kite-muted">
                        {jobTitle ||
                          "Workspace member"}
                      </p>

                    </div>

                  </div>

                  <div className="space-y-5">

                    {/* NAME */}
                    <div>

                      <label
                        htmlFor="settings-display-name"
                        className="mb-2 block text-sm font-medium text-kite-muted"
                      >
                        Display name
                      </label>

                      <input
                        id="settings-display-name"
                        value={
                          displayName
                        }
                        maxLength={
                          100
                        }
                        onChange={(
                          event
                        ) => {
                          setDisplayName(
                            event.target
                              .value
                          );

                          setProfileSaved(
                            false
                          );

                          setProfileErrors(
                            (
                              current
                            ) => ({
                              ...current,

                              displayName:
                                undefined,
                            })
                          );
                        }}
                        className={`w-full rounded-xl border bg-kite-soft px-4 py-3.5 text-sm text-kite-ink outline-none transition focus:bg-white focus:ring-4 ${
                          profileErrors.displayName
                            ? "border-red-300 focus:ring-red-50"
                            : "border-kite-line focus:border-kite-blue focus:ring-kite-blue-wash"
                        }`}
                      />

                      {profileErrors.displayName && (
                        <p className="mt-2 text-sm text-red-500">
                          {
                            profileErrors.displayName
                          }
                        </p>
                      )}

                    </div>

                    {/* JOB TITLE */}
                    <div>

                      <label
                        htmlFor="settings-job-title"
                        className="mb-2 block text-sm font-medium text-kite-muted"
                      >
                        Job title
                      </label>

                      <input
                        id="settings-job-title"
                        value={
                          jobTitle
                        }
                        maxLength={
                          100
                        }
                        onChange={(
                          event
                        ) => {
                          setJobTitle(
                            event.target
                              .value
                          );

                          setProfileSaved(
                            false
                          );

                          setProfileErrors(
                            (
                              current
                            ) => ({
                              ...current,

                              jobTitle:
                                undefined,
                            })
                          );
                        }}
                        placeholder="e.g. Frontend Developer"
                        className={`w-full rounded-xl border bg-kite-soft px-4 py-3.5 text-sm text-kite-ink outline-none transition placeholder:text-kite-faint focus:bg-white focus:ring-4 ${
                          profileErrors.jobTitle
                            ? "border-red-300 focus:ring-red-50"
                            : "border-kite-line focus:border-kite-blue focus:ring-kite-blue-wash"
                        }`}
                      />

                      {profileErrors.jobTitle && (
                        <p className="mt-2 text-sm text-red-500">
                          {
                            profileErrors.jobTitle
                          }
                        </p>
                      )}

                      <p className="mt-2 text-xs leading-5 text-kite-faint">
                        Your job title helps teammates understand your role.
                      </p>

                    </div>

                  </div>

                </div>

                {/* SAVE */}
                <SettingsSaveBar
                  saved={
                    profileSaved
                  }
                  hasChanges={
                    profileHasChanges
                  }
                  isSaving={
                    isSavingProfile
                  }
                  onReset={
                    resetProfileForm
                  }
                  savedText="Profile saved"
                />

              </section>

            </form>
          )}

          {/* NOTIFICATIONS */}
          {activeSection ===
            "notifications" && (
            <section className="overflow-hidden rounded-2xl border border-kite-line bg-white">

              <SettingsHeader
                title="Notification Preferences"
                description="Choose which events should generate notifications for your account."
              />

              <div className="divide-y divide-kite-line">

                <NotificationSetting
                  title="Task assignments"
                  description="Notify me when a task is assigned or reassigned to me."
                  enabled={
                    settings.notifications
                      .taskAssignments
                  }
                  disabled={
                    isSavingNotifications
                  }
                  saving={
                    notificationAction ===
                    "taskAssignments"
                  }
                  onChange={(
                    enabled
                  ) =>
                    void handleNotificationChange(
                      "taskAssignments",
                      enabled
                    )
                  }
                />

                <NotificationSetting
                  title="Review activity"
                  description="Notify me when work needs review, is approved, or changes are requested."
                  enabled={
                    settings.notifications
                      .reviewActivity
                  }
                  disabled={
                    isSavingNotifications
                  }
                  saving={
                    notificationAction ===
                    "reviewActivity"
                  }
                  onChange={(
                    enabled
                  ) =>
                    void handleNotificationChange(
                      "reviewActivity",
                      enabled
                    )
                  }
                />

                <NotificationSetting
                  title="Task comments"
                  description="Notify me when another teammate comments on relevant work."
                  enabled={
                    settings.notifications
                      .comments
                  }
                  disabled={
                    isSavingNotifications
                  }
                  saving={
                    notificationAction ===
                    "comments"
                  }
                  onChange={(
                    enabled
                  ) =>
                    void handleNotificationChange(
                      "comments",
                      enabled
                    )
                  }
                />

                <NotificationSetting
                  title="Deadlines"
                  description="Notify me about tasks that are due soon or overdue."
                  enabled={
                    settings.notifications
                      .deadlines
                  }
                  disabled={
                    isSavingNotifications
                  }
                  saving={
                    notificationAction ===
                    "deadlines"
                  }
                  onChange={(
                    enabled
                  ) =>
                    void handleNotificationChange(
                      "deadlines",
                      enabled
                    )
                  }
                />

                <NotificationSetting
                  title="Project membership"
                  description="Notify me when I'm added to or removed from a project."
                  enabled={
                    settings.notifications
                      .projectMembership
                  }
                  disabled={
                    isSavingNotifications
                  }
                  saving={
                    notificationAction ===
                    "projectMembership"
                  }
                  onChange={(
                    enabled
                  ) =>
                    void handleNotificationChange(
                      "projectMembership",
                      enabled
                    )
                  }
                />

              </div>

              <div className="border-t border-kite-line bg-kite-soft/50 px-4 py-4 sm:px-6">

                {notificationSaved ? (
                  <p className="text-xs font-medium text-emerald-600">
                    ✓ Preferences saved
                  </p>
                ) : (
                  <p className="text-xs leading-5 text-kite-muted">
                    Preferences save automatically. Turning a category off affects new notifications; existing notification history remains.
                  </p>
                )}

              </div>

            </section>
          )}

          {/* ACCOUNT */}
          {activeSection ===
            "account" && (
            <div className="space-y-5">

              <form
                onSubmit={
                  handleAccountSubmit
                }
              >

                <section className="overflow-hidden rounded-2xl border border-kite-line bg-white">

                  <SettingsHeader
                    title="Account & Security"
                    description="Manage your login information and account security."
                  />

                  <div className="p-4 sm:p-6">

                    <div>

                      <label
                        htmlFor="settings-account-email"
                        className="mb-2 block text-sm font-medium text-kite-muted"
                      >
                        Login email
                      </label>

                      <input
                        id="settings-account-email"
                        type="email"
                        value={
                          accountEmail
                        }
                        onChange={(
                          event
                        ) => {
                          setAccountEmail(
                            event.target
                              .value
                          );

                          setAccountEmailError(
                            ""
                          );

                          setAccountSaved(
                            false
                          );
                        }}
                        className={`w-full rounded-xl border bg-kite-soft px-4 py-3.5 text-sm text-kite-ink outline-none transition focus:bg-white focus:ring-4 ${
                          accountEmailError
                            ? "border-red-300 focus:ring-red-50"
                            : "border-kite-line focus:border-kite-blue focus:ring-kite-blue-wash"
                        }`}
                      />

                      {accountEmailError && (
                        <p className="mt-2 text-sm text-red-500">
                          {
                            accountEmailError
                          }
                        </p>
                      )}

                      <p className="mt-2 text-xs leading-5 text-kite-faint">
                        This email is used to sign in to KiteDesk. Email verification can be added later.
                      </p>

                    </div>

                  </div>

                  <SettingsSaveBar
                    saved={
                      accountSaved
                    }
                    hasChanges={
                      accountHasChanges
                    }
                    isSaving={
                      isSavingProfile
                    }
                    onReset={
                      resetAccountForm
                    }
                    savedText="Account updated"
                  />

                </section>

              </form>

              {/* PASSWORD */}
              <ChangePasswordCard />

              {/* SESSIONS */}
              <ComingSoonCard
                title="Active Sessions"
                description="Review devices and browsers currently signed in to your KiteDesk account."
                action="Manage sessions"
              />

              {/* MEMBER SINCE */}
              {settings.profile
                .createdAt && (
                <section className="rounded-2xl border border-kite-line bg-white p-4 sm:p-6">

                  <p className="text-xs font-medium uppercase tracking-wide text-kite-faint">
                    KiteDesk account
                  </p>

                  <p className="mt-2 text-sm text-kite-muted">
                    Member since{" "}
                    <span className="font-medium text-kite-ink">
                      {formatDate(
                        settings.profile
                          .createdAt
                      )}
                    </span>
                  </p>

                </section>
              )}

            </div>
          )}

          {/* WORKSPACE */}
          {activeSection ===
            "workspace" && (
            <div className="space-y-5">

              <section className="overflow-hidden rounded-2xl border border-kite-line bg-white">

                <SettingsHeader
                  title="Workspace Access"
                  description="Your membership and permissions in the active workspace."
                />

                <div className="p-4 sm:p-6">

                  <div className="grid gap-5 sm:grid-cols-2">

                    <InfoCard
                      label="Workspace"
                      value={
                        workspace?.name ??
                        "No workspace"
                      }
                    />

                    <InfoCard
                      label="Role"
                      value={
                        workspace?.role ??
                        "Member"
                      }
                    />

                  </div>

                  <div className="mt-6 rounded-xl border border-kite-line bg-kite-soft p-4">

                    <p className="text-sm font-medium text-kite-ink">
                      Workspace roles are managed separately.
                    </p>

                    <p className="mt-1 text-xs leading-5 text-kite-muted">
                      Personal Settings cannot change your workspace role. Owners and authorized managers control workspace membership and permissions.
                    </p>

                  </div>

                </div>

              </section>

              <section className="overflow-hidden rounded-2xl border border-kite-line bg-white">

                <SettingsHeader
                  title="Current Permissions"
                  description="What your current workspace role allows you to do."
                />

                <div className="p-4 sm:p-6">

                  <RolePermissions
                    role={
                      workspace?.role ??
                      "Member"
                    }
                  />

                </div>

              </section>

            </div>
          )}

          {/* APPEARANCE */}
          {activeSection ===
            "appearance" && (
            <section className="overflow-hidden rounded-2xl border border-kite-line bg-white">

              <SettingsHeader
                title="Appearance"
                description="Customize how KiteDesk looks on this device."
              />

              <div className="p-4 sm:p-6">

                <div className="rounded-2xl border border-kite-line bg-kite-soft p-4 text-center sm:p-6">

                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-kite-blue-wash text-kite-blue-deep">

                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      className="h-6 w-6"
                    >
                      <path d="M20.5 14.5A8 8 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z" />
                    </svg>

                  </div>

                  <h3 className="mt-4 font-semibold text-kite-ink">
                    Theme settings are coming later
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-kite-muted">
                    Light, dark, and system themes will be added after the core KiteDesk account features are complete.
                  </p>

                  <div className="mt-5 inline-flex rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-kite-muted">
                    Current theme: Light
                  </div>

                </div>

              </div>

            </section>
          )}

          {isLoading && (
            <p className="mt-4 text-left text-xs text-kite-faint sm:text-right">
              Refreshing settings...
            </p>
          )}

        </main>

      </div>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| SETTINGS HEADER
|--------------------------------------------------------------------------
*/

function SettingsHeader({
  title,
  description,
}: {
  title: string;

  description:
    string;
}) {
  return (
    <div className="border-b border-kite-line px-4 py-4 sm:px-6 sm:py-5">

      <h2 className="font-semibold text-kite-ink">
        {
          title
        }
      </h2>

      <p className="mt-1 text-sm leading-6 text-kite-muted">
        {
          description
        }
      </p>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| SAVE BAR
|--------------------------------------------------------------------------
*/

function SettingsSaveBar({
  saved,
  hasChanges,
  isSaving,
  onReset,
  savedText,
}: {
  saved: boolean;

  hasChanges:
    boolean;

  isSaving:
    boolean;

  onReset:
    () => void;

  savedText:
    string;
}) {
  return (
    <div className="flex flex-col justify-between gap-3 border-t border-kite-line bg-kite-soft/50 px-4 py-4 sm:flex-row sm:items-center sm:px-6">

      <div>

        {saved ? (
          <p className="text-sm font-medium text-emerald-600">
            ✓ {savedText}
          </p>
        ) : hasChanges ? (
          <p className="text-sm text-kite-muted">
            You have unsaved changes.
          </p>
        ) : (
          <p className="text-sm text-kite-faint">
            No unsaved changes.
          </p>
        )}

      </div>

      <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end">

        <button
          type="button"
          disabled={
            !hasChanges ||
            isSaving
          }
          onClick={
            onReset
          }
          className="w-full rounded-xl border border-kite-line bg-white px-4 py-2.5 text-sm font-medium text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={
            !hasChanges ||
            isSaving
          }
          className="w-full rounded-xl bg-kite-blue-deep px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {isSaving
            ? "Saving..."
            : "Save Changes"}
        </button>

      </div>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| NOTIFICATION SETTING
|--------------------------------------------------------------------------
*/

function NotificationSetting({
  title,
  description,
  enabled,
  disabled,
  saving,
  onChange,
}: {
  title: string;

  description:
    string;

  enabled: boolean;

  disabled:
    boolean;

  saving:
    boolean;

  onChange: (
    enabled: boolean
  ) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-5">

      <div className="min-w-0 max-w-xl">

        <div className="flex items-center gap-2">

          <p className="text-sm font-medium text-kite-ink">
            {
              title
            }
          </p>

          {saving && (
            <span className="text-[10px] text-kite-faint">
              Saving...
            </span>
          )}

        </div>

        <p className="mt-1 text-xs leading-5 text-kite-muted">
          {
            description
          }
        </p>

      </div>

      <button
        type="button"
        role="switch"
        aria-checked={
          enabled
        }
        disabled={
          disabled
        }
        onClick={() =>
          onChange(
            !enabled
          )
        }
        className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${
          enabled
            ? "bg-kite-blue-deep"
            : "bg-kite-line"
        }`}
      >

        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
            enabled
              ? "left-6"
              : "left-1"
          }`}
        />

      </button>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| INFO CARD
|--------------------------------------------------------------------------
*/

function InfoCard({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div className="rounded-xl border border-kite-line bg-kite-soft p-4">

      <p className="text-xs font-medium uppercase tracking-wide text-kite-faint">
        {
          label
        }
      </p>

      <p className="mt-2 font-medium text-kite-ink">
        {
          value
        }
      </p>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| COMING SOON
|--------------------------------------------------------------------------
*/

function ComingSoonCard({
  title,
  description,
  action,
}: {
  title: string;

  description:
    string;

  action: string;
}) {
  return (
    <section className="rounded-2xl border border-kite-line bg-white p-4 sm:p-6">

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

        <div>

          <div className="flex items-center gap-2">

            <h3 className="font-semibold text-kite-ink">
              {
                title
              }
            </h3>

            <span className="rounded-md bg-kite-blue-wash px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-kite-blue-deep">
              Soon
            </span>

          </div>

          <p className="mt-1 text-sm leading-6 text-kite-muted">
            {
              description
            }
          </p>

        </div>

        <button
          type="button"
          disabled
          className="w-full shrink-0 cursor-not-allowed rounded-xl border border-kite-line bg-kite-soft px-4 py-2.5 text-sm font-medium text-kite-faint sm:w-auto"
        >
          {
            action
          }
        </button>

      </div>

    </section>
  );
}

/*
|--------------------------------------------------------------------------
| ROLE PERMISSIONS
|--------------------------------------------------------------------------
*/

function RolePermissions({
  role,
}: {
  role:
    | "Owner"
    | "Manager"
    | "Member";
}) {
  const permissions =
    role ===
    "Owner"
      ? [
          "Manage workspace",
          "Manage projects",
          "Create and assign tasks",
          "Review submitted work",
          "Manage project members",
          "Delete projects",
        ]
      : role ===
          "Manager"
        ? [
            "Manage projects",
            "Create and assign tasks",
            "Review submitted work",
            "Manage project members",
            "Update project settings",
          ]
        : [
            "View assigned projects",
            "View project tasks",
            "Update assigned tasks",
            "Submit work for review",
            "Comment and attach work",
          ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">

      {permissions.map(
        (
          permission
        ) => (
          <div
            key={
              permission
            }
            className="flex items-center gap-3 rounded-xl border border-kite-line bg-kite-soft px-4 py-3"
          >

            <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-600">
              ✓
            </div>

            <span className="text-sm text-kite-muted">
              {
                permission
              }
            </span>

          </div>
        )
      )}

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| LOADING
|--------------------------------------------------------------------------
*/

function SettingsSkeleton() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-[1300px] animate-pulse">

      <div className="mb-5 sm:mb-7">

        <div className="h-9 w-40 rounded-xl bg-kite-line" />

        <div className="mt-3 h-4 w-96 max-w-full rounded bg-kite-line" />

      </div>

      <div className="grid min-w-0 gap-5 sm:gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">

        <div className="h-16 rounded-2xl bg-white lg:h-72" />

        <div className="h-[520px] rounded-2xl bg-white" />

      </div>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function getSectionFromHash(
  hash: string
): SettingsSection {
  const value =
    hash
      .replace(
        /^#/,
        ""
      )
      .trim();

  if (
    value ===
      "notifications" ||
    value ===
      "account" ||
    value ===
      "workspace" ||
    value ===
      "appearance"
  ) {
    return value;
  }

  return "profile";
}

function getInitials(
  name: string
) {
  const parts =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length ===
    0
  ) {
    return "U";
  }

  if (
    parts.length ===
    1
  ) {
    return (
      parts[0]
        ?.slice(
          0,
          2
        )
        .toUpperCase() ??
      "U"
    );
  }

  return `${parts[0]?.[0] ?? ""}${
    parts[
      parts.length -
        1
    ]?.[0] ?? ""
  }`.toUpperCase();
}

function formatDate(
  value: string
) {
  return new Date(
    value
  ).toLocaleDateString(
    "en-US",
    {
      month:
        "long",

      day:
        "numeric",

      year:
        "numeric",
    }
  );
}

export default SettingsPage;