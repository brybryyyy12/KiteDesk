import {
  apiFetch,
} from "../lib/api";

export type ApiProjectStatus =
  | "PLANNING"
  | "IN_PROGRESS"
  | "ON_HOLD"
  | "COMPLETED";

export type ApiProjectMember = {
  /*
   * ProjectMember join-table ID
   */
  projectMemberId: string;

  /*
   * Actual User ID
   */
  id: string;

  name: string;

  email: string;

  jobTitle: string | null;

  addedAt: string;
};

export type ApiProject = {
  id: string;

  workspaceId: string;

  name: string;

  description: string | null;

  status: ApiProjectStatus;

  /*
   * Backend returns YYYY-MM-DD.
   */
  deadline: string | null;

  createdById: string;

  createdBy: {
    id: string;
    name: string;
  };

  createdAt: string;

  updatedAt: string;

  totalTasks: number;

  completedTasks: number;

  memberCount: number;

  members: ApiProjectMember[];
};

export type CreateApiProjectInput = {
  name: string;

  description?: string | null;

  status?: ApiProjectStatus;

  deadline?: string | null;

  /*
   * USER IDs, not
   * WorkspaceMembership IDs.
   */
  memberIds?: string[];
};

export type UpdateApiProjectInput = {
  name?: string;

  description?: string | null;

  status?: ApiProjectStatus;

  deadline?: string | null;
};

type ProjectsResponse = {
  success: true;

  data: {
    projects: ApiProject[];
  };
};

type ProjectResponse = {
  success: true;

  data: {
    project: ApiProject;
  };
};

type ProjectMutationResponse = {
  success: true;

  message: string;

  data: {
    project: ApiProject;
  };
};

type DeleteProjectResponse = {
  success: true;

  message: string;
};

export const projectService = {
  getAll(
    workspaceId: string
  ) {
    return apiFetch<ProjectsResponse>(
      `/workspaces/${workspaceId}/projects`
    );
  },

  getById(
    workspaceId: string,
    projectId: string
  ) {
    return apiFetch<ProjectResponse>(
      `/workspaces/${workspaceId}/projects/${projectId}`
    );
  },

  create(
    workspaceId: string,
    input: CreateApiProjectInput
  ) {
    return apiFetch<ProjectMutationResponse>(
      `/workspaces/${workspaceId}/projects`,
      {
        method: "POST",

        body: input,
      }
    );
  },

  update(
    workspaceId: string,
    projectId: string,
    input: UpdateApiProjectInput
  ) {
    return apiFetch<ProjectMutationResponse>(
      `/workspaces/${workspaceId}/projects/${projectId}`,
      {
        method: "PATCH",

        body: input,
      }
    );
  },

  remove(
    workspaceId: string,
    projectId: string
  ) {
    return apiFetch<DeleteProjectResponse>(
      `/workspaces/${workspaceId}/projects/${projectId}`,
      {
        method: "DELETE",
      }
    );
  },
};