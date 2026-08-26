import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router";

import {
  useNotifications,
  type KiteNotification,
  type NotificationType,
} from "../../context/NotificationContext";

/*
|--------------------------------------------------------------------------
| NOTIFICATION BELL
|--------------------------------------------------------------------------
*/

function NotificationBell() {
  const navigate =
    useNavigate();

  const {
    notifications,
    unreadCount,
    isLoaded,
    isLoading,
    error,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
  } =
    useNotifications();

  const [
    open,
    setOpen,
  ] =
    useState(false);

  const [
    actionLoading,
    setActionLoading,
  ] =
    useState(false);

  const wrapperRef =
    useRef<HTMLDivElement | null>(
      null
    );

  /*
  |--------------------------------------------------------------------------
  | RECENT
  |--------------------------------------------------------------------------
  */

  const recentNotifications =
    useMemo(
      () =>
        notifications.slice(
          0,
          6
        ),
      [
        notifications,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | CLOSE OUTSIDE / ESCAPE
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      if (
        !open
      ) {
        return;
      }

      const handleClickOutside =
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
            !wrapperRef.current
              ?.contains(
                target
              )
          ) {
            setOpen(
              false
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
            setOpen(
              false
            );
          }
        };

      document.addEventListener(
        "mousedown",
        handleClickOutside
      );

      document.addEventListener(
        "keydown",
        handleKeyDown
      );

      return () => {
        document.removeEventListener(
          "mousedown",
          handleClickOutside
        );

        document.removeEventListener(
          "keydown",
          handleKeyDown
        );
      };
    },
    [
      open,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | TOGGLE
  |--------------------------------------------------------------------------
  */

  const toggleBell =
    () => {
      const nextOpen =
        !open;

      setOpen(
        nextOpen
      );

      if (
        nextOpen
      ) {
        /*
         * Always refresh when opened so
         * newly-created backend notifications
         * appear immediately.
         */
        void refreshNotifications();
      }
    };

  /*
  |--------------------------------------------------------------------------
  | OPEN NOTIFICATION
  |--------------------------------------------------------------------------
  */

  const openNotification =
    async (
      notification:
        KiteNotification
    ) => {
      if (
        !notification.isRead
      ) {
        try {
          await markAsRead(
            notification.id
          );
        } catch {
          /*
           * Navigation should still be
           * possible if marking read fails.
           */
        }
      }

      setOpen(
        false
      );

      if (
        notification.projectId &&
        notification.taskId
      ) {
        navigate(
          `/projects/${notification.projectId}/tasks/${notification.taskId}`
        );

        return;
      }

      if (
        notification.projectId
      ) {
        navigate(
          `/projects/${notification.projectId}`
        );

        return;
      }

      navigate(
        "/notifications"
      );
    };

  /*
  |--------------------------------------------------------------------------
  | MARK ALL
  |--------------------------------------------------------------------------
  */

  const handleMarkAllRead =
    async () => {
      if (
        actionLoading
      ) {
        return;
      }

      setActionLoading(
        true
      );

      try {
        await markAllAsRead();
      } finally {
        setActionLoading(
          false
        );
      }
    };

  return (
    <div
      ref={
        wrapperRef
      }
      className="relative"
    >

      {/* BELL */}
      <button
        type="button"
        onClick={
          toggleBell
        }
        aria-label={
          unreadCount >
          0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-haspopup="menu"
        aria-expanded={
          open
        }
        className={`relative grid h-10 w-10 place-items-center rounded-xl border border-kite-line bg-white text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink ${
          open
            ? "bg-kite-soft text-kite-ink"
            : ""
        }`}
      >

        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          className="h-5 w-5"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />

          <path d="M10 21h4" />
        </svg>

        {unreadCount >
          0 && (
          <span className="absolute -right-1 -top-1 grid h-[19px] min-w-[19px] place-items-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-semibold text-white">

            {unreadCount >
            9
              ? "9+"
              : unreadCount}

          </span>
        )}

      </button>

      {/* DROPDOWN */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+12px)] z-[120] w-[370px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-kite-line bg-white shadow-[0_24px_70px_-30px_rgba(46,51,56,0.5)]"
        >

          {/* HEADER */}
          <div className="flex items-center justify-between gap-4 border-b border-kite-line px-5 py-4">

            <div>

              <h3 className="font-semibold text-kite-ink">
                Notifications
              </h3>

              <p className="mt-0.5 text-xs text-kite-muted">
                {unreadCount >
                0
                  ? `${unreadCount} unread`
                  : "You're all caught up"}
              </p>

            </div>

            {unreadCount >
              0 && (
              <button
                type="button"
                disabled={
                  actionLoading
                }
                onClick={() =>
                  void handleMarkAllRead()
                }
                className="shrink-0 text-xs font-medium text-kite-blue-deep transition hover:text-kite-ink disabled:opacity-50"
              >
                {actionLoading
                  ? "Updating..."
                  : "Mark all read"}
              </button>
            )}

          </div>

          {/* LOADING */}
          {(!isLoaded ||
            (isLoading &&
              notifications.length ===
                0)) && (
            <div className="space-y-4 px-4 py-5">

              {[1, 2, 3].map(
                (
                  item
                ) => (
                  <div
                    key={
                      item
                    }
                    className="flex animate-pulse gap-3"
                  >

                    <div className="h-10 w-10 shrink-0 rounded-xl bg-kite-soft" />

                    <div className="flex-1 space-y-2">

                      <div className="h-3 w-2/3 rounded bg-kite-soft" />

                      <div className="h-3 w-full rounded bg-kite-soft" />

                    </div>

                  </div>
                )
              )}

            </div>
          )}

          {/* ERROR */}
          {isLoaded &&
            error &&
            recentNotifications.length ===
              0 && (
            <div className="px-6 py-8 text-center">

              <p className="text-sm font-medium text-red-600">
                Couldn&apos;t load notifications
              </p>

              <p className="mt-1 text-xs text-kite-muted">
                {
                  error
                }
              </p>

              <button
                type="button"
                onClick={() =>
                  void refreshNotifications()
                }
                className="mt-4 text-xs font-medium text-kite-blue-deep"
              >
                Try again
              </button>

            </div>
          )}

          {/* EMPTY */}
          {isLoaded &&
            !isLoading &&
            !error &&
            recentNotifications.length ===
              0 && (
            <div className="px-6 py-10 text-center">

              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-kite-soft text-kite-muted">

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-6 w-6"
                >
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />

                  <path d="M10 21h4" />
                </svg>

              </div>

              <p className="mt-4 text-sm font-medium text-kite-ink">
                You&apos;re all caught up
              </p>

              <p className="mt-1 text-xs text-kite-muted">
                New notifications will appear here.
              </p>

            </div>
          )}

          {/* NOTIFICATIONS */}
          {recentNotifications.length >
            0 && (
            <div className="max-h-[430px] overflow-y-auto">

              {recentNotifications.map(
                (
                  notification
                ) => (
                  <button
                    key={
                      notification.id
                    }
                    type="button"
                    onClick={() =>
                      void openNotification(
                        notification
                      )
                    }
                    className={`flex w-full gap-3 border-b border-kite-line px-4 py-4 text-left transition last:border-b-0 hover:bg-kite-soft ${
                      !notification.isRead
                        ? "bg-kite-blue-wash/35"
                        : "bg-white"
                    }`}
                  >

                    <NotificationIcon
                      notification={
                        notification
                      }
                    />

                    <div className="min-w-0 flex-1">

                      <div className="flex items-start justify-between gap-2">

                        <p className="text-sm font-medium leading-5 text-kite-ink">
                          {
                            notification.title
                          }
                        </p>

                        <span className="shrink-0 text-[10px] text-kite-faint">
                          {formatRelativeTime(
                            notification.createdAt
                          )}
                        </span>

                      </div>

                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-kite-muted">
                        {
                          notification.message
                        }
                      </p>

                      {notification.project && (
                        <p className="mt-1.5 truncate text-[10px] text-kite-faint">
                          {
                            notification.project.name
                          }
                        </p>
                      )}

                    </div>

                    {!notification.isRead && (
                      <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-kite-blue-deep" />
                    )}

                  </button>
                )
              )}

            </div>
          )}

          {/* FOOTER */}
          <div className="border-t border-kite-line bg-kite-soft/60 p-3">

            <button
              type="button"
              onClick={() => {
                setOpen(
                  false
                );

                navigate(
                  "/notifications"
                );
              }}
              className="w-full rounded-xl px-4 py-2.5 text-center text-sm font-medium text-kite-blue-deep transition hover:bg-white hover:text-kite-ink"
            >
              View all notifications
            </button>

          </div>

        </div>
      )}

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| ICON
|--------------------------------------------------------------------------
*/

function NotificationIcon({
  notification,
}: {
  notification:
    KiteNotification;
}) {
  const initials =
    notification.actor
      ? getInitials(
          notification.actor.name
        )
      : null;

  if (
    initials
  ) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-kite-soft text-xs font-semibold text-kite-ink">
        {
          initials
        }
      </div>
    );
  }

  const style =
    getNotificationStyle(
      notification.type
    );

  return (
    <div
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${style}`}
    >
      <NotificationTypeIcon
        type={
          notification.type
        }
      />
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| TYPE ICON
|--------------------------------------------------------------------------
*/

function NotificationTypeIcon({
  type,
}: {
  type:
    NotificationType;
}) {
  if (
    type ===
    "COMMENT"
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-5 w-5"
      >
        <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      </svg>
    );
  }

  if (
    type ===
    "TASK_APPROVED"
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-5 w-5"
      >
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }

  if (
    type ===
      "DUE_SOON" ||
    type ===
      "OVERDUE"
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-5 w-5"
      >
        <rect
          x="4"
          y="5"
          width="16"
          height="15"
          rx="2"
        />

        <path d="M8 3v4M16 3v4M4 10h16" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <path d="M8 6h12M8 12h12M8 18h12" />

      <circle
        cx="4"
        cy="6"
        r="1"
        fill="currentColor"
      />

      <circle
        cx="4"
        cy="12"
        r="1"
        fill="currentColor"
      />

      <circle
        cx="4"
        cy="18"
        r="1"
        fill="currentColor"
      />
    </svg>
  );
}

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function getNotificationStyle(
  type: NotificationType
) {
  if (
    type ===
    "OVERDUE"
  ) {
    return "bg-red-50 text-red-600";
  }

  if (
    type ===
    "DUE_SOON"
  ) {
    return "bg-amber-50 text-amber-600";
  }

  if (
    type ===
    "TASK_APPROVED"
  ) {
    return "bg-emerald-50 text-emerald-600";
  }

  if (
    type ===
      "COMMENT" ||
    type ===
      "CHANGES_REQUESTED"
  ) {
    return "bg-violet-50 text-violet-600";
  }

  return "bg-kite-blue-wash text-kite-blue-deep";
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

function formatRelativeTime(
  value: string
) {
  const date =
    new Date(
      value
    );

  const difference =
    Date.now() -
    date.getTime();

  if (
    difference <
    0
  ) {
    return "Now";
  }

  const minutes =
    Math.floor(
      difference /
        60000
    );

  const hours =
    Math.floor(
      difference /
        3600000
    );

  const days =
    Math.floor(
      difference /
        86400000
    );

  if (
    minutes <
    1
  ) {
    return "Now";
  }

  if (
    minutes <
    60
  ) {
    return `${minutes}m`;
  }

  if (
    hours <
    24
  ) {
    return `${hours}h`;
  }

  if (
    days <
    7
  ) {
    return `${days}d`;
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month:
        "short",

      day:
        "numeric",
    }
  );
}

export default NotificationBell;