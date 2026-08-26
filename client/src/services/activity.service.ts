import {
  apiFetch,
} from "../lib/api";

/*
|--------------------------------------------------------------------------
| ACTIVITY TYPES
|--------------------------------------------------------------------------
*/

export type ActivityType =
  | "PROJECT_CREATED"
  | "PROJECT_UPDATED"
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_STATUS_CHANGED"
  | "TASK_ASSIGNED"
  | "TASK_UNASSIGNED"
  | "TASK_PRIORITY_CHANGED"
  | "COMMENT_ADDED"
  | "ATTACHMENT_ADDED"
  | "TASK_SUBMITTED_FOR_REVIEW"
  | "TASK_APPROVED"
  | "CHANGES_REQUESTED"
  | "PROJECT_MEMBER_ADDED"
  | "PROJECT_MEMBER_REMOVED";

/*
|--------------------------------------------------------------------------
| ACTIVITY
|--------------------------------------------------------------------------
*/

export type WorkspaceActivity = {
  id: string;

  type: ActivityType;

  message: string;

  metadata:
    | Record<
        string,
        unknown
      >
    | null;

  createdAt: string;

  actor: {
    id: string;

    name: string;
  } | null;

  project: {
    id: string;

    name: string;
  };

  task: {
    id: string;

    title: string;

    status:
      | "TODO"
      | "IN_PROGRESS"
      | "REVIEW"
      | "DONE";
  } | null;
};

/*
|--------------------------------------------------------------------------
| RESPONSE
|--------------------------------------------------------------------------
*/

type WorkspaceActivityResponse = {
  success: true;

  data: {
    activities:
      WorkspaceActivity[];

    pagination: {
      page: number;

      limit: number;

      total: number;

      totalPages: number;

      hasNextPage: boolean;

      hasPreviousPage: boolean;
    };
  };
};

/*
|--------------------------------------------------------------------------
| SERVICE
|--------------------------------------------------------------------------
*/

export const activityService = {
  async getWorkspaceActivity(
    workspaceId: string,
    options?: {
      page?: number;

      limit?: number;
    }
  ) {
    const params =
      new URLSearchParams();

    params.set(
      "page",
      String(
        options?.page ??
          1
      )
    );

    params.set(
      "limit",
      String(
        options?.limit ??
          20
      )
    );

    return apiFetch<WorkspaceActivityResponse>(
      `/workspaces/${workspaceId}/activity?${params.toString()}`
    );
  },
};