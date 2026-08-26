import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  useAuth,
} from "./AuthContext";

import {
  notificationService,
  type KiteNotification,
  type NotificationPagination,
  type NotificationType,
} from "../services/notification.service";

/*
|--------------------------------------------------------------------------
| RE-EXPORT TYPES
|--------------------------------------------------------------------------
*/

export type {
  KiteNotification,
  NotificationType,
};

/*
|--------------------------------------------------------------------------
| CONTEXT TYPE
|--------------------------------------------------------------------------
*/

type NotificationContextType = {
  notifications: KiteNotification[];

  unreadCount: number;

  totalCount: number;

  pagination: NotificationPagination | null;

  isLoaded: boolean;

  isLoading: boolean;

  error: string;

  refreshNotifications: () => Promise<void>;

  refreshUnreadCount: () => Promise<void>;

  markAsRead: (
    notificationId: string
  ) => Promise<void>;

  markAsUnread: (
    notificationId: string
  ) => Promise<void>;

  markAllAsRead: () => Promise<void>;

  removeNotification: (
    notificationId: string
  ) => Promise<void>;

  clearNotifications: () => Promise<void>;
};

const NotificationContext =
  createContext<NotificationContextType | null>(
    null
  );

/*
|--------------------------------------------------------------------------
| PROVIDER
|--------------------------------------------------------------------------
*/

export function NotificationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    user,
    isLoading:
      authLoading,
  } =
    useAuth();

  const [
    notifications,
    setNotifications,
  ] =
    useState<
      KiteNotification[]
    >([]);

  const [
    unreadCount,
    setUnreadCount,
  ] =
    useState(0);

  const [
    totalCount,
    setTotalCount,
  ] =
    useState(0);

  const [
    pagination,
    setPagination,
  ] =
    useState<NotificationPagination | null>(
      null
    );

  const [
    isLoaded,
    setIsLoaded,
  ] =
    useState(false);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  /*
   * Protect against a stale request
   * from a previous logged-in user.
   */
  const requestIdRef =
    useRef(0);

  /*
  |--------------------------------------------------------------------------
  | LOAD NOTIFICATIONS
  |--------------------------------------------------------------------------
  |
  | Backend allows a maximum limit of 100.
  |
  | For the current KiteDesk V1 we keep the latest
  | 100 in the shared context.
  |
  | The backend still tells us the real total count.
  |
  */

  const refreshNotifications =
    useCallback(
      async () => {
        if (
          !user
        ) {
          setNotifications(
            []
          );

          setUnreadCount(
            0
          );

          setTotalCount(
            0
          );

          setPagination(
            null
          );

          setError(
            ""
          );

          setIsLoaded(
            true
          );

          return;
        }

        const requestId =
          ++requestIdRef.current;

        setIsLoading(
          true
        );

        setError(
          ""
        );

        try {
          const response =
            await notificationService.getAll(
              {
                page: 1,

                limit: 100,

                filter:
                  "all",
              }
            );

          if (
            requestId !==
            requestIdRef.current
          ) {
            return;
          }

          setNotifications(
            response.data
              .notifications
          );

          setUnreadCount(
            response.data
              .unreadCount
          );

          setTotalCount(
            response.data
              .pagination
              .total
          );

          setPagination(
            response.data
              .pagination
          );
        } catch (
          caughtError
        ) {
          if (
            requestId !==
            requestIdRef.current
          ) {
            return;
          }

          setError(
            caughtError instanceof
              Error
              ? caughtError.message
              : "Unable to load notifications."
          );
        } finally {
          if (
            requestId ===
            requestIdRef.current
          ) {
            setIsLoading(
              false
            );

            setIsLoaded(
              true
            );
          }
        }
      },
      [
        user,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | UNREAD COUNT
  |--------------------------------------------------------------------------
  */

  const refreshUnreadCount =
    useCallback(
      async () => {
        if (
          !user
        ) {
          setUnreadCount(
            0
          );

          return;
        }

        try {
          const response =
            await notificationService.getUnreadCount();

          setUnreadCount(
            response.data
              .unreadCount
          );
        } catch {
          /*
           * Do not replace the whole notification
           * UI with an error just because background
           * polling failed.
           */
        }
      },
      [
        user,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      if (
        authLoading
      ) {
        return;
      }

      /*
       * Invalidate any request belonging
       * to the previous user.
       */
      requestIdRef.current +=
        1;

      if (
        !user
      ) {
        setNotifications(
          []
        );

        setUnreadCount(
          0
        );

        setTotalCount(
          0
        );

        setPagination(
          null
        );

        setError(
          ""
        );

        setIsLoaded(
          true
        );

        setIsLoading(
          false
        );

        return;
      }

      setIsLoaded(
        false
      );

      void refreshNotifications();
    },
    [
      authLoading,
      user,
      refreshNotifications,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | LIGHTWEIGHT POLLING
  |--------------------------------------------------------------------------
  |
  | We only poll the unread count.
  |
  | The full list refreshes when the bell opens,
  | when the notification page mounts, and when
  | the window receives focus.
  |
  */

  useEffect(
    () => {
      if (
        !user
      ) {
        return;
      }

      const intervalId =
        window.setInterval(
          () => {
            void refreshUnreadCount();
          },
          30000
        );

      const handleFocus =
        () => {
          void refreshUnreadCount();
        };

      window.addEventListener(
        "focus",
        handleFocus
      );

      return () => {
        window.clearInterval(
          intervalId
        );

        window.removeEventListener(
          "focus",
          handleFocus
        );
      };
    },
    [
      user,
      refreshUnreadCount,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | READ / UNREAD
  |--------------------------------------------------------------------------
  */

  const updateReadStatus =
    useCallback(
      async (
        notificationId: string,
        isRead: boolean
      ) => {
        const existing =
          notifications.find(
            (
              notification
            ) =>
              notification.id ===
              notificationId
          );

        if (
          !existing ||
          existing.isRead ===
            isRead
        ) {
          return;
        }

        setError(
          ""
        );

        try {
          await notificationService.setReadStatus(
            notificationId,
            isRead
          );

          const now =
            new Date().toISOString();

          setNotifications(
            (
              current
            ) =>
              current.map(
                (
                  notification
                ) =>
                  notification.id ===
                  notificationId
                    ? {
                        ...notification,

                        isRead,

                        readAt:
                          isRead
                            ? now
                            : null,
                      }
                    : notification
              )
          );

          setUnreadCount(
            (
              current
            ) => {
              if (
                isRead
              ) {
                return Math.max(
                  0,
                  current -
                    1
                );
              }

              return (
                current +
                1
              );
            }
          );
        } catch (
          caughtError
        ) {
          const message =
            caughtError instanceof
              Error
              ? caughtError.message
              : "Unable to update notification.";

          setError(
            message
          );

          throw caughtError;
        }
      },
      [
        notifications,
      ]
    );

  const markAsRead =
    useCallback(
      async (
        notificationId: string
      ) => {
        await updateReadStatus(
          notificationId,
          true
        );
      },
      [
        updateReadStatus,
      ]
    );

  const markAsUnread =
    useCallback(
      async (
        notificationId: string
      ) => {
        await updateReadStatus(
          notificationId,
          false
        );
      },
      [
        updateReadStatus,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | MARK ALL READ
  |--------------------------------------------------------------------------
  */

  const markAllAsRead =
    useCallback(
      async () => {
        if (
          unreadCount ===
          0
        ) {
          return;
        }

        setError(
          ""
        );

        try {
          await notificationService.markAllRead();

          const now =
            new Date().toISOString();

          setNotifications(
            (
              current
            ) =>
              current.map(
                (
                  notification
                ) =>
                  notification.isRead
                    ? notification
                    : {
                        ...notification,

                        isRead:
                          true,

                        readAt:
                          now,
                      }
              )
          );

          setUnreadCount(
            0
          );
        } catch (
          caughtError
        ) {
          const message =
            caughtError instanceof
              Error
              ? caughtError.message
              : "Unable to mark notifications as read.";

          setError(
            message
          );

          throw caughtError;
        }
      },
      [
        unreadCount,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | DELETE ONE
  |--------------------------------------------------------------------------
  */

  const removeNotification =
    useCallback(
      async (
        notificationId: string
      ) => {
        const existing =
          notifications.find(
            (
              notification
            ) =>
              notification.id ===
              notificationId
          );

        if (
          !existing
        ) {
          return;
        }

        setError(
          ""
        );

        try {
          await notificationService.remove(
            notificationId
          );

          setNotifications(
            (
              current
            ) =>
              current.filter(
                (
                  notification
                ) =>
                  notification.id !==
                  notificationId
              )
          );

          setTotalCount(
            (
              current
            ) =>
              Math.max(
                0,
                current -
                  1
              )
          );

          if (
            !existing.isRead
          ) {
            setUnreadCount(
              (
                current
              ) =>
                Math.max(
                  0,
                  current -
                    1
                )
            );
          }
        } catch (
          caughtError
        ) {
          const message =
            caughtError instanceof
              Error
              ? caughtError.message
              : "Unable to delete notification.";

          setError(
            message
          );

          throw caughtError;
        }
      },
      [
        notifications,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | CLEAR ALL
  |--------------------------------------------------------------------------
  */

  const clearNotifications =
    useCallback(
      async () => {
        if (
          totalCount ===
          0
        ) {
          return;
        }

        setError(
          ""
        );

        try {
          await notificationService.clear();

          setNotifications(
            []
          );

          setUnreadCount(
            0
          );

          setTotalCount(
            0
          );

          setPagination(
            (
              current
            ) =>
              current
                ? {
                    ...current,

                    total:
                      0,

                    totalPages:
                      1,

                    hasNextPage:
                      false,

                    hasPreviousPage:
                      false,
                  }
                : null
          );
        } catch (
          caughtError
        ) {
          const message =
            caughtError instanceof
              Error
              ? caughtError.message
              : "Unable to clear notifications.";

          setError(
            message
          );

          throw caughtError;
        }
      },
      [
        totalCount,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | VALUE
  |--------------------------------------------------------------------------
  */

  const value =
    useMemo<NotificationContextType>(
      () => ({
        notifications,

        unreadCount,

        totalCount,

        pagination,

        isLoaded,

        isLoading,

        error,

        refreshNotifications,

        refreshUnreadCount,

        markAsRead,

        markAsUnread,

        markAllAsRead,

        removeNotification,

        clearNotifications,
      }),
      [
        notifications,
        unreadCount,
        totalCount,
        pagination,
        isLoaded,
        isLoading,
        error,
        refreshNotifications,
        refreshUnreadCount,
        markAsRead,
        markAsUnread,
        markAllAsRead,
        removeNotification,
        clearNotifications,
      ]
    );

  return (
    <NotificationContext.Provider
      value={
        value
      }
    >
      {
        children
      }
    </NotificationContext.Provider>
  );
}

/*
|--------------------------------------------------------------------------
| HOOK
|--------------------------------------------------------------------------
*/

export function useNotifications() {
  const context =
    useContext(
      NotificationContext
    );

  if (
    !context
  ) {
    throw new Error(
      "useNotifications must be used inside NotificationProvider"
    );
  }

  return context;
}