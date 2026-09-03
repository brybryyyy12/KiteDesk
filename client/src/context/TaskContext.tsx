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
  useProjects,
  type ProjectMember,
} from "./ProjectContext";

import {
  ApiError,
} from "../lib/api";

import {
  taskService,
  type ApiTaskDetail,
  type ApiTaskListItem,
  type ApiTaskPriority,
  type ApiTaskStatus,
  type ApiTaskType,
} from "../services/task.service";

import {
  commentService,
  type ApiComment,
} from "../services/comment.service";

import {
  attachmentService,
  type ApiAttachment,
} from "../services/attachment.service";

/*
|--------------------------------------------------------------------------
| UI TYPES
|--------------------------------------------------------------------------
*/

export type TaskStatus =
  | "To Do"
  | "In Progress"
  | "Review"
  | "Done";

export type TaskPriority =
  | "Low"
  | "Medium"
  | "High"
  | "Urgent";

export type TaskType =
  | "Task"
  | "Feature"
  | "Bug";

export type TaskLabel = { id: string; name: string; color: string };
export type Subtask = { id: string; projectId: string; title: string; status: TaskStatus; priority: TaskPriority; dueDate: string | null };
export type ChecklistItem = { id: string; title: string; isCompleted: boolean; createdAt: string };

export type TaskComment = {
  id: string;

  authorId: string;

  authorName: string;

  authorInitials: string;

  message: string;

  createdAt: string;

  updatedAt?: string;
};

export type TaskAttachment = {
  id: string;

  name: string;

  size: number;

  mimeType: string;

  uploadedBy: string;

  uploadedById?: string;

  createdAt: string;

  downloadUrl?: string;
};

export type TaskActivity = {
  id: string;

  type?: string;

  actor: string;

  actorId?: string;

  message: string;

  metadata?:
    | unknown
    | null;

  createdAt: string;
};

export type ProjectTask = {
  id: string;

  projectId: string;

  parentTaskId: string | null;

  title: string;

  description: string;

  type: TaskType;

  priority:
    TaskPriority;

  status:
    TaskStatus;

  assignee:
    ProjectMember | null;

  dueDate:
    | string
    | null;

  createdAt: string;

  updatedAt?: string;

  createdBy: string;

  createdById?: string;

  commentCount: number;

  attachmentCount: number;

  comments:
    TaskComment[];

  attachments:
    TaskAttachment[];

  activity:
    TaskActivity[];

  labels: TaskLabel[];

  subtasks: Subtask[];

  checklistItems: ChecklistItem[];
};

export type CreateTaskData = {
  projectId:
    | string
    | number;

  title: string;

  description: string;

  type: TaskType;

  priority:
    TaskPriority;

  status?: TaskStatus;

  assignee:
    ProjectMember | null;

  dueDate:
    | string
    | null;

  createdBy?: string;
};

/*
|--------------------------------------------------------------------------
| CONTEXT
|--------------------------------------------------------------------------
*/

type TaskContextType = {
  tasks:
    ProjectTask[];

  isLoaded:
    boolean;

  isLoading:
    boolean;

  error:
    string;

  refreshTasks: () =>
    Promise<void>;

  refreshProjectTasks: (
    projectId:
      | string
      | number
  ) => Promise<void>;

  refreshTask: (
    taskId:
      | string
      | number,
    projectId?:
      | string
      | number
  ) => Promise<ProjectTask>;

  createTask: (
    data:
      CreateTaskData
  ) => Promise<ProjectTask>;

  updateTask: (
    taskId:
      | string
      | number,
    data:
      Partial<ProjectTask>,
    actor?: string
  ) => Promise<ProjectTask>;

  updateTaskStatus: (
    taskId:
      | string
      | number,
    status:
      TaskStatus,
    feedback?:
      string
  ) => Promise<ProjectTask>;

  deleteTask: (
    taskId:
      | string
      | number
  ) => Promise<void>;

  addComment: (
    taskId:
      | string
      | number,
    content: string
  ) => Promise<TaskComment>;

  addAttachment: (
    taskId:
      | string
      | number,
    file: File
  ) => Promise<TaskAttachment>;

  downloadAttachment: (
    taskId:
      | string
      | number,
    attachmentId:
      string,
    fileName:
      string
  ) => Promise<void>;

  getTask: (
    taskId:
      | string
      | number
  ) =>
    | ProjectTask
    | undefined;

  getTasksByProject: (
    projectId:
      | string
      | number
  ) => ProjectTask[];
};

const TaskContext =
  createContext<TaskContextType | null>(
    null
  );

type TaskProviderProps = {
  children:
    ReactNode;
};

/*
|--------------------------------------------------------------------------
| HELPERS
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
    parts.length ===
    0
  ) {
    return "U";
  }

  if (
    parts.length ===
    1
  ) {
    return (
      parts[0]
        ?.slice(
          0,
          2
        )
        .toUpperCase() ??
      "U"
    );
  }

  return `${parts[0]?.[0] ?? ""}${
    parts[
      parts.length -
        1
    ]?.[0] ?? ""
  }`.toUpperCase();
}

/*
|--------------------------------------------------------------------------
| STATUS
|--------------------------------------------------------------------------
*/

function fromApiStatus(
  status:
    ApiTaskStatus
): TaskStatus {
  switch (
    status
  ) {
    case "TODO":
      return "To Do";

    case "IN_PROGRESS":
      return "In Progress";

    case "REVIEW":
      return "Review";

    case "DONE":
      return "Done";
  }
}

function toApiStatus(
  status:
    TaskStatus
): ApiTaskStatus {
  switch (
    status
  ) {
    case "To Do":
      return "TODO";

    case "In Progress":
      return "IN_PROGRESS";

    case "Review":
      return "REVIEW";

    case "Done":
      return "DONE";
  }
}

/*
|--------------------------------------------------------------------------
| PRIORITY
|--------------------------------------------------------------------------
*/

function fromApiPriority(
  priority:
    ApiTaskPriority
): TaskPriority {
  switch (
    priority
  ) {
    case "LOW":
      return "Low";

    case "MEDIUM":
      return "Medium";

    case "HIGH":
      return "High";

    case "URGENT":
      return "Urgent";
  }
}

function toApiPriority(
  priority:
    TaskPriority
): ApiTaskPriority {
  switch (
    priority
  ) {
    case "Low":
      return "LOW";

    case "Medium":
      return "MEDIUM";

    case "High":
      return "HIGH";

    case "Urgent":
      return "URGENT";
  }
}

/*
|--------------------------------------------------------------------------
| TYPE
|--------------------------------------------------------------------------
*/

function fromApiType(
  type:
    ApiTaskType
): TaskType {
  switch (
    type
  ) {
    case "TASK":
      return "Task";

    case "FEATURE":
      return "Feature";

    case "BUG":
      return "Bug";
  }
}

function toApiType(
  type:
    TaskType
): ApiTaskType {
  switch (
    type
  ) {
    case "Task":
      return "TASK";

    case "Feature":
      return "FEATURE";

    case "Bug":
      return "BUG";
  }
}

/*
|--------------------------------------------------------------------------
| MEMBER
|--------------------------------------------------------------------------
*/

function mapAssignee(
  assignee:
    ApiTaskListItem["assignee"]
): ProjectMember | null {
  if (!assignee) {
    return null;
  }

  return {
    id:
      assignee.id,

    name:
      assignee.name,

    initials:
      getInitials(
        assignee.name
      ),

    email:
      assignee.email,

    jobTitle:
      assignee.jobTitle,
  };
}

/*
|--------------------------------------------------------------------------
| COMMENT
|--------------------------------------------------------------------------
*/

function mapComment(
  comment:
    ApiComment
): TaskComment {
  return {
    id:
      comment.id,

    authorId:
      comment.author.id,

    authorName:
      comment.author.name,

    authorInitials:
      getInitials(
        comment.author.name
      ),

    message:
      comment.content,

    createdAt:
      comment.createdAt,

    updatedAt:
      comment.updatedAt,
  };
}

/*
|--------------------------------------------------------------------------
| ATTACHMENT
|--------------------------------------------------------------------------
*/

function mapAttachment(
  attachment:
    ApiAttachment
): TaskAttachment {
  return {
    id:
      attachment.id,

    name:
      attachment.fileName,

    size:
      attachment.fileSize,

    mimeType:
      attachment.mimeType,

    uploadedBy:
      attachment.uploadedBy.name,

    uploadedById:
      attachment.uploadedBy.id,

    createdAt:
      attachment.createdAt,

    downloadUrl:
      attachment.downloadUrl,
  };
}

/*
|--------------------------------------------------------------------------
| LIST TASK
|--------------------------------------------------------------------------
*/

function mapListTask(
  task:
    ApiTaskListItem
): ProjectTask {
  return {
    id:
      task.id,

    projectId:
      task.projectId,

    parentTaskId: null,

    title:
      task.title,

    description:
      task.description ??
      "",

    type:
      fromApiType(
        task.type
      ),

    priority:
      fromApiPriority(
        task.priority
      ),

    status:
      fromApiStatus(
        task.status
      ),

    assignee:
      mapAssignee(
        task.assignee
      ),

    dueDate:
      task.dueDate,

    createdAt:
      task.createdAt,

    updatedAt:
      task.updatedAt,

    createdBy:
      task.createdBy.name,

    createdById:
      task.createdBy.id,

    commentCount:
      task.commentCount,

    attachmentCount:
      task.attachmentCount,

    comments: [],

    attachments: [],

    activity: [],

    labels: task.labels,

    subtasks: [],

    checklistItems: [],
  };
}

/*
|--------------------------------------------------------------------------
| DETAILED TASK
|--------------------------------------------------------------------------
*/

function mapDetailedTask(
  task:
    ApiTaskDetail
): ProjectTask {
  return {
    id:
      task.id,

    projectId:
      task.projectId,

    parentTaskId: task.parentTaskId,

    title:
      task.title,

    description:
      task.description ??
      "",

    type:
      fromApiType(
        task.type
      ),

    priority:
      fromApiPriority(
        task.priority
      ),

    status:
      fromApiStatus(
        task.status
      ),

    assignee:
      mapAssignee(
        task.assignee
      ),

    dueDate:
      task.dueDate,

    createdAt:
      task.createdAt,

    updatedAt:
      task.updatedAt,

    createdBy:
      task.createdBy.name,

    createdById:
      task.createdBy.id,

    commentCount:
      task.comments.length,

    attachmentCount:
      task.attachments.length,

    comments:
      task.comments.map(
        (comment) => ({
          id:
            comment.id,

          authorId:
            comment.author.id,

          authorName:
            comment.author.name,

          authorInitials:
            getInitials(
              comment.author.name
            ),

          message:
            comment.content,

          createdAt:
            comment.createdAt,

          updatedAt:
            comment.updatedAt,
        })
      ),

    /*
     * Task detail currently gives us
     * the internal file metadata.
     *
     * Downloads are done using
     * attachmentService.download(),
     * so we intentionally do not use
     * the internal fileUrl here.
     */
    attachments:
      task.attachments.map(
        (
          attachment
        ) => ({
          id:
            attachment.id,

          name:
            attachment.fileName,

          size:
            attachment.fileSize,

          mimeType:
            attachment.mimeType,

          uploadedBy:
            attachment.uploadedBy.name,

          uploadedById:
            attachment.uploadedBy.id,

          createdAt:
            attachment.createdAt,
        })
      ),

    activity:
      task.activity.map(
        (
          activity
        ) => ({
          id:
            activity.id,

          type:
            activity.type,

          actor:
            activity.actor?.name ??
            "System",

          actorId:
            activity.actor?.id,

          message:
            activity.message,

          metadata:
            activity.metadata,

          createdAt:
            activity.createdAt,
        })
      ),

    labels: task.labels,

    subtasks: task.subtasks.map((subtask) => ({ ...subtask, status: fromApiStatus(subtask.status), priority: fromApiPriority(subtask.priority) })),

    checklistItems: task.checklistItems,
  };
}

function getErrorMessage(
  error:
    unknown
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

  return "Something went wrong while loading tasks.";
}

/*
|--------------------------------------------------------------------------
| PROVIDER
|--------------------------------------------------------------------------
*/

export function TaskProvider({
  children,
}: TaskProviderProps) {
  const {
    workspace,
  } =
    useWorkspace();

  const {
    projects,
    isLoaded:
      projectsLoaded,
    refreshProjects,
  } =
    useProjects();

  const [
    tasks,
    setTasks,
  ] =
    useState<ProjectTask[]>(
      []
    );

  const [
    isLoaded,
    setIsLoaded,
  ] =
    useState(false);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const requestIdRef =
    useRef(0);

  /*
  |--------------------------------------------------------------------------
  | REFRESH PROJECT COUNTS
  |--------------------------------------------------------------------------
  */

  const refreshProjectCounts =
    useCallback(
      async () => {
        try {
          await refreshProjects();
        } catch (
          error
        ) {
          console.error(
            "Failed to refresh project counts:",
            error
          );
        }
      },
      [
        refreshProjects,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | LOAD ALL TASKS
  |--------------------------------------------------------------------------
  */

  const refreshTasks =
    useCallback(
      async () => {
        const workspaceId =
          workspace?.id;

        if (
          !workspaceId
        ) {
          requestIdRef.current +=
            1;

          setTasks(
            []
          );

          setError(
            ""
          );

          setIsLoading(
            false
          );

          setIsLoaded(
            true
          );

          return;
        }

        if (
          !projectsLoaded
        ) {
          setIsLoaded(
            false
          );

          return;
        }

        if (
          projects.length ===
          0
        ) {
          requestIdRef.current +=
            1;

          setTasks(
            []
          );

          setError(
            ""
          );

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

        setError(
          ""
        );

        try {
          const results =
            await Promise.allSettled(
              projects.map(
                (
                  project
                ) =>
                  taskService.getAll(
                    workspaceId,
                    project.id
                  )
              )
            );

          if (
            requestId !==
            requestIdRef.current
          ) {
            return;
          }

          const loadedTasks:
            ProjectTask[] =
            [];

          let failedRequests =
            0;

          for (
            const result of
            results
          ) {
            if (
              result.status ===
              "fulfilled"
            ) {
              loadedTasks.push(
                ...result.value.data.tasks.map(
                  mapListTask
                )
              );
            } else {
              failedRequests +=
                1;

              console.error(
                "Failed to load project tasks:",
                result.reason
              );
            }
          }

          const unique =
            new Map<
              string,
              ProjectTask
            >();

          loadedTasks.forEach(
            (
              task
            ) => {
              unique.set(
                task.id,
                task
              );
            }
          );

          setTasks(
            Array.from(
              unique.values()
            )
          );

          if (
            failedRequests >
            0
          ) {
            setError(
              "Some project tasks could not be loaded."
            );
          }
        } catch (
          error
        ) {
          if (
            requestId !==
            requestIdRef.current
          ) {
            return;
          }

          console.error(
            "Failed to load tasks:",
            error
          );

          setTasks(
            []
          );

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
        projects,
        projectsLoaded,
      ]
    );

  useEffect(
    () => {
      void refreshTasks();
    },
    [
      refreshTasks,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | REPLACE ONE TASK
  |--------------------------------------------------------------------------
  */

  const replaceTask =
    (
      detailed:
        ProjectTask
    ) => {
      setTasks(
        (
          current
        ) => {
          const exists =
            current.some(
              (
                task
              ) =>
                task.id ===
                detailed.id
            );

          if (
            !exists
          ) {
            return [
              detailed,
              ...current,
            ];
          }

          return current.map(
            (
              task
            ) =>
              task.id ===
              detailed.id
                ? detailed
                : task
          );
        }
      );
    };

  /*
  |--------------------------------------------------------------------------
  | REFRESH PROJECT TASKS
  |--------------------------------------------------------------------------
  */

  const refreshProjectTasks =
    async (
      projectId:
        | string
        | number
    ) => {
      if (
        !workspace
      ) {
        return;
      }

      const id =
        String(
          projectId
        );

      const response =
        await taskService.getAll(
          workspace.id,
          id
        );

      const projectTasks =
        response.data.tasks.map(
          mapListTask
        );

      setTasks(
        (
          current
        ) => [
          ...current.filter(
            (
              task
            ) =>
              task.projectId !==
              id
          ),

          ...projectTasks,
        ]
      );
    };

  /*
  |--------------------------------------------------------------------------
  | REFRESH ONE TASK
  |--------------------------------------------------------------------------
  */

  const refreshTask =
    async (
      taskId:
        | string
        | number,
      projectId?:
        | string
        | number
    ): Promise<ProjectTask> => {
      if (
        !workspace
      ) {
        throw new Error(
          "A workspace is required to load a task."
        );
      }

      const id =
        String(
          taskId
        );

      const knownTask =
        tasks.find(
          (
            task
          ) =>
            task.id ===
            id
        );

      const resolvedProjectId =
        projectId !==
        undefined
          ? String(
              projectId
            )
          : knownTask
              ?.projectId;

      if (
        !resolvedProjectId
      ) {
        throw new Error(
          "Unable to determine which project this task belongs to."
        );
      }

      const response =
        await taskService.getById(
          workspace.id,
          resolvedProjectId,
          id
        );

      const detailed =
        mapDetailedTask(
          response.data.task
        );

      replaceTask(
        detailed
      );

      return detailed;
    };

  /*
  |--------------------------------------------------------------------------
  | CREATE
  |--------------------------------------------------------------------------
  */

  const createTask =
    async (
      data:
        CreateTaskData
    ): Promise<ProjectTask> => {
      if (
        !workspace
      ) {
        throw new Error(
          "A workspace is required to create a task."
        );
      }

      const projectId =
        String(
          data.projectId
        );

      const response =
        await taskService.create(
          workspace.id,
          projectId,
          {
            title:
              data.title.trim(),

            description:
              data.description.trim() ||
              null,

            type:
              toApiType(
                data.type
              ),

            priority:
              toApiPriority(
                data.priority
              ),

            assigneeId:
              data.assignee?.id ??
              null,

            dueDate:
              data.dueDate,
          }
        );

      const created =
        mapDetailedTask(
          response.data.task
        );

      setTasks(
        (
          current
        ) => [
          created,

          ...current.filter(
            (
              task
            ) =>
              task.id !==
              created.id
          ),
        ]
      );

      void refreshProjectCounts();

      return created;
    };

  /*
  |--------------------------------------------------------------------------
  | UPDATE DETAILS
  |--------------------------------------------------------------------------
  */

  const updateTask =
    async (
      taskId:
        | string
        | number,
      data:
        Partial<ProjectTask>,
      _actor?: string
    ): Promise<ProjectTask> => {
      if (
        !workspace
      ) {
        throw new Error(
          "A workspace is required to update a task."
        );
      }

      const id =
        String(
          taskId
        );

      const existing =
        tasks.find(
          (
            task
          ) =>
            task.id ===
            id
        );

      if (
        !existing
      ) {
        throw new Error(
          "Task not found."
        );
      }

      let updated =
        existing;

      const detailsInput: {
        title?: string;
        description?:
          | string
          | null;
        type?:
          ApiTaskType;
        priority?:
          ApiTaskPriority;
        assigneeId?:
          | string
          | null;
        dueDate?:
          | string
          | null;
        labelIds?: string[];
      } = {};

      if (
        data.title !==
        undefined
      ) {
        detailsInput.title =
          data.title.trim();
      }

      if (
        data.description !==
        undefined
      ) {
        detailsInput.description =
          data.description.trim() ||
          null;
      }

      if (
        data.type !==
        undefined
      ) {
        detailsInput.type =
          toApiType(
            data.type
          );
      }

      if (
        data.priority !==
        undefined
      ) {
        detailsInput.priority =
          toApiPriority(
            data.priority
          );
      }

      if (
        data.assignee !==
        undefined
      ) {
        detailsInput.assigneeId =
          data.assignee?.id ??
          null;
      }

      if (
        data.dueDate !==
        undefined
      ) {
        detailsInput.dueDate =
          data.dueDate;
      }

      if (data.labels !== undefined) {
        detailsInput.labelIds = data.labels.map((label) => label.id);
      }

      if (
        Object.keys(
          detailsInput
        ).length >
        0
      ) {
        const response =
          await taskService.update(
            workspace.id,
            existing.projectId,
            existing.id,
            detailsInput
          );

        updated =
          mapDetailedTask(
            response.data.task
          );
      }

      if (
        data.status !==
          undefined &&
        data.status !==
          updated.status
      ) {
        const response =
          await taskService.updateStatus(
            workspace.id,
            updated.projectId,
            updated.id,
            {
              status:
                toApiStatus(
                  data.status
                ),
            }
          );

        updated =
          mapDetailedTask(
            response.data.task
          );
      }

      replaceTask(
        updated
      );

      if (
        data.status !==
        undefined
      ) {
        void refreshProjectCounts();
      }

      return updated;
    };

  /*
  |--------------------------------------------------------------------------
  | STATUS
  |--------------------------------------------------------------------------
  */

  const updateTaskStatus =
    async (
      taskId:
        | string
        | number,
      status:
        TaskStatus,
      feedback?:
        string
    ): Promise<ProjectTask> => {
      if (
        !workspace
      ) {
        throw new Error(
          "A workspace is required to update a task."
        );
      }

      const id =
        String(
          taskId
        );

      const existing =
        tasks.find(
          (
            task
          ) =>
            task.id ===
            id
        );

      if (
        !existing
      ) {
        throw new Error(
          "Task not found."
        );
      }

      const response =
        await taskService.updateStatus(
          workspace.id,
          existing.projectId,
          existing.id,
          {
            status:
              toApiStatus(
                status
              ),

            feedback:
              feedback?.trim() ||
              null,
          }
        );

      const updated =
        mapDetailedTask(
          response.data.task
        );

      replaceTask(
        updated
      );

      void refreshProjectCounts();

      return updated;
    };

  /*
  |--------------------------------------------------------------------------
  | DELETE
  |--------------------------------------------------------------------------
  */

  const deleteTask =
    async (
      taskId:
        | string
        | number
    ) => {
      if (
        !workspace
      ) {
        throw new Error(
          "A workspace is required to delete a task."
        );
      }

      const id =
        String(
          taskId
        );

      const existing =
        tasks.find(
          (
            task
          ) =>
            task.id ===
            id
        );

      if (
        !existing
      ) {
        throw new Error(
          "Task not found."
        );
      }

      await taskService.remove(
        workspace.id,
        existing.projectId,
        existing.id
      );

      setTasks(
        (
          current
        ) =>
          current.filter(
            (
              task
            ) =>
              task.id !==
              existing.id
          )
      );

      void refreshProjectCounts();
    };

  /*
  |--------------------------------------------------------------------------
  | ADD COMMENT
  |--------------------------------------------------------------------------
  */

  const addComment =
    async (
      taskId:
        | string
        | number,
      content:
        string
    ): Promise<TaskComment> => {
      if (
        !workspace
      ) {
        throw new Error(
          "A workspace is required to add a comment."
        );
      }

      const id =
        String(
          taskId
        );

      const existing =
        tasks.find(
          (
            task
          ) =>
            task.id ===
            id
        );

      if (
        !existing
      ) {
        throw new Error(
          "Task not found."
        );
      }

      const message =
        content.trim();

      if (
        !message
      ) {
        throw new Error(
          "Comment cannot be empty."
        );
      }

      const response =
        await commentService.create(
          workspace.id,
          existing.projectId,
          existing.id,
          message
        );

      const createdComment =
        mapComment(
          response.data.comment
        );

      /*
       * Reload the detailed task.
       *
       * This also retrieves the
       * COMMENT_ADDED ActivityLog
       * generated by the backend.
       */
      await refreshTask(
        existing.id,
        existing.projectId
      );

      return createdComment;
    };

  /*
  |--------------------------------------------------------------------------
  | ADD ATTACHMENT
  |--------------------------------------------------------------------------
  */

  const addAttachment =
    async (
      taskId:
        | string
        | number,
      file:
        File
    ): Promise<TaskAttachment> => {
      if (
        !workspace
      ) {
        throw new Error(
          "A workspace is required to upload an attachment."
        );
      }

      const id =
        String(
          taskId
        );

      const existing =
        tasks.find(
          (
            task
          ) =>
            task.id ===
            id
        );

      if (
        !existing
      ) {
        throw new Error(
          "Task not found."
        );
      }

      const response =
        await attachmentService.upload(
          workspace.id,
          existing.projectId,
          existing.id,
          file
        );

      const attachment =
        mapAttachment(
          response.data.attachment
        );

      /*
       * Reload details so:
       *
       * - attachment persists in UI
       * - attachment count updates
       * - ATTACHMENT_ADDED activity
       *   appears immediately
       */
      await refreshTask(
        existing.id,
        existing.projectId
      );

      return attachment;
    };

  /*
  |--------------------------------------------------------------------------
  | DOWNLOAD
  |--------------------------------------------------------------------------
  */

  const downloadAttachment =
    async (
      taskId:
        | string
        | number,
      attachmentId:
        string,
      fileName:
        string
    ) => {
      if (
        !workspace
      ) {
        throw new Error(
          "A workspace is required to download an attachment."
        );
      }

      const id =
        String(
          taskId
        );

      const existing =
        tasks.find(
          (
            task
          ) =>
            task.id ===
            id
        );

      if (
        !existing
      ) {
        throw new Error(
          "Task not found."
        );
      }

      await attachmentService.download(
        workspace.id,
        existing.projectId,
        existing.id,
        attachmentId,
        fileName
      );
    };

  /*
  |--------------------------------------------------------------------------
  | GETTERS
  |--------------------------------------------------------------------------
  */

  const getTask =
    (
      taskId:
        | string
        | number
    ) => {
      const id =
        String(
          taskId
        );

      return tasks.find(
        (
          task
        ) =>
          task.id ===
          id
      );
    };

  const getTasksByProject =
    (
      projectId:
        | string
        | number
    ) => {
      const id =
        String(
          projectId
        );

      return tasks.filter(
        (
          task
        ) =>
          task.projectId ===
          id
      );
    };

  return (
    <TaskContext.Provider
      value={{
        tasks,

        isLoaded,

        isLoading,

        error,

        refreshTasks,

        refreshProjectTasks,

        refreshTask,

        createTask,

        updateTask,

        updateTaskStatus,

        deleteTask,

        addComment,

        addAttachment,

        downloadAttachment,

        getTask,

        getTasksByProject,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context =
    useContext(
      TaskContext
    );

  if (!context) {
    throw new Error(
      "useTasks must be used inside TaskProvider"
    );
  }

  return context;
}
