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

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

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
   * Kept temporarily so existing
   * onboarding code does not break
   * if it still sends a slug.
   *
   * Backend generates the actual slug.
   */
  slug?: string;

  description?: string;
};

type UpdateWorkspaceData = {
  name?: string;

  /*
   * Backend keeps the slug stable.
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
| SAFE LOCAL STORAGE
|--------------------------------------------------------------------------
|
| Some browsers/privacy settings may
| prevent localStorage access.
|
| Workspace data itself does NOT depend
| on localStorage. It only remembers
| which workspace was selected.
|
| Therefore storage failure should never
| break workspace loading.
|
*/

function safeGetLocalStorage(
  key: string
): string | null {
  try {
    return window.localStorage.getItem(
      key
    );
  } catch (error) {
    console.warn(
      "Unable to read localStorage:",
      error
    );

    return null;
  }
}

function safeSetLocalStorage(
  key: string,
  value: string
): void {
  try {
    window.localStorage.setItem(
      key,
      value
    );
  } catch (error) {
    console.warn(
      "Unable to write localStorage:",
      error
    );
  }
}

function safeRemoveLocalStorage(
  key: string
): void {
  try {
    window.localStorage.removeItem(
      key
    );
  } catch (error) {
    console.warn(
      "Unable to remove localStorage:",
      error
    );
  }
}

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
| Frontend:
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

/*
|--------------------------------------------------------------------------
| PROVIDER
|--------------------------------------------------------------------------
*/

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
  | ACTIVE WORKSPACE STORAGE KEY
  |--------------------------------------------------------------------------
  |
  | PostgreSQL remains the source of
  | truth for workspaces.
  |
  | localStorage is optional and only
  | remembers the selected workspace.
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
        /*
         * User isn't authenticated.
         */
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

          setError(
            null
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
          /*
           * GET /api/workspaces
           */
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
           * NEW ACCOUNT
           *
           * A new account normally has
           * no workspace yet.
           *
           * This is NOT an error.
           */
          if (
            loadedWorkspaces.length ===
            0
          ) {
            setWorkspace(
              null
            );

            /*
             * Clear an old selected
             * workspace if one exists.
             *
             * Storage failure is ignored.
             */
            const storageKey =
              getStorageKey();

            if (
              storageKey
            ) {
              safeRemoveLocalStorage(
                storageKey
              );
            }

            return;
          }

          const storageKey =
            getStorageKey();

          /*
           * Attempt to restore previously
           * selected workspace.
           *
           * If storage isn't available,
           * this safely returns null.
           */
          const storedWorkspaceId =
            storageKey
              ? safeGetLocalStorage(
                  storageKey
                )
              : null;

          /*
           * Look for previously selected
           * workspace.
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
           * workspace, simply select the
           * first workspace returned by
           * the backend.
           */
          const activeWorkspace =
            storedWorkspace ??
            loadedWorkspaces[0];

          setWorkspace(
            activeWorkspace
          );

          /*
           * Remember selection if the
           * browser allows storage.
           */
          if (
            storageKey
          ) {
            safeSetLocalStorage(
              storageKey,
              activeWorkspace.id
            );
          }
        } catch (caughtError) {
          console.error(
            "Failed to load workspaces:",
            caughtError
          );

          setWorkspace(
            null
          );

          setWorkspaces(
            []
          );

          /*
           * During debugging, show the
           * actual error when possible.
           */
          if (
            caughtError instanceof
            Error
          ) {
            setError(
              caughtError.message
            );
          } else {
            setError(
              "Unable to load your workspace."
            );
          }
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
  | AuthContext:
  |
  | GET /api/auth/me
  |
  | Then WorkspaceContext:
  |
  | GET /api/workspaces
  |
  */

  useEffect(
    () => {
      /*
       * Wait until AuthContext finishes
       * checking the current session.
       */
      if (
        isAuthLoading
      ) {
        return;
      }

      /*
       * No logged-in user.
       */
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

        /*
         * Add the new workspace while
         * preventing duplicates.
         */
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

        /*
         * Remember active workspace if
         * storage is available.
         */
        const storageKey =
          getStorageKey();

        if (
          storageKey
        ) {
          safeSetLocalStorage(
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
         * PATCH response may not include
         * existing counts.
         *
         * Preserve the existing counts
         * when necessary.
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

        /*
         * Remember workspace selection
         * only if storage is available.
         */
        const storageKey =
          getStorageKey();

        if (
          storageKey
        ) {
          safeSetLocalStorage(
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
  | This does NOT delete anything from
  | PostgreSQL.
  |
  | It only clears this client's current
  | workspace selection.
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
          safeRemoveLocalStorage(
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
  | CONTEXT VALUE
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

/*
|--------------------------------------------------------------------------
| HOOK
|--------------------------------------------------------------------------
*/

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