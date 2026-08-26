import type {
  WorkspaceRole,
} from "../context/WorkspaceContext";

export type Permission =
  | "createTask"
  | "assignTask"
  | "updateOwnTask"
  | "editAnyTask"
  | "deleteTask"
  | "reviewTask"
  | "manageProject"
  | "deleteProject";

const permissions: Record<
  WorkspaceRole,
  Record<Permission, boolean>
> = {
  Owner: {
    createTask: true,
    assignTask: true,
    updateOwnTask: true,
    editAnyTask: true,
    deleteTask: true,
    reviewTask: true,
    manageProject: true,
    deleteProject: true,
  },

  Manager: {
    createTask: true,
    assignTask: true,
    updateOwnTask: true,
    editAnyTask: true,
    deleteTask: true,
    reviewTask: true,
    manageProject: true,
    deleteProject: false,
  },

  Member: {
    createTask: false,
    assignTask: false,
    updateOwnTask: true,
    editAnyTask: false,
    deleteTask: false,
    reviewTask: false,
    manageProject: false,
    deleteProject: false,
  },
};

export function hasPermission(
  role: WorkspaceRole,
  permission: Permission
) {
  return permissions[role][permission];
}