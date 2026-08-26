import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  useAuth,
} from "./AuthContext";

import {
  workspaceService,
  type ApiWorkspace,
} from "../services/workspace.service";

export type WorkspaceRole =
  | "Owner"
  | "Manager"
  | "Member";

export type Workspace = {
  id: string;

  name: string;

  slug: string;

  description: string;

  role: WorkspaceRole;

  createdById: string;

  createdAt: string;

  updatedAt: string;

  joinedAt?: string;

  memberCount: number;

  projectCount: number;
};

type CreateWorkspaceData = {
  name: string;

  /*
   * Kept temporarily so your
   * existing onboarding page
   * doesn't immediately break
   * if it still passes a slug.
   *
   * The backend generates the
   * real slug automatically.
   */
  slug?: string;

  description?: string;
};

type UpdateWorkspaceData = {
  name?: string;

  /*
   * Backend keeps the slug stable.
   * We don't send slug changes.
   */
  slug?: string;

  description?: string;
};

type WorkspaceContextType = {
  workspace: Workspace | null;

  workspaces: Workspace[];

  hasWorkspace: boolean;

  isLoading: boolean;

  error: string | null;

  createWorkspace: (
    data: CreateWorkspaceData
  ) => Promise<Workspace>;

  updateWorkspace: (
    data: UpdateWorkspaceData
  ) => Promise<Workspace>;

  selectWorkspace: (
    workspaceId: string
  ) => void;

  refreshWorkspaces: () =>
    Promise<void>;

  clearWorkspace: () => void;
};

const WorkspaceContext =
  createContext<
    WorkspaceContextType | undefined
  >(undefined);

/*
|--------------------------------------------------------------------------
| ROLE MAPPING
|--------------------------------------------------------------------------
|
| PostgreSQL / Prisma:
|
| OWNER
| MANAGER
| MEMBER
|
| Existing frontend:
|
| Owner
| Manager
| Member
|
*/

function mapWorkspaceRole(
  role:
    | "OWNER"
    | "MANAGER"
    | "MEMBER"
): WorkspaceRole {
  switch (role) {
    case "OWNER":
      return "Owner";

    case "MANAGER":
      return "Manager";

    case "MEMBER":
      return "Member";
  }
}

/*
|--------------------------------------------------------------------------
| API → FRONTEND MAPPER
|--------------------------------------------------------------------------
*/

function mapWorkspace(
  workspace: ApiWorkspace
): Workspace {
  return {
    id:
      workspace.id,

    name:
      workspace.name,

    slug:
      workspace.slug,

    description:
      workspace.description ??
      "",

    role:
      mapWorkspaceRole(
        workspace.role
      ),

    createdById:
      workspace.createdById,

    createdAt:
      workspace.createdAt,

    updatedAt:
      workspace.updatedAt,

    joinedAt:
      workspace.joinedAt,

    memberCount:
      workspace.memberCount ??
      0,

    projectCount:
      workspace.projectCount ??
      0,
  };
}

type WorkspaceProviderProps = {
  children: ReactNode;
};

export function WorkspaceProvider({
  children,
}: WorkspaceProviderProps) {
  const {
    user,
    isAuthenticated,
    isLoading:
      isAuthLoading,
  } = useAuth();

  const [
    workspace,
    setWorkspace,
  ] =
    useState<
      Workspace | null
    >(null);

  const [
    workspaces,
    setWorkspaces,
  ] =
    useState<
      Workspace[]
    >([]);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  /*
  |--------------------------------------------------------------------------
  | ACTIVE WORKSPACE STORAGE
  |--------------------------------------------------------------------------
  |
  | We no longer store workspace
  | data in localStorage.
  |
  | PostgreSQL is the source of truth.
  |
  | localStorage only remembers which
  | workspace the user selected.
  |
  */

  const getStorageKey =
    useCallback(
      () => {
        if (!user) {
          return null;
        }

        return `kitedesk_active_workspace_${user.id}`;
      },
      [user]
    );

  /*
  |--------------------------------------------------------------------------
  | REFRESH WORKSPACES
  |--------------------------------------------------------------------------
  */

  const refreshWorkspaces =
    useCallback(
      async () => {
        if (
          !isAuthenticated ||
          !user
        ) {
          setWorkspace(
            null
          );

          setWorkspaces(
            []
          );

          setIsLoading(
            false
          );

          return;
        }

        setIsLoading(
          true
        );

        setError(
          null
        );

        try {
          const response =
            await workspaceService.getAll();

          const loadedWorkspaces =
            response.data.workspaces.map(
              mapWorkspace
            );

          setWorkspaces(
            loadedWorkspaces
          );

          /*
           * New account:
           *
           * No workspace exists yet.
           */
          if (
            loadedWorkspaces.length ===
            0
          ) {
            setWorkspace(
              null
            );

            const storageKey =
              getStorageKey();

            if (
              storageKey
            ) {
              localStorage.removeItem(
                storageKey
              );
            }

            return;
          }

          const storageKey =
            getStorageKey();

          const storedWorkspaceId =
            storageKey
              ? localStorage.getItem(
                  storageKey
                )
              : null;

          /*
           * Try to restore the user's
           * previously active workspace.
           */
          const storedWorkspace =
            loadedWorkspaces.find(
              (
                candidate
              ) =>
                candidate.id ===
                storedWorkspaceId
            );

          /*
           * If there is no valid stored
           * workspace, use the first one
           * returned by the server.
           */
          const activeWorkspace =
            storedWorkspace ??
            loadedWorkspaces[0];

          setWorkspace(
            activeWorkspace
          );

          if (
            storageKey
          ) {
            localStorage.setItem(
              storageKey,
              activeWorkspace.id
            );
          }
        } catch (error) {
          console.error(
            "Failed to load workspaces:",
            error
          );

          setWorkspace(
            null
          );

          setWorkspaces(
            []
          );

          setError(
            "Unable to load your workspace."
          );
        } finally {
          setIsLoading(
            false
          );
        }
      },
      [
        isAuthenticated,
        user,
        getStorageKey,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | LOAD AFTER AUTHENTICATION
  |--------------------------------------------------------------------------
  |
  | AuthContext first checks:
  |
  | GET /api/auth/me
  |
  | Then WorkspaceContext checks:
  |
  | GET /api/workspaces
  |
  */

  useEffect(
    () => {
      if (
        isAuthLoading
      ) {
        return;
      }

      if (
        !isAuthenticated
      ) {
        setWorkspace(
          null
        );

        setWorkspaces(
          []
        );

        setError(
          null
        );

        setIsLoading(
          false
        );

        return;
      }

      void refreshWorkspaces();
    },
    [
      isAuthLoading,
      isAuthenticated,
      refreshWorkspaces,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | CREATE WORKSPACE
  |--------------------------------------------------------------------------
  */

  const createWorkspace =
    useCallback(
      async (
        data:
          CreateWorkspaceData
      ) => {
        if (!user) {
          throw new Error(
            "You must be logged in to create a workspace."
          );
        }

        setError(
          null
        );

        const response =
          await workspaceService.create(
            {
              name:
                data.name.trim(),

              description:
                data.description?.trim() ||
                null,
            }
          );

        const createdWorkspace =
          mapWorkspace(
            response.data.workspace
          );

        setWorkspaces(
          (current) => [
            createdWorkspace,
            ...current.filter(
              (
                candidate
              ) =>
                candidate.id !==
                createdWorkspace.id
            ),
          ]
        );

        setWorkspace(
          createdWorkspace
        );

        const storageKey =
          getStorageKey();

        if (
          storageKey
        ) {
          localStorage.setItem(
            storageKey,
            createdWorkspace.id
          );
        }

        return createdWorkspace;
      },
      [
        user,
        getStorageKey,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | UPDATE WORKSPACE
  |--------------------------------------------------------------------------
  */

  const updateWorkspace =
    useCallback(
      async (
        data:
          UpdateWorkspaceData
      ) => {
        if (
          !workspace
        ) {
          throw new Error(
            "No active workspace selected."
          );
        }

        setError(
          null
        );

        const response =
          await workspaceService.update(
            workspace.id,
            {
              ...(data.name !==
                undefined && {
                name:
                  data.name.trim(),
              }),

              ...(data.description !==
                undefined && {
                description:
                  data.description.trim(),
              }),
            }
          );

        /*
         * PATCH response doesn't
         * necessarily include the
         * existing counts, so preserve
         * them from current state.
         */
        const mapped =
          mapWorkspace(
            response.data.workspace
          );

        const updatedWorkspace:
          Workspace = {
            ...workspace,
            ...mapped,

            memberCount:
              response.data.workspace
                .memberCount ??
              workspace.memberCount,

            projectCount:
              response.data.workspace
                .projectCount ??
              workspace.projectCount,
          };

        setWorkspace(
          updatedWorkspace
        );

        setWorkspaces(
          (current) =>
            current.map(
              (
                candidate
              ) =>
                candidate.id ===
                updatedWorkspace.id
                  ? updatedWorkspace
                  : candidate
            )
        );

        return updatedWorkspace;
      },
      [workspace]
    );

  /*
  |--------------------------------------------------------------------------
  | SELECT WORKSPACE
  |--------------------------------------------------------------------------
  */

  const selectWorkspace =
    useCallback(
      (
        workspaceId:
          string
      ) => {
        const selected =
          workspaces.find(
            (
              candidate
            ) =>
              candidate.id ===
              workspaceId
          );

        if (!selected) {
          return;
        }

        setWorkspace(
          selected
        );

        const storageKey =
          getStorageKey();

        if (
          storageKey
        ) {
          localStorage.setItem(
            storageKey,
            selected.id
          );
        }
      },
      [
        workspaces,
        getStorageKey,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | CLEAR ACTIVE WORKSPACE
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  |
  | This does NOT delete the workspace
  | from PostgreSQL.
  |
  | It only clears the currently
  | selected workspace on this client.
  |
  */

  const clearWorkspace =
    useCallback(
      () => {
        const storageKey =
          getStorageKey();

        if (
          storageKey
        ) {
          localStorage.removeItem(
            storageKey
          );
        }

        setWorkspace(
          null
        );
      },
      [
        getStorageKey,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | CONTEXT
  |--------------------------------------------------------------------------
  */

  const value =
    useMemo<
      WorkspaceContextType
    >(
      () => ({
        workspace,

        workspaces,

        hasWorkspace:
          workspace !== null,

        isLoading,

        error,

        createWorkspace,

        updateWorkspace,

        selectWorkspace,

        refreshWorkspaces,

        clearWorkspace,
      }),
      [
        workspace,
        workspaces,
        isLoading,
        error,
        createWorkspace,
        updateWorkspace,
        selectWorkspace,
        refreshWorkspaces,
        clearWorkspace,
      ]
    );

  return (
    <WorkspaceContext.Provider
      value={value}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context =
    useContext(
      WorkspaceContext
    );

  if (!context) {
    throw new Error(
      "useWorkspace must be used inside WorkspaceProvider"
    );
  }

  return context;
}