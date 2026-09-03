import {
  apiFetch,
} from "../lib/api";

export type ApiTaskStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "REVIEW"
  | "DONE";

export type ApiTaskPriority =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "URGENT";

export type ApiTaskType =
  | "TASK"
  | "FEATURE"
  | "BUG";

export type ApiTaskUser = {
  id: string;

  name: string;

  email?: string;

  jobTitle?: string | null;
};

export type ApiTaskLabel = {
  id: string;
  name: string;
  color: string;
};

export type ApiSubtask = { id: string; projectId: string; title: string; status: ApiTaskStatus; priority: ApiTaskPriority; dueDate: string | null };
export type ApiChecklistItem = { id: string; title: string; isCompleted: boolean; createdAt: string };

export type ApiTaskComment = {
  id: string;

  content: string;

  author: {
    id: string;
    name: string;
  };

  createdAt: string;

  updatedAt: string;
};

export type ApiTaskAttachment = {
  id: string;

  fileName: string;

  fileUrl: string;

  mimeType: string;

  fileSize: number;

  uploadedBy: {
    id: string;
    name: string;
  };

  createdAt: string;
};

export type ApiTaskActivity = {
  id: string;

  type: string;

  message: string;

  metadata:
    | unknown
    | null;

  actor: {
    id: string;
    name: string;
  } | null;

  createdAt: string;
};

export type ApiTaskListItem = {
  id: string;

  projectId: string;

  title: string;

  description:
    | string
    | null;

  type: ApiTaskType;

  priority:
    ApiTaskPriority;

  status:
    ApiTaskStatus;

  assignee:
    ApiTaskUser | null;

  createdBy: {
    id: string;
    name: string;
  };

  dueDate:
    | string
    | null;

  commentCount: number;

  attachmentCount: number;

  createdAt: string;

  updatedAt: string;

  labels: ApiTaskLabel[];
};

export type ApiTaskDetail = {
  id: string;

  projectId: string;

  parentTaskId: string | null;

  title: string;

  description:
    | string
    | null;

  type: ApiTaskType;

  priority:
    ApiTaskPriority;

  status:
    ApiTaskStatus;

  assignee:
    ApiTaskUser | null;

  createdBy: {
    id: string;
    name: string;
    email?: string;
  };

  dueDate:
    | string
    | null;

  createdAt: string;

  updatedAt: string;

  comments:
    ApiTaskComment[];

  attachments:
    ApiTaskAttachment[];

  activity:
    ApiTaskActivity[];

  labels: ApiTaskLabel[];

  subtasks: ApiSubtask[];

  checklistItems: ApiChecklistItem[];
};

export type CreateApiTaskInput = {
  title: string;

  description?:
    | string
    | null;

  type?: ApiTaskType;

  priority?:
    ApiTaskPriority;

  assigneeId?:
    | string
    | null;

  dueDate?:
    | string
    | null;
};

export type UpdateApiTaskInput = {
  title?: string;

  description?:
    | string
    | null;

  type?: ApiTaskType;

  priority?:
    ApiTaskPriority;

  assigneeId?:
    | string
    | null;

  dueDate?:
    | string
    | null;

  labelIds?: string[];
};

export type UpdateApiTaskStatusInput = {
  status:
    ApiTaskStatus;

  feedback?:
    | string
    | null;
};

export type TaskFilters = {
  status?:
    ApiTaskStatus;

  priority?:
    ApiTaskPriority;

  type?:
    ApiTaskType;

  assigneeId?:
    string;

  mine?:
    boolean;

  search?:
    string;
};

type TaskListResponse = {
  success: true;

  data: {
    tasks:
      ApiTaskListItem[];
  };
};

type TaskResponse = {
  success: true;

  message?: string;

  data: {
    task:
      ApiTaskDetail;
  };
};

type DeleteTaskResponse = {
  success: true;

  message: string;
};

function buildQuery(
  filters?: TaskFilters
) {
  if (!filters) {
    return "";
  }

  const params =
    new URLSearchParams();

  if (
    filters.status
  ) {
    params.set(
      "status",
      filters.status
    );
  }

  if (
    filters.priority
  ) {
    params.set(
      "priority",
      filters.priority
    );
  }

  if (
    filters.type
  ) {
    params.set(
      "type",
      filters.type
    );
  }

  if (
    filters.assigneeId
  ) {
    params.set(
      "assigneeId",
      filters.assigneeId
    );
  }

  if (
    filters.mine !==
    undefined
  ) {
    params.set(
      "mine",
      String(
        filters.mine
      )
    );
  }

  if (
    filters.search?.trim()
  ) {
    params.set(
      "search",
      filters.search.trim()
    );
  }

  const query =
    params.toString();

  return query
    ? `?${query}`
    : "";
}

export const taskService = {
  getAll(
    workspaceId: string,
    projectId: string,
    filters?: TaskFilters
  ) {
    return apiFetch<TaskListResponse>(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks${buildQuery(
        filters
      )}`
    );
  },

  getById(
    workspaceId: string,
    projectId: string,
    taskId: string
  ) {
    return apiFetch<TaskResponse>(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`
    );
  },

  create(
    workspaceId: string,
    projectId: string,
    input: CreateApiTaskInput
  ) {
    return apiFetch<TaskResponse>(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
      {
        method: "POST",

        body: input,
      }
    );
  },

  update(
    workspaceId: string,
    projectId: string,
    taskId: string,
    input: UpdateApiTaskInput
  ) {
    return apiFetch<TaskResponse>(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
      {
        method: "PATCH",

        body: input,
      }
    );
  },

  updateStatus(
    workspaceId: string,
    projectId: string,
    taskId: string,
    input:
      UpdateApiTaskStatusInput
  ) {
    return apiFetch<TaskResponse>(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/status`,
      {
        method: "PATCH",

        body: input,
      }
    );
  },

  remove(
    workspaceId: string,
    projectId: string,
    taskId: string
  ) {
    return apiFetch<DeleteTaskResponse>(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
      {
        method: "DELETE",
      }
    );
  },

  createSubtask(workspaceId: string, projectId: string, taskId: string, title: string) {
    return apiFetch<{ success: true; data: { subtask: ApiSubtask } }>(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/subtasks`, { method: "POST", body: { title } });
  },

  createChecklistItem(workspaceId: string, projectId: string, taskId: string, title: string) {
    return apiFetch<{ success: true; data: { item: ApiChecklistItem } }>(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/checklist`, { method: "POST", body: { title } });
  },

  updateChecklistItem(workspaceId: string, projectId: string, taskId: string, itemId: string, isCompleted: boolean) {
    return apiFetch<{ success: true; data: { item: ApiChecklistItem } }>(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/checklist/${itemId}`, { method: "PATCH", body: { isCompleted } });
  },

  deleteChecklistItem(workspaceId: string, projectId: string, taskId: string, itemId: string) {
    return apiFetch<{ success: true; message: string }>(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/checklist/${itemId}`, { method: "DELETE" });
  },
};
