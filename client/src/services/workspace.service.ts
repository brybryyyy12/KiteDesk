import {
  apiFetch,
} from "../lib/api";

export type ApiWorkspaceRole =
  | "OWNER"
  | "MANAGER"
  | "MEMBER";

export type ApiWorkspace = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;

  role: ApiWorkspaceRole;

  joinedAt?: string;

  memberCount?: number;
  projectCount?: number;
};

type WorkspacesResponse = {
  success: true;

  data: {
    workspaces: ApiWorkspace[];
  };
};

type WorkspaceResponse = {
  success: true;

  message?: string;

  data: {
    workspace: ApiWorkspace;
  };
};

export type CreateWorkspaceInput = {
  name: string;
  description?: string | null;
};

export type UpdateWorkspaceInput = {
  name?: string;
  description?: string | null;
};

export const workspaceService = {
  getAll() {
    return apiFetch<WorkspacesResponse>(
      "/workspaces"
    );
  },

  getById(
    workspaceId: string
  ) {
    return apiFetch<WorkspaceResponse>(
      `/workspaces/${workspaceId}`
    );
  },

  create(
    input: CreateWorkspaceInput
  ) {
    return apiFetch<WorkspaceResponse>(
      "/workspaces",
      {
        method: "POST",
        body: input,
      }
    );
  },

  update(
    workspaceId: string,
    input: UpdateWorkspaceInput
  ) {
    return apiFetch<WorkspaceResponse>(
      `/workspaces/${workspaceId}`,
      {
        method: "PATCH",
        body: input,
      }
    );
  },
};