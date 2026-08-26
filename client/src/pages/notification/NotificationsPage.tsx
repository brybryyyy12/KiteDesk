import {
  useEffect,
  useMemo,
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

type Filter =
  | "All"
  | "Unread"
  | "Read";

const filters: Filter[] = [
  "All",
  "Unread",
  "Read",
];

function NotificationsPage() {
  const navigate =
    useNavigate();

  const {
    notifications,
    unreadCount,
    totalCount,
    isLoaded,
    isLoading,
    error,
    refreshNotifications,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    removeNotification,
    clearNotifications,
  } =
    useNotifications();

  const [
    filter,
    setFilter,
  ] =
    useState<Filter>(
      "All"
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    actionId,
    setActionId,
  ] =
    useState<
      string | null
    >(null);

  const [
    globalAction,
    setGlobalAction,
  ] =
    useState<
      | "read-all"
      | "clear"
      | null
    >(null);

  const [
    mobileMenuId,
    setMobileMenuId,
  ] =
    useState<
      string | null
    >(null);

  /*
  |--------------------------------------------------------------------------
  | REFRESH
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      void refreshNotifications();
    },
    [
      refreshNotifications,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | MOBILE MENU
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      if (
        !mobileMenuId
      ) {
        return;
      }

      const handlePointerDown = (
        event: MouseEvent
      ) => {
        const target =
          event.target;

        if (
          target instanceof Element &&
          target.closest(
            "[data-notification-menu]"
          )
        ) {
          return;
        }

        setMobileMenuId(
          null
        );
      };

      const handleKeyDown = (
        event: KeyboardEvent
      ) => {
        if (
          event.key ===
          "Escape"
        ) {
          setMobileMenuId(
            null
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
      mobileMenuId,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | FILTER
  |--------------------------------------------------------------------------
  */

  const filteredNotifications =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        return notifications.filter(
          (
            notification
          ) => {
            const matchesFilter =
              filter ===
                "All" ||
              (
                filter ===
                  "Unread" &&
                !notification.isRead
              ) ||
              (
                filter ===
                  "Read" &&
                notification.isRead
              );

            const matchesSearch =
              !query ||
              notification.title
                .toLowerCase()
                .includes(
                  query
                ) ||
              notification.message
                .toLowerCase()
                .includes(
                  query
                ) ||
              Boolean(
                notification.actor
                  ?.name
                  .toLowerCase()
                  .includes(
                    query
                  )
              ) ||
              Boolean(
                notification.project
                  ?.name
                  .toLowerCase()
                  .includes(
                    query
                  )
              ) ||
              Boolean(
                notification.task
                  ?.title
                  .toLowerCase()
                  .includes(
                    query
                  )
              );

            return (
              matchesFilter &&
              matchesSearch
            );
          }
        );
      },
      [
        notifications,
        filter,
        search,
      ]
    );

  const filtersActive =
    Boolean(
      search.trim()
    ) ||
    filter !== "All";

  const clearFilters = () => {
    setSearch("");
    setFilter("All");
  };

  /*
  |--------------------------------------------------------------------------
  | OPEN
  |--------------------------------------------------------------------------
  */

  const openNotification =
    async (
      notification:
        KiteNotification
    ) => {
      setMobileMenuId(
        null
      );

      if (
        !notification.isRead
      ) {
        try {
          await markAsRead(
            notification.id
          );
        } catch {
          /*
           * Still allow navigation
           * even if marking as read fails.
           */
        }
      }

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
      }
    };

  /*
  |--------------------------------------------------------------------------
  | TOGGLE READ
  |--------------------------------------------------------------------------
  */

  const toggleRead =
    async (
      notification:
        KiteNotification
    ) => {
      if (
        actionId ||
        globalAction
      ) {
        return;
      }

      setMobileMenuId(
        null
      );

      setActionId(
        notification.id
      );

      try {
        if (
          notification.isRead
        ) {
          await markAsUnread(
            notification.id
          );
        } else {
          await markAsRead(
            notification.id
          );
        }
      } catch {
        /*
         * Context already exposes
         * the API error.
         */
      } finally {
        setActionId(
          null
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | REMOVE
  |--------------------------------------------------------------------------
  */

  const handleRemove =
    async (
      notificationId:
        string
    ) => {
      if (
        actionId ||
        globalAction
      ) {
        return;
      }

      setMobileMenuId(
        null
      );

      setActionId(
        notificationId
      );

      try {
        await removeNotification(
          notificationId
        );
      } catch {
        /*
         * Context already exposes
         * the API error.
         */
      } finally {
        setActionId(
          null
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | MARK ALL
  |--------------------------------------------------------------------------
  */

  const handleMarkAllRead =
    async () => {
      if (
        globalAction ||
        actionId
      ) {
        return;
      }

      setMobileMenuId(
        null
      );

      setGlobalAction(
        "read-all"
      );

      try {
        await markAllAsRead();
      } catch {
        /*
         * Context already exposes
         * the API error.
         */
      } finally {
        setGlobalAction(
          null
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | CLEAR ALL
  |--------------------------------------------------------------------------
  */

  const handleClearAll =
    async () => {
      if (
        totalCount === 0 ||
        globalAction ||
        actionId
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "Clear all notifications? This cannot be undone."
        );

      if (
        !confirmed
      ) {
        return;
      }

      setMobileMenuId(
        null
      );

      setGlobalAction(
        "clear"
      );

      try {
        await clearNotifications();
      } catch {
        /*
         * Context already exposes
         * the API error.
         */
      } finally {
        setGlobalAction(
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
    (
      !isLoaded ||
      isLoading
    ) &&
    notifications.length ===
      0 &&
    !error
  ) {
    return (
      <NotificationsSkeleton />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | FATAL ERROR
  |--------------------------------------------------------------------------
  */

  if (
    isLoaded &&
    error &&
    notifications.length ===
      0
  ) {
    return (
      <div className="mx-auto min-w-0 max-w-[1200px]">

        <PageHeading />

        <section className="rounded-2xl border border-kite-line bg-white px-5 py-12 text-center sm:px-6 sm:py-16">

          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-500 sm:h-16 sm:w-16">

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7 sm:h-8 sm:w-8"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
              />

              <path d="M12 8v5M12 17h.01" />
            </svg>

          </div>

          <h2 className="mt-5 text-lg font-semibold tracking-tight text-kite-ink sm:text-xl">
            Couldn&apos;t load notifications
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-kite-muted">
            {error}
          </p>

          <button
            type="button"
            disabled={
              isLoading
            }
            onClick={() =>
              void refreshNotifications()
            }
            className="mt-6 w-full rounded-xl bg-kite-blue-deep px-5 py-3 text-sm font-medium text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isLoading
              ? "Trying again..."
              : "Try Again"}
          </button>

        </section>

      </div>
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-[1200px]">

      {/* HEADER */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-7 sm:flex-row sm:items-end">

        <PageHeading
          compact
        />

        {(
          unreadCount > 0 ||
          totalCount > 0
        ) && (
          <div className="flex w-full gap-2 sm:w-auto sm:flex-wrap">

            {unreadCount >
              0 && (
              <button
                type="button"
                disabled={
                  Boolean(
                    globalAction ||
                      actionId
                  )
                }
                onClick={() =>
                  void handleMarkAllRead()
                }
                className="flex-1 rounded-xl border border-kite-line bg-white px-3 py-2.5 text-xs font-medium text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink disabled:opacity-50 sm:flex-none sm:px-4 sm:text-sm"
              >
                {globalAction ===
                "read-all"
                  ? "Updating..."
                  : "Mark all as read"}
              </button>
            )}

            {totalCount >
              0 && (
              <button
                type="button"
                disabled={
                  Boolean(
                    globalAction ||
                      actionId
                  )
                }
                onClick={() =>
                  void handleClearAll()
                }
                className="flex-1 rounded-xl border border-kite-line bg-white px-3 py-2.5 text-xs font-medium text-kite-muted transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50 sm:flex-none sm:px-4 sm:text-sm"
              >
                {globalAction ===
                "clear"
                  ? "Clearing..."
                  : "Clear all"}
              </button>
            )}

          </div>
        )}

      </div>

      {/* PARTIAL ERROR */}
      {error &&
        notifications.length >
          0 && (
        <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 sm:items-center">

          <div className="min-w-0">

            <p className="text-sm font-medium text-amber-800">
              Some notification data may be outdated.
            </p>

            <p className="mt-1 break-words text-xs leading-5 text-amber-700">
              {error}
            </p>

          </div>

          <button
            type="button"
            disabled={
              isLoading
            }
            onClick={() =>
              void refreshNotifications()
            }
            className="shrink-0 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-medium text-amber-800 transition hover:bg-amber-50 disabled:opacity-50"
          >
            {isLoading
              ? "Retrying..."
              : "Try Again"}
          </button>

        </div>
      )}

      {/* SUMMARY */}
      <section className="mb-4 grid grid-cols-3 gap-2 sm:mb-5 sm:gap-4">

        <NotificationStat
          title="Total"
          value={
            totalCount
          }
        />

        <NotificationStat
          title="Unread"
          value={
            unreadCount
          }
        />

        <NotificationStat
          title="Read"
          value={Math.max(
            0,
            totalCount -
              unreadCount
          )}
        />

      </section>

      {/* FILTERS */}
      <section className="mb-5 grid gap-3 rounded-2xl border border-kite-line bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-4">

        {/* SEARCH */}
        <div className="relative min-w-0">

          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-kite-faint"
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
            value={
              search
            }
            onChange={(
              event
            ) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search notifications..."
            className="w-full rounded-xl border border-kite-line bg-kite-soft py-3 pl-12 pr-4 text-sm text-kite-ink outline-none transition placeholder:text-kite-faint focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash"
          />

        </div>

        {/* FILTER SWITCHER */}
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-kite-soft p-1 sm:min-w-[230px]">

          {filters.map(
            (
              item
            ) => {
              const active =
                filter ===
                item;

              return (
                <button
                  key={
                    item
                  }
                  type="button"
                  aria-pressed={
                    active
                  }
                  onClick={() =>
                    setFilter(
                      item
                    )
                  }
                  className={`rounded-lg px-2 py-2 text-xs font-medium transition sm:px-3 sm:text-sm ${
                    active
                      ? "bg-white text-kite-ink shadow-sm"
                      : "text-kite-muted hover:text-kite-ink"
                  }`}
                >
                  {item}
                </button>
              );
            }
          )}

        </div>

      </section>

      {/* REFRESHING */}
      {isLoading &&
        notifications.length >
          0 && (
        <div className="mb-3 text-right">
          <span className="text-xs text-kite-faint">
            Refreshing...
          </span>
        </div>
      )}

      {/* LIMIT NOTICE */}
      {totalCount >
        notifications.length && (
        <div className="mb-4 rounded-xl border border-kite-line bg-kite-soft px-4 py-3">

          <p className="text-xs leading-5 text-kite-muted">
            Showing the latest{" "}
            {notifications.length}{" "}
            of {totalCount}{" "}
            notifications.
          </p>

        </div>
      )}

      {/* EMPTY */}
      {totalCount ===
        0 &&
        !isLoading &&
        !error && (
        <NotificationEmptyState />
      )}

      {/* FILTER EMPTY */}
      {totalCount >
        0 &&
        filteredNotifications.length ===
          0 && (
        <section className="rounded-2xl border border-kite-line bg-white px-5 py-12 text-center sm:px-6 sm:py-14">

          <h2 className="font-semibold text-kite-ink">
            No matching notifications
          </h2>

          <p className="mt-2 text-sm text-kite-muted">
            Try changing your search or filter.
          </p>

          {filtersActive && (
            <button
              type="button"
              onClick={
                clearFilters
              }
              className="mt-4 text-sm font-medium text-kite-blue-deep transition hover:text-kite-ink"
            >
              Clear filters
            </button>
          )}

        </section>
      )}

      {/* NOTIFICATION LIST */}
      {filteredNotifications.length >
        0 && (
        <section className="rounded-2xl border border-kite-line bg-white">

          <div className="divide-y divide-kite-line">

            {filteredNotifications.map(
              (
                notification
              ) => {
                const busy =
                  actionId ===
                  notification.id;

                return (
                  <article
                    key={
                      notification.id
                    }
                    className={`relative flex min-w-0 gap-3 p-4 transition first:rounded-t-2xl last:rounded-b-2xl sm:gap-4 sm:p-5 ${
                      !notification.isRead
                        ? "bg-kite-blue-wash/30"
                        : "bg-white"
                    }`}
                  >

                    {/* ICON */}
                    <NotificationPageIcon
                      notification={
                        notification
                      }
                    />

                    {/* CONTENT */}
                    <button
                      type="button"
                      onClick={() =>
                        void openNotification(
                          notification
                        )
                      }
                      className="min-w-0 flex-1 text-left"
                    >

                      <div className="flex min-w-0 items-start gap-2">

                        <p className="min-w-0 break-words text-sm font-medium leading-5 text-kite-ink sm:text-base sm:leading-6">
                          {
                            notification.title
                          }
                        </p>

                        {!notification.isRead && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-kite-blue-deep" />
                        )}

                      </div>

                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-kite-muted sm:line-clamp-none sm:text-sm sm:leading-6">
                        {
                          notification.message
                        }
                      </p>

                      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-kite-faint sm:gap-x-3 sm:text-xs">

                        <span>
                          {formatDateTime(
                            notification.createdAt
                          )}
                        </span>

                        {notification.project && (
                          <span className="max-w-[130px] truncate sm:max-w-[220px]">
                            {
                              notification.project.name
                            }
                          </span>
                        )}

                        {notification.task && (
                          <span className="max-w-[150px] truncate sm:max-w-[320px]">
                            {
                              notification.task.title
                            }
                          </span>
                        )}

                      </div>

                    </button>

                    {/* DESKTOP ACTIONS */}
                    <div className="hidden shrink-0 items-start gap-1 sm:flex">

                      <ReadToggleButton
                        notification={
                          notification
                        }
                        busy={
                          busy
                        }
                        disabled={
                          Boolean(
                            actionId ||
                              globalAction
                          )
                        }
                        onClick={() =>
                          void toggleRead(
                            notification
                          )
                        }
                      />

                      <RemoveButton
                        disabled={
                          Boolean(
                            actionId ||
                              globalAction
                          )
                        }
                        onClick={() =>
                          void handleRemove(
                            notification.id
                          )
                        }
                      />

                    </div>

                    {/* MOBILE ACTION MENU */}
                    <div
                      data-notification-menu
                      className="relative shrink-0 sm:hidden"
                    >

                      <button
                        type="button"
                        disabled={
                          Boolean(
                            actionId ||
                              globalAction
                          )
                        }
                        onClick={() =>
                          setMobileMenuId(
                            (
                              current
                            ) =>
                              current ===
                              notification.id
                                ? null
                                : notification.id
                          )
                        }
                        aria-label={`Actions for ${notification.title}`}
                        aria-haspopup="menu"
                        aria-expanded={
                          mobileMenuId ===
                          notification.id
                        }
                        className="grid h-9 w-9 place-items-center rounded-lg text-lg text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink disabled:opacity-40"
                      >

                        {busy ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-kite-line border-t-kite-blue-deep" />
                        ) : (
                          "⋯"
                        )}

                      </button>

                      {mobileMenuId ===
                        notification.id && (
                        <div
                          role="menu"
                          className="absolute right-0 top-10 z-40 w-48 rounded-xl border border-kite-line bg-white p-1.5 shadow-[0_18px_55px_-25px_rgba(46,51,56,0.45)]"
                        >

                          <button
                            type="button"
                            role="menuitem"
                            disabled={
                              busy
                            }
                            onClick={() =>
                              void toggleRead(
                                notification
                              )
                            }
                            className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-kite-ink transition hover:bg-kite-soft disabled:opacity-40"
                          >
                            {notification.isRead
                              ? "Mark as unread"
                              : "Mark as read"}
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            disabled={
                              busy
                            }
                            onClick={() =>
                              void handleRemove(
                                notification.id
                              )
                            }
                            className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-red-500 transition hover:bg-red-50 disabled:opacity-40"
                          >
                            Remove notification
                          </button>

                        </div>
                      )}

                    </div>

                  </article>
                );
              }
            )}

          </div>

        </section>
      )}

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| PAGE HEADING
|--------------------------------------------------------------------------
*/

function PageHeading({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "min-w-0"
          : "mb-6 min-w-0 sm:mb-7"
      }
    >

      <h1 className="text-2xl font-semibold tracking-tight text-kite-ink sm:text-3xl">
        Notifications
      </h1>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-kite-muted">
        Updates that need your attention across your projects and tasks.
      </p>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| STAT
|--------------------------------------------------------------------------
*/

function NotificationStat({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-kite-line bg-white px-3 py-4 sm:p-5">

      <p className="truncate text-[10px] text-kite-muted sm:text-sm">
        {title}
      </p>

      <p className="mt-1 text-xl font-semibold text-kite-ink sm:mt-2 sm:text-2xl">
        {value}
      </p>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| EMPTY STATE
|--------------------------------------------------------------------------
*/

function NotificationEmptyState() {
  return (
    <section className="rounded-2xl border border-kite-line bg-white px-5 py-12 text-center sm:px-6 sm:py-16">

      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-kite-blue-wash text-kite-blue-deep sm:h-16 sm:w-16">

        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          className="h-7 w-7 sm:h-8 sm:w-8"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />

          <path d="M10 21h4" />
        </svg>

      </div>

      <h2 className="mt-5 text-lg font-semibold text-kite-ink sm:text-xl">
        No notifications yet
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-kite-muted">
        Task assignments, review requests, comments, approvals, deadlines, and project updates will appear here.
      </p>

    </section>
  );
}

/*
|--------------------------------------------------------------------------
| DESKTOP ACTION BUTTONS
|--------------------------------------------------------------------------
*/

function ReadToggleButton({
  notification,
  busy,
  disabled,
  onClick,
}: {
  notification:
    KiteNotification;

  busy:
    boolean;

  disabled:
    boolean;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      disabled={
        disabled
      }
      title={
        notification.isRead
          ? "Mark unread"
          : "Mark read"
      }
      aria-label={
        notification.isRead
          ? "Mark notification as unread"
          : "Mark notification as read"
      }
      onClick={
        onClick
      }
      className="grid h-9 w-9 place-items-center rounded-lg text-kite-faint transition hover:bg-kite-soft hover:text-kite-ink disabled:opacity-40"
    >

      {busy ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-kite-line border-t-kite-blue-deep" />
      ) : notification.isRead ? (
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
            r="8"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="6"
          />
        </svg>
      )}

    </button>
  );
}

function RemoveButton({
  disabled,
  onClick,
}: {
  disabled:
    boolean;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      disabled={
        disabled
      }
      title="Remove notification"
      aria-label="Remove notification"
      onClick={
        onClick
      }
      className="grid h-9 w-9 place-items-center rounded-lg text-kite-faint transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
    >

      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        className="h-4.5 w-4.5"
        aria-hidden="true"
      >
        <path d="M4 7h16" />

        <path d="M9 7V4h6v3" />

        <path d="m7 7 1 13h8l1-13" />

        <path d="M10 11v5M14 11v5" />
      </svg>

    </button>
  );
}

/*
|--------------------------------------------------------------------------
| NOTIFICATION ICON
|--------------------------------------------------------------------------
*/

function NotificationPageIcon({
  notification,
}: {
  notification:
    KiteNotification;
}) {
  if (
    notification.actor
  ) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-kite-soft text-[10px] font-semibold text-kite-ink sm:h-11 sm:w-11 sm:text-xs">

        {getInitials(
          notification.actor.name
        )}

      </div>
    );
  }

  const style =
    getNotificationStyle(
      notification.type
    );

  return (
    <div
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl sm:h-11 sm:w-11 ${style}`}
    >
      <NotificationIcon
        type={
          notification.type
        }
      />
    </div>
  );
}

function NotificationIcon({
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
        aria-hidden="true"
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
        aria-hidden="true"
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
        aria-hidden="true"
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
      aria-hidden="true"
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
  type:
    NotificationType
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
  name:
    string
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

function formatDateTime(
  value:
    string
) {
  return new Date(
    value
  ).toLocaleString(
    "en-US",
    {
      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",

      hour:
        "numeric",

      minute:
        "2-digit",
    }
  );
}

/*
|--------------------------------------------------------------------------
| SKELETON
|--------------------------------------------------------------------------
*/

function NotificationsSkeleton() {
  return (
    <div className="mx-auto min-w-0 max-w-[1200px] animate-pulse">

      <div className="mb-6 sm:mb-7">

        <div className="h-8 w-44 rounded-xl bg-kite-line sm:h-9 sm:w-52" />

        <div className="mt-3 h-4 w-96 max-w-full rounded bg-kite-line" />

      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">

        {[1, 2, 3].map(
          (
            item
          ) => (
            <div
              key={
                item
              }
              className="h-20 rounded-2xl bg-white sm:h-24"
            />
          )
        )}

      </div>

      <div className="mt-5 rounded-2xl border border-kite-line bg-white p-3 sm:p-4">

        <div className="h-11 rounded-xl bg-kite-line" />

        <div className="mt-3 h-10 rounded-xl bg-kite-line" />

      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-kite-line bg-white">

        {[1, 2, 3].map(
          (
            item
          ) => (
            <div
              key={
                item
              }
              className="flex gap-3 border-b border-kite-line p-4 last:border-b-0 sm:p-5"
            >

              <div className="h-10 w-10 shrink-0 rounded-xl bg-kite-line" />

              <div className="flex-1">

                <div className="h-4 w-44 max-w-full rounded bg-kite-line" />

                <div className="mt-2 h-3 w-full rounded bg-kite-line" />

                <div className="mt-2 h-3 w-2/3 rounded bg-kite-line" />

              </div>

            </div>
          )
        )}

      </div>

    </div>
  );
}

export default NotificationsPage;