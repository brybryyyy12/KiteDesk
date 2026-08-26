import {
  apiFetch,
} from "../lib/api";

export type ApiCommentAuthor = {
  id: string;
  name: string;
  email?: string;
  jobTitle?: string | null;
};

export type ApiComment = {
  id: string;
  content: string;
  author: ApiCommentAuthor;
  createdAt: string;
  updatedAt: string;
};

type CommentsResponse = {
  success: true;

  data: {
    comments:
      ApiComment[];
  };
};

type CreateCommentResponse = {
  success: true;
  message: string;

  data: {
    comment:
      ApiComment;
  };
};

export const commentService = {
  getAll(
    workspaceId: string,
    projectId: string,
    taskId: string
  ) {
    return apiFetch<CommentsResponse>(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments`
    );
  },

  create(
    workspaceId: string,
    projectId: string,
    taskId: string,
    content: string
  ) {
    return apiFetch<CreateCommentResponse>(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments`,
      {
        method:
          "POST",

        body: {
          content:
            content.trim(),
        },
      }
    );
  },
};