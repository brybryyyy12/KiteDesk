import {
  apiFetch,
} from "../lib/api";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

export type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_REASSIGNED"
  | "TASK_REVIEW"
  | "TASK_APPROVED"
  | "CHANGES_REQUESTED"
  | "COMMENT"
  | "DUE_SOON"
  | "OVERDUE"
  | "PROJECT_ADDED"
  | "PROJECT_REMOVED";

export type NotificationTaskStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "REVIEW"
  | "DONE";

export type NotificationActor = {
  id: string;
  name: string;
};

export type NotificationProject = {
  id: string;
  name: string;
};

export type NotificationTask = {
  id: string;
  title: string;
  status: NotificationTaskStatus;
};

export type KiteNotification = {
  id: string;

  type: NotificationType;

  title: string;

  message: string;

  isRead: boolean;

  readAt: string | null;

  createdAt: string;

  workspaceId: string;

  projectId: string | null;

  taskId: string | null;

  actor: NotificationActor | null;

  project: NotificationProject | null;

  task: NotificationTask | null;
};

export type NotificationPagination = {
  page: number;

  limit: number;

  total: number;

  totalPages: number;

  hasNextPage: boolean;

  hasPreviousPage: boolean;
};

export type NotificationFilter =
  | "all"
  | "unread"
  | "read";

export type NotificationListParams = {
  page?: number;

  limit?: number;

  filter?: NotificationFilter;

  type?: NotificationType;

  search?: string;
};

/*
|--------------------------------------------------------------------------
| RESPONSES
|--------------------------------------------------------------------------
*/

type NotificationListResponse = {
  success: true;

  data: {
    notifications: KiteNotification[];

    unreadCount: number;

    pagination: NotificationPagination;
  };
};

type UnreadCountResponse = {
  success: true;

  data: {
    unreadCount: number;
  };
};

type UpdateReadResponse = {
  success: true;

  message: string;

  data: {
    notification: {
      id: string;

      isRead: boolean;

      readAt: string | null;

      [key: string]: unknown;
    };
  };
};

type MarkAllReadResponse = {
  success: true;

  message: string;

  data: {
    updatedCount: number;
  };
};

type DeleteNotificationResponse = {
  success: true;

  message: string;
};

type ClearNotificationsResponse = {
  success: true;

  message: string;

  data: {
    deletedCount: number;
  };
};

/*
|--------------------------------------------------------------------------
| QUERY
|--------------------------------------------------------------------------
*/

function buildQuery(
  params: NotificationListParams = {}
) {
  const query =
    new URLSearchParams();

  if (
    params.page !==
    undefined
  ) {
    query.set(
      "page",
      String(
        params.page
      )
    );
  }

  if (
    params.limit !==
    undefined
  ) {
    query.set(
      "limit",
      String(
        params.limit
      )
    );
  }

  if (
    params.filter
  ) {
    query.set(
      "filter",
      params.filter
    );
  }

  if (
    params.type
  ) {
    query.set(
      "type",
      params.type
    );
  }

  if (
    params.search?.trim()
  ) {
    query.set(
      "search",
      params.search.trim()
    );
  }

  const result =
    query.toString();

  return result
    ? `?${result}`
    : "";
}

/*
|--------------------------------------------------------------------------
| SERVICE
|--------------------------------------------------------------------------
*/

export const notificationService = {
  async getAll(
    params: NotificationListParams = {}
  ) {
    return apiFetch<NotificationListResponse>(
      `/notifications${buildQuery(
        params
      )}`
    );
  },

  async getUnreadCount() {
    return apiFetch<UnreadCountResponse>(
      "/notifications/unread-count"
    );
  },

  async setReadStatus(
    notificationId: string,
    isRead: boolean
  ) {
    return apiFetch<UpdateReadResponse>(
      `/notifications/${notificationId}/read`,
      {
        method: "PATCH",

        body: JSON.stringify({
          isRead,
        }),
      }
    );
  },

  async markAllRead() {
    return apiFetch<MarkAllReadResponse>(
      "/notifications/read-all",
      {
        method: "PATCH",
      }
    );
  },

  async remove(
    notificationId: string
  ) {
    return apiFetch<DeleteNotificationResponse>(
      `/notifications/${notificationId}`,
      {
        method: "DELETE",
      }
    );
  },

  async clear() {
    return apiFetch<ClearNotificationsResponse>(
      "/notifications",
      {
        method: "DELETE",
      }
    );
  },
};