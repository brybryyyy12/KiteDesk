import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  useNavigate,
} from "react-router";

import {
  useWorkspace,
} from "../../context/WorkspaceContext";

import {
  useAuth,
} from "../../context/AuthContext";

import NotificationBell from "../notification/NotificationBell";

type TopbarProps = {
  isMenuOpen: boolean;

  onMenuClick: () => void;
};

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| TOPBAR
|--------------------------------------------------------------------------
*/

function Topbar({
  isMenuOpen,
  onMenuClick,
}: TopbarProps) {
  const navigate =
    useNavigate();

  const {
    workspace,
  } =
    useWorkspace();

  const {
    user,
    logout,
  } =
    useAuth();

  /*
  |--------------------------------------------------------------------------
  | ACCOUNT MENU
  |--------------------------------------------------------------------------
  */

  const [
    accountMenuOpen,
    setAccountMenuOpen,
  ] =
    useState(false);

  const [
    isLoggingOut,
    setIsLoggingOut,
  ] =
    useState(false);

  const [
    menuError,
    setMenuError,
  ] =
    useState("");

  const accountMenuRef =
    useRef<HTMLDivElement | null>(
      null
    );

  /*
  |--------------------------------------------------------------------------
  | CURRENT USER
  |--------------------------------------------------------------------------
  */

  const userName =
    user?.name ??
    "KiteDesk User";

  const userEmail =
    user?.email ??
    "";

  const userJobTitle =
    user?.jobTitle ??
    "Workspace member";

  const initials =
    getInitials(
      userName
    );

  const workspaceInitial =
    workspace?.name
      ?.slice(
        0,
        1
      )
      .toUpperCase() ??
    "W";

  /*
  |--------------------------------------------------------------------------
  | CLOSE ON OUTSIDE CLICK / ESCAPE
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      if (
        !accountMenuOpen
      ) {
        return;
      }

      const handlePointerDown =
        (
          event:
            MouseEvent
        ) => {
          const target =
            event.target;

          if (
            !(target instanceof Node)
          ) {
            return;
          }

          if (
            !accountMenuRef.current
              ?.contains(
                target
              )
          ) {
            setAccountMenuOpen(
              false
            );

            setMenuError(
              ""
            );
          }
        };

      const handleKeyDown =
        (
          event:
            KeyboardEvent
        ) => {
          if (
            event.key ===
            "Escape"
          ) {
            setAccountMenuOpen(
              false
            );

            setMenuError(
              ""
            );
          }
        };

      document.addEventListener(
        "mousedown",
        handlePointerDown
      );

      document.addEventListener(
        "keydown",
        handleKeyDown
      );

      return () => {
        document.removeEventListener(
          "mousedown",
          handlePointerDown
        );

        document.removeEventListener(
          "keydown",
          handleKeyDown
        );
      };
    },
    [
      accountMenuOpen,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | NAVIGATION
  |--------------------------------------------------------------------------
  */

  const navigateFromMenu =
    (
      path: string
    ) => {
      setAccountMenuOpen(
        false
      );

      setMenuError(
        ""
      );

      navigate(
        path
      );
    };

  /*
  |--------------------------------------------------------------------------
  | LOGOUT
  |--------------------------------------------------------------------------
  */

  const performLogout =
    async (
      switchAccount =
        false
    ) => {
      if (
        isLoggingOut
      ) {
        return;
      }

      setIsLoggingOut(
        true
      );

      setMenuError(
        ""
      );

      try {
        await logout();

        setAccountMenuOpen(
          false
        );

        /*
         * We don't have true
         * multi-account sessions yet.
         *
         * "Switch Account" therefore
         * signs out and takes the user
         * back to login.
         */
        navigate(
          switchAccount
            ? "/login?switch=1"
            : "/login",
          {
            replace:
              true,
          }
        );
      } catch (
        error
      ) {
        console.error(
          "Logout failed:",
          error
        );

        setMenuError(
          error instanceof Error
            ? error.message
            : "Unable to log out. Please try again."
        );
      } finally {
        setIsLoggingOut(
          false
        );
      }
    };

  return (
    <header className="sticky top-0 z-30 h-[73px] border-b border-kite-line bg-white/95 backdrop-blur">

      <div className="flex h-full min-w-0 items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">

        {/* MOBILE MENU */}
        <button
          type="button"
          onClick={
            onMenuClick
          }
          aria-label="Open navigation menu"
          aria-controls="app-sidebar"
          aria-expanded={
            isMenuOpen
          }
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-kite-line bg-white text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink lg:hidden"
        >

          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>

        </button>

        {/* COMPACT MOBILE WORKSPACE */}
        <button
          type="button"
          onClick={() =>
            navigate(
              "/workspace"
            )
          }
          aria-label={
            workspace?.name
              ? `Open ${workspace.name} workspace`
              : "Open workspace"
          }
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-kite-blue-wash text-xs font-semibold text-kite-blue-deep transition hover:brightness-95 sm:hidden"
        >
          {
            workspaceInitial
          }
        </button>

        {/* WORKSPACE */}
        <button
          type="button"
          onClick={() =>
            navigate(
              "/workspace"
            )
          }
          className="hidden min-w-0 max-w-[240px] items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-kite-soft sm:flex"
        >

          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-kite-blue-wash text-xs font-semibold text-kite-blue-deep">
            {
              workspaceInitial
            }
          </div>

          <div className="min-w-0">

            <p className="max-w-[150px] truncate text-sm font-medium text-kite-ink lg:max-w-[180px]">
              {workspace?.name ??
                "Workspace"}
            </p>

            <p className="mt-0.5 text-[11px] text-kite-muted">
              {workspace?.role ??
                "Member"}
            </p>

          </div>

          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="hidden h-4 w-4 shrink-0 text-kite-faint md:block"
            aria-hidden="true"
          >
            <path d="m9 10 3 3 3-3" />
          </svg>

        </button>

        {/* SEARCH */}
        <div className="mx-auto hidden min-w-0 w-full max-w-[420px] xl:block">

          <div className="relative">

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-kite-faint"
              aria-hidden="true"
            >

              <circle
                cx="11"
                cy="11"
                r="7"
              />

              <path d="m20 20-4-4" />

            </svg>

            <input
              type="search"
              aria-label="Search KiteDesk"
              placeholder="Search KiteDesk..."
              className="w-full rounded-xl border border-kite-line bg-kite-soft py-2.5 pl-11 pr-4 text-sm text-kite-ink outline-none transition placeholder:text-kite-faint focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash"
            />

          </div>

        </div>

        {/* FLEX SPACER WHEN SEARCH IS HIDDEN */}
        <div className="min-w-0 flex-1 xl:hidden" />

        {/* RIGHT SIDE */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">

          <NotificationBell />

          {/* ACCOUNT */}
          <div
            ref={
              accountMenuRef
            }
            className="relative"
          >

            {/* PROFILE BUTTON */}
            <button
              type="button"
              onClick={() => {
                setAccountMenuOpen(
                  (
                    current
                  ) =>
                    !current
                );

                setMenuError(
                  ""
                );
              }}
              aria-haspopup="menu"
              aria-expanded={
                accountMenuOpen
              }
              aria-label="Open account menu"
              className={`flex items-center gap-2 rounded-xl p-1.5 transition sm:pr-2 ${
                accountMenuOpen
                  ? "bg-kite-soft"
                  : "hover:bg-kite-soft"
              }`}
            >

              {/* AVATAR */}
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-kite-blue-wash text-xs font-semibold text-kite-blue-deep">
                {
                  initials
                }
              </div>

              {/* USER */}
              <div className="hidden max-w-[130px] text-left 2xl:block">

                <p className="truncate text-xs font-medium text-kite-ink">
                  {
                    userName
                  }
                </p>

                <p className="mt-0.5 truncate text-[10px] text-kite-muted">
                  {
                    userJobTitle
                  }
                </p>

              </div>

              {/* CHEVRON */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className={`hidden h-4 w-4 text-kite-faint transition-transform sm:block ${
                  accountMenuOpen
                    ? "rotate-180"
                    : ""
                }`}
                aria-hidden="true"
              >
                <path d="m9 10 3 3 3-3" />
              </svg>

            </button>

            {/* DROPDOWN */}
            {accountMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(290px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-kite-line bg-white shadow-[0_24px_70px_-28px_rgba(46,51,56,0.45)]"
              >

                {/* USER HEADER */}
                <div className="px-4 py-4">

                  <div className="flex items-center gap-3">

                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-kite-blue-wash text-sm font-semibold text-kite-blue-deep">
                      {
                        initials
                      }
                    </div>

                    <div className="min-w-0">

                      <p className="truncate text-sm font-semibold text-kite-ink">
                        {
                          userName
                        }
                      </p>

                      {userEmail && (
                        <p className="mt-0.5 truncate text-xs text-kite-muted">
                          {
                            userEmail
                          }
                        </p>
                      )}

                    </div>

                  </div>

                </div>

                <div className="h-px bg-kite-line" />

                {/* PROFILE / SETTINGS */}
                <div className="p-2">

                  <AccountMenuButton
                    label="Profile"
                    description="View and edit your profile"
                    onClick={() =>
                      navigateFromMenu(
                        "/settings#profile"
                      )
                    }
                    icon={
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
                          cy="8"
                          r="3.5"
                        />

                        <path d="M5 21c.7-4.2 3-6.5 7-6.5s6.3 2.3 7 6.5" />
                      </svg>
                    }
                  />

                  <AccountMenuButton
                    label="Account Settings"
                    description="Profile and preferences"
                    onClick={() =>
                      navigateFromMenu(
                        "/settings#account"
                      )
                    }
                    icon={
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
                          r="3"
                        />

                        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
                      </svg>
                    }
                  />

                  {/* THEME */}
                  <button
                    type="button"
                    disabled
                    className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-left opacity-55"
                  >

                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-kite-soft text-kite-muted">

                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        className="h-4.5 w-4.5"
                        aria-hidden="true"
                      >
                        <path d="M20.5 14.5A8 8 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z" />
                      </svg>

                    </div>

                    <div className="min-w-0 flex-1">

                      <p className="text-sm font-medium text-kite-ink">
                        Theme
                      </p>

                      <p className="mt-0.5 text-[11px] text-kite-muted">
                        Light and dark mode
                      </p>

                    </div>

                    <span className="rounded-md bg-kite-blue-wash px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-kite-blue-deep">
                      Soon
                    </span>

                  </button>

                </div>

                <div className="h-px bg-kite-line" />

                {/* ACCOUNT ACTIONS */}
                <div className="p-2">

                  <AccountMenuButton
                    label={
                      isLoggingOut
                        ? "Switching..."
                        : "Switch Account"
                    }
                    description="Sign in with another account"
                    disabled={
                      isLoggingOut
                    }
                    onClick={() =>
                      void performLogout(
                        true
                      )
                    }
                    icon={
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        className="h-4.5 w-4.5"
                        aria-hidden="true"
                      >
                        <path d="M7 7h11l-3-3" />

                        <path d="m18 7-3 3" />

                        <path d="M17 17H6l3 3" />

                        <path d="m6 17 3-3" />
                      </svg>
                    }
                  />

                  {/* LOGOUT */}
                  <button
                    type="button"
                    disabled={
                      isLoggingOut
                    }
                    onClick={() =>
                      void performLogout(
                        false
                      )
                    }
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >

                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-50 text-red-500">

                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        className="h-4.5 w-4.5"
                        aria-hidden="true"
                      >
                        <path d="M10 5H5v14h5" />

                        <path d="M14 8l4 4-4 4" />

                        <path d="M8 12h10" />
                      </svg>

                    </div>

                    <div className="min-w-0">

                      <p className="text-sm font-medium text-red-600">
                        {isLoggingOut
                          ? "Logging out..."
                          : "Log Out"}
                      </p>

                      <p className="mt-0.5 text-[11px] text-red-400">
                        End your current session
                      </p>

                    </div>

                  </button>

                </div>

                {/* ERROR */}
                {menuError && (
                  <div className="border-t border-red-100 bg-red-50 px-4 py-3">

                    <p className="text-xs leading-5 text-red-600">
                      {
                        menuError
                      }
                    </p>

                  </div>
                )}

              </div>
            )}

          </div>

        </div>

      </div>

    </header>
  );
}

/*
|--------------------------------------------------------------------------
| MENU BUTTON
|--------------------------------------------------------------------------
*/

function AccountMenuButton({
  label,
  description,
  icon,
  onClick,
  disabled = false,
}: {
  label: string;

  description:
    string;

  icon:
    ReactNode;

  onClick:
    () => void;

  disabled?:
    boolean;
}) {
  return (
    <button
      type="button"
      disabled={
        disabled
      }
      onClick={
        onClick
      }
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-kite-soft disabled:cursor-not-allowed disabled:opacity-50"
    >

      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-kite-soft text-kite-muted">
        {
          icon
        }
      </div>

      <div className="min-w-0">

        <p className="text-sm font-medium text-kite-ink">
          {
            label
          }
        </p>

        <p className="mt-0.5 text-[11px] text-kite-muted">
          {
            description
          }
        </p>

      </div>

    </button>
  );
}

export default Topbar;
