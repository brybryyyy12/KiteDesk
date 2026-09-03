import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  useWorkspace,
} from "./WorkspaceContext";

import {
  ApiError,
} from "../lib/api";

import {
  projectService,
  type ApiProject,
  type ApiProjectStatus,
} from "../services/project.service";

export type ProjectStatus =
  | "Planning"
  | "In Progress"
  | "On Hold"
  | "Completed";

export type ProjectMember = {
  /*
   * Actual User UUID.
   *
   * This is what the backend expects
   * when creating a project.
   */
  id: string;

  /*
   * Join-table UUID.
   */
  projectMemberId?: string;

  name: string;

  initials: string;

  email?: string;

  jobTitle?: string | null;

  addedAt?: string;
};

export type Project = {
  id: string;

  workspaceId: string;

  name: string;

  description: string;

  status: ProjectStatus;

  deadline: string | null;

  createdAt: string;

  updatedAt?: string;

  createdById?: string;

  createdBy?: {
    id: string;
    name: string;
  };

  members: ProjectMember[];

  memberCount: number;

  completedTasks: number;

  totalTasks: number;

  archivedAt: string | null;
  archivedById: string | null;
  archivedBy: { id: string; name: string } | null;
};

export type CreateProjectData = {
  name: string;

  description: string;

  status: ProjectStatus;

  deadline: string | null;

  members: ProjectMember[];
};

type ProjectContextType = {
  projects: Project[];
  archivedProjects: Project[];

  /*
   * Kept for compatibility with the
   * existing project pages.
   */
  isLoaded: boolean;

  isLoading: boolean;

  error: string;

  refreshProjects: () =>
    Promise<void>;

  createProject: (
    data: CreateProjectData
  ) => Promise<Project>;

  updateProject: (
    projectId:
      | string
      | number,
    data: Partial<CreateProjectData>
  ) => Promise<Project>;

  deleteProject: (
    projectId:
      | string
      | number
  ) => Promise<void>;
  archiveProject: (projectId: string | number) => Promise<void>;
  restoreProject: (projectId: string | number) => Promise<void>;

  getProject: (
    projectId:
      | string
      | number
  ) => Project | undefined;

  /*
   * Temporary compatibility function.
   *
   * Project task counts now come from
   * PostgreSQL instead of TaskContext.
   */
  setProjectTaskStats: (
    projectId:
      | string
      | number,
    totalTasks: number,
    completedTasks: number
  ) => void;
};

const ProjectContext =
  createContext<ProjectContextType | null>(
    null
  );

type ProjectProviderProps = {
  children: ReactNode;
};

/*
|--------------------------------------------------------------------------
| STATUS MAPPERS
|--------------------------------------------------------------------------
*/

function fromApiStatus(
  status: ApiProjectStatus
): ProjectStatus {
  switch (status) {
    case "PLANNING":
      return "Planning";

    case "IN_PROGRESS":
      return "In Progress";

    case "ON_HOLD":
      return "On Hold";

    case "COMPLETED":
      return "Completed";
  }
}

function toApiStatus(
  status: ProjectStatus
): ApiProjectStatus {
  switch (status) {
    case "Planning":
      return "PLANNING";

    case "In Progress":
      return "IN_PROGRESS";

    case "On Hold":
      return "ON_HOLD";

    case "Completed":
      return "COMPLETED";
  }
}

/*
|--------------------------------------------------------------------------
| INITIALS
|--------------------------------------------------------------------------
*/

function getInitials(
  name: string
) {
  const parts =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length === 0
  ) {
    return "U";
  }

  if (
    parts.length === 1
  ) {
    return (
      parts[0]
        ?.slice(0, 2)
        .toUpperCase() ||
      "U"
    );
  }

  return `${parts[0]?.[0] ?? ""}${
    parts[
      parts.length - 1
    ]?.[0] ?? ""
  }`.toUpperCase();
}

/*
|--------------------------------------------------------------------------
| PROJECT NORMALIZER
|--------------------------------------------------------------------------
*/

function mapApiProject(
  project: ApiProject
): Project {
  return {
    id:
      project.id,

    workspaceId:
      project.workspaceId,

    name:
      project.name,

    description:
      project.description ??
      "",

    status:
      fromApiStatus(
        project.status
      ),

    deadline:
      project.deadline,

    createdAt:
      project.createdAt,

    updatedAt:
      project.updatedAt,

    createdById:
      project.createdById,

    createdBy:
      project.createdBy,

    memberCount:
      project.memberCount,

    completedTasks:
      project.completedTasks,

    totalTasks:
      project.totalTasks,

    archivedAt: project.archivedAt,
    archivedById: project.archivedById,
    archivedBy: project.archivedBy,

    members:
      project.members.map(
        (member) => ({
          /*
           * member.id from the API is
           * the USER ID.
           */
          id:
            member.id,

          projectMemberId:
            member.projectMemberId,

          name:
            member.name,

          initials:
            getInitials(
              member.name
            ),

          email:
            member.email,

          jobTitle:
            member.jobTitle,

          addedAt:
            member.addedAt,
        })
      ),
  };
}

/*
|--------------------------------------------------------------------------
| ERROR MESSAGE
|--------------------------------------------------------------------------
*/

function getErrorMessage(
  error: unknown
) {
  if (
    error instanceof
    ApiError
  ) {
    return error.message;
  }

  if (
    error instanceof
    Error
  ) {
    return error.message;
  }

  return "Something went wrong while loading projects.";
}

export function ProjectProvider({
  children,
}: ProjectProviderProps) {
  const {
    workspace,
  } =
    useWorkspace();

  const [
    projects,
    setProjects,
  ] =
    useState<Project[]>([]);
  const [archivedProjects, setArchivedProjects] = useState<Project[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(false);

  const [
    isLoaded,
    setIsLoaded,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  /*
   * Prevent an older workspace request
   * from replacing projects after the
   * active workspace changes.
   */
  const requestIdRef =
    useRef(0);

  /*
  |--------------------------------------------------------------------------
  | LOAD PROJECTS
  |--------------------------------------------------------------------------
  */

  const refreshProjects =
    useCallback(
      async () => {
        const workspaceId =
          workspace?.id;

        /*
         * No active workspace means
         * there are no projects to load.
         */
        if (
          !workspaceId
        ) {
          requestIdRef.current +=
            1;

          setProjects([]);
          setArchivedProjects([]);

          setError("");

          setIsLoading(
            false
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

        setIsLoaded(
          false
        );

        setError("");

        try {
          const response = await projectService.getAll(workspaceId);
          const archivedResponse = await projectService.getAll(workspaceId, true);

          /*
           * Ignore an outdated response
           * if the workspace changed
           * while it was loading.
           */
          if (
            requestId !==
            requestIdRef.current
          ) {
            return;
          }

          setProjects(
            response.data.projects.map(
              mapApiProject
            )
          );
          setArchivedProjects(archivedResponse.data.projects.map(mapApiProject));
        } catch (error) {
          if (
            requestId !==
            requestIdRef.current
          ) {
            return;
          }

          console.error(
            "Failed to load projects:",
            error
          );

          setProjects([]);
          setArchivedProjects([]);

          setError(
            getErrorMessage(
              error
            )
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
        workspace?.id,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | WORKSPACE CHANGE
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      void refreshProjects();
    },
    [
      refreshProjects,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | CREATE PROJECT
  |--------------------------------------------------------------------------
  */

  const createProject =
    async (
      data: CreateProjectData
    ): Promise<Project> => {
      if (
        !workspace
      ) {
        throw new Error(
          "A workspace is required to create a project."
        );
      }

      const memberIds = [
        ...new Set(
          data.members.map(
            (member) =>
              member.id
          )
        ),
      ];

      const response =
        await projectService.create(
          workspace.id,
          {
            name:
              data.name.trim(),

            description:
              data.description
                .trim() ||
              null,

            status:
              toApiStatus(
                data.status
              ),

            deadline:
              data.deadline,

            memberIds,
          }
        );

      const newProject =
        mapApiProject(
          response.data.project
        );

      /*
       * Backend list ordering is
       * updatedAt DESC, so a newly
       * created project belongs first.
       */
      setProjects(
        (current) => [
          newProject,
          ...current.filter(
            (project) =>
              project.id !==
              newProject.id
          ),
        ]
      );

      return newProject;
    };

  /*
  |--------------------------------------------------------------------------
  | UPDATE PROJECT
  |--------------------------------------------------------------------------
  */

  const updateProject =
    async (
      projectId:
        | string
        | number,
      data: Partial<CreateProjectData>
    ): Promise<Project> => {
      if (
        !workspace
      ) {
        throw new Error(
          "A workspace is required to update a project."
        );
      }

      const id =
        String(
          projectId
        );

      /*
       * The current project PATCH
       * endpoint supports project
       * metadata only.
       *
       * Member management is handled
       * by the separate ProjectMember
       * endpoints and will be connected
       * next.
       */

      const input: {
        name?: string;
        description?:
          | string
          | null;
        status?: ApiProjectStatus;
        deadline?:
          | string
          | null;
      } = {};

      if (
        data.name !==
        undefined
      ) {
        input.name =
          data.name.trim();
      }

      if (
        data.description !==
        undefined
      ) {
        input.description =
          data.description
            .trim() ||
          null;
      }

      if (
        data.status !==
        undefined
      ) {
        input.status =
          toApiStatus(
            data.status
          );
      }

      if (
        data.deadline !==
        undefined
      ) {
        input.deadline =
          data.deadline;
      }

      if (
        Object.keys(
          input
        ).length === 0
      ) {
        const existing =
          projects.find(
            (project) =>
              project.id ===
              id
          );

        if (
          !existing
        ) {
          throw new Error(
            "Project not found."
          );
        }

        return existing;
      }

      const response =
        await projectService.update(
          workspace.id,
          id,
          input
        );

      const updated =
        mapApiProject(
          response.data.project
        );

      setProjects(
        (current) =>
          current.map(
            (project) =>
              project.id ===
              updated.id
                ? updated
                : project
          )
      );

      return updated;
    };

  /*
  |--------------------------------------------------------------------------
  | DELETE PROJECT
  |--------------------------------------------------------------------------
  */

  const deleteProject =
    async (
      projectId:
        | string
        | number
    ): Promise<void> => {
      if (
        !workspace
      ) {
        throw new Error(
          "A workspace is required to delete a project."
        );
      }

      const id =
        String(
          projectId
        );

      await projectService.remove(
        workspace.id,
        id
      );

      setProjects(
        (current) =>
          current.filter(
            (project) =>
              project.id !==
              id
          )
      );
    };

  const archiveProject = async (projectId: string | number) => {
    if (!workspace) throw new Error("A workspace is required to archive a project.");
    await projectService.archive(workspace.id, String(projectId));
    await refreshProjects();
  };

  const restoreProject = async (projectId: string | number) => {
    if (!workspace) throw new Error("A workspace is required to restore a project.");
    await projectService.restore(workspace.id, String(projectId));
    await refreshProjects();
  };

  /*
  |--------------------------------------------------------------------------
  | GET PROJECT
  |--------------------------------------------------------------------------
  */

  const getProject =
    (
      projectId:
        | string
        | number
    ) => {
      const id =
        String(
          projectId
        );

      return [...projects, ...archivedProjects].find(
        (project) =>
          project.id ===
          id
      );
    };

  /*
  |--------------------------------------------------------------------------
  | TASK STATS
  |--------------------------------------------------------------------------
  |
  | TEMPORARY COMPATIBILITY SHIM.
  |
  | The old localStorage architecture
  | allowed TaskContext to push totals
  | into ProjectContext.
  |
  | That is no longer correct.
  |
  | totalTasks / completedTasks are now
  | calculated by PostgreSQL and returned
  | by the Project API.
  |
  | We keep this function temporarily so
  | older TaskContext code can still build
  | while Tasks are migrated next.
  |
  */

  const setProjectTaskStats =
    (
      _projectId:
        | string
        | number,
      _totalTasks: number,
      _completedTasks: number
    ) => {
      /*
       * Intentionally empty.
       *
       * PostgreSQL is now the source
       * of truth for task counts.
       */
    };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        archivedProjects,

        isLoaded,

        isLoading,

        error,

        refreshProjects,

        createProject,

        updateProject,

        deleteProject,
        archiveProject,
        restoreProject,

        getProject,

        setProjectTaskStats,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context =
    useContext(
      ProjectContext
    );

  if (!context) {
    throw new Error(
      "useProjects must be used inside ProjectProvider"
    );
  }

  return context;
}
