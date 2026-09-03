import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router";

import {
  useProjects,
  type ProjectMember,
} from "../../context/ProjectContext";

import {
  useTasks,
  type TaskPriority,
  type TaskStatus,
  type TaskType,
} from "../../context/TaskContext";

import {
  useWorkspace,
} from "../../context/WorkspaceContext";

import {
  useAuth,
} from "../../context/AuthContext";

import {
  hasPermission,
} from "../../lib/permissions";
import { labelService, type ApiLabel } from "../../services/label.service";
import { taskService } from "../../services/task.service";

const statuses: TaskStatus[] = [
  "To Do",
  "In Progress",
  "Review",
  "Done",
];

const priorities: TaskPriority[] = [
  "Low",
  "Medium",
  "High",
  "Urgent",
];

const taskTypes: TaskType[] = [
  "Task",
  "Feature",
  "Bug",
];

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
        .toUpperCase() ??
      "U"
    );
  }

  return `${parts[0]?.[0] ?? ""}${
    parts[
      parts.length - 1
    ]?.[0] ?? ""
  }`.toUpperCase();
}

function getErrorMessage(
  error: unknown
) {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return "Something went wrong.";
}

function TaskDetailsPage() {
  const {
    projectId,
    taskId,
  } =
    useParams();

  const navigate =
    useNavigate();

  const {
    workspace,
  } =
    useWorkspace();

  const {
    user,
  } =
    useAuth();

  const {
    getProject,
    isLoaded:
      projectsLoaded,
  } =
    useProjects();

  const {
    getTask,
    refreshTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    addComment,
    addAttachment,
    downloadAttachment,
    isLoaded:
      tasksLoaded,
  } =
    useTasks();

  /*
  |--------------------------------------------------------------------------
  | UUID LOOKUP
  |--------------------------------------------------------------------------
  */

  const project =
    projectId
      ? getProject(
          projectId
        )
      : undefined;

  const task =
    taskId
      ? getTask(
          taskId
        )
      : undefined;

  /*
  |--------------------------------------------------------------------------
  | PERMISSIONS
  |--------------------------------------------------------------------------
  */

  const role =
    workspace?.role ??
    "Member";

  const canEditAnyTask =
    hasPermission(
      role,
      "editAnyTask"
    ) && !project?.archivedAt;

  const [availableLabels, setAvailableLabels] = useState<ApiLabel[]>([]);
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [labelError, setLabelError] = useState("");
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#6E94B0");
  const [deletingLabelId, setDeletingLabelId] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [structureBusy, setStructureBusy] = useState(false);
  const [structureError, setStructureError] = useState("");

  const canManageChecklist =
    !project?.archivedAt && (canEditAnyTask ||
    Boolean(
      task &&
      (
        task.parentTaskId !== null ||
        (user && task.assignee?.id === user.id)
      )
    ));

  useEffect(() => {
    if (!workspace) {
      setAvailableLabels([]);
      return;
    }

    let active = true;
    setLabelsLoading(true);
    labelService.getAll(workspace.id)
      .then((response) => {
        if (active) setAvailableLabels(response.data.labels);
      })
      .catch((error) => {
        if (active) setLabelError(error instanceof Error ? error.message : "Unable to load labels.");
      })
      .finally(() => {
        if (active) setLabelsLoading(false);
      });

    return () => { active = false; };
  }, [workspace?.id]);

  const toggleLabel = async (label: ApiLabel) => {
    if (!task) return;
    setLabelError("");
    const selected = task.labels.some((item) => item.id === label.id);
    try {
      await updateTask(task.id, {
        labels: selected
          ? task.labels.filter((item) => item.id !== label.id)
          : [...task.labels, label],
      });
    } catch (error) {
      setLabelError(error instanceof Error ? error.message : "Unable to update labels.");
    }
  };

  const createLabel = async () => {
    if (!workspace || !newLabelName.trim()) return;
    setLabelError("");
    try {
      const response = await labelService.create(workspace.id, {
        name: newLabelName.trim(),
        color: newLabelColor,
      });
      setAvailableLabels((current) => [...current, response.data.label].sort((a, b) => a.name.localeCompare(b.name)));
      setNewLabelName("");
    } catch (error) {
      setLabelError(error instanceof Error ? error.message : "Unable to create label.");
    }
  };

  const deleteLabel = async (label: ApiLabel) => {
    if (!workspace || !task) return;

    const confirmed = window.confirm(
      `Delete the label "${label.name}"? It will be removed from every task in this workspace.`
    );

    if (!confirmed) return;

    setDeletingLabelId(label.id);
    setLabelError("");

    try {
      await labelService.remove(workspace.id, label.id);
      setAvailableLabels((current) => current.filter((item) => item.id !== label.id));
      await refreshTask(task.id, task.projectId);
    } catch (error) {
      setLabelError(error instanceof Error ? error.message : "Unable to delete label.");
    } finally {
      setDeletingLabelId(null);
    }
  };

  const addSubtask = async () => {
    if (!workspace || !task || !newSubtaskTitle.trim()) return;
    setStructureBusy(true); setStructureError("");
    try {
      await taskService.createSubtask(workspace.id, task.projectId, task.id, newSubtaskTitle.trim());
      setNewSubtaskTitle("");
      await refreshTask(task.id, task.projectId);
    } catch (error) { setStructureError(error instanceof Error ? error.message : "Unable to add subtask."); }
    finally { setStructureBusy(false); }
  };

  const addChecklistItem = async () => {
    if (!workspace || !task || !newChecklistTitle.trim()) return;
    setStructureBusy(true); setStructureError("");
    try {
      await taskService.createChecklistItem(workspace.id, task.projectId, task.id, newChecklistTitle.trim());
      setNewChecklistTitle("");
      await refreshTask(task.id, task.projectId);
    } catch (error) { setStructureError(error instanceof Error ? error.message : "Unable to add checklist item."); }
    finally { setStructureBusy(false); }
  };

  const toggleChecklistItem = async (itemId: string, isCompleted: boolean) => {
    if (!workspace || !task) return;
    setStructureError("");
    try {
      await taskService.updateChecklistItem(workspace.id, task.projectId, task.id, itemId, isCompleted);
      await refreshTask(task.id, task.projectId);
    } catch (error) { setStructureError(error instanceof Error ? error.message : "Unable to update checklist."); }
  };

  const removeChecklistItem = async (itemId: string) => {
    if (!workspace || !task || !window.confirm("Delete this checklist item?")) return;
    try {
      await taskService.deleteChecklistItem(workspace.id, task.projectId, task.id, itemId);
      await refreshTask(task.id, task.projectId);
    } catch (error) { setStructureError(error instanceof Error ? error.message : "Unable to delete checklist item."); }
  };

  const canDeleteTask =
    hasPermission(
      role,
      "deleteTask"
    ) && !project?.archivedAt;

  const canReviewTask =
    hasPermission(
      role,
      "reviewTask"
    ) && !project?.archivedAt;

  const canAssignTask =
    hasPermission(
      role,
      "assignTask"
    ) && !project?.archivedAt;

  const canUpdateOwnTask =
    Boolean(
      task &&
      user &&
      hasPermission(
        role,
        "updateOwnTask"
      ) &&
      task.assignee?.id ===
        user.id &&
      !project?.archivedAt
    );

  const canUpdateStatus =
    canEditAnyTask ||
    canUpdateOwnTask;

  const currentUserInitials =
    getInitials(
      user?.name ??
        "User"
    );

  /*
  |--------------------------------------------------------------------------
  | LOAD FULL TASK
  |--------------------------------------------------------------------------
  */

  const refreshTaskRef =
    useRef(
      refreshTask
    );

  useEffect(
    () => {
      refreshTaskRef.current =
        refreshTask;
    },
    [
      refreshTask,
    ]
  );

  const [
    detailLoading,
    setDetailLoading,
  ] =
    useState(false);

  const [
    detailError,
    setDetailError,
  ] =
    useState("");

  useEffect(
    () => {
      if (
        !projectId ||
        !taskId ||
        !projectsLoaded ||
        !tasksLoaded
      ) {
        return;
      }

      let cancelled =
        false;

      const load =
        async () => {
          setDetailLoading(
            true
          );

          setDetailError(
            ""
          );

          try {
            await refreshTaskRef.current(
              taskId,
              projectId
            );
          } catch (
            error
          ) {
            if (
              cancelled
            ) {
              return;
            }

            console.error(
              "Failed to load task details:",
              error
            );

            setDetailError(
              getErrorMessage(
                error
              )
            );
          } finally {
            if (
              !cancelled
            ) {
              setDetailLoading(
                false
              );
            }
          }
        };

      void load();

      return () => {
        cancelled =
          true;
      };
    },
    [
      projectId,
      taskId,
      projectsLoaded,
      tasksLoaded,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | LOCAL STATE
  |--------------------------------------------------------------------------
  */

  const [
    comment,
    setComment,
  ] =
    useState("");

  const [
    commentError,
    setCommentError,
  ] =
    useState("");

  const [
    commentSubmitting,
    setCommentSubmitting,
  ] =
    useState(false);

  const [
    attachmentError,
    setAttachmentError,
  ] =
    useState("");

  const [
    attachmentUploading,
    setAttachmentUploading,
  ] =
    useState(false);

  const [
    downloadingAttachmentId,
    setDownloadingAttachmentId,
  ] =
    useState<
      string | null
    >(null);

  const [
    reviewFeedback,
    setReviewFeedback,
  ] =
    useState("");

  const [
    actionError,
    setActionError,
  ] =
    useState("");

  const [
    updatingField,
    setUpdatingField,
  ] =
    useState<
      string | null
    >(null);

  const [
    deleting,
    setDeleting,
  ] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | ACTIVITY
  |--------------------------------------------------------------------------
  */

  const taskActivity =
    useMemo(
      () =>
        task?.activity ??
        [],
      [
        task?.activity,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  const loading =
    !projectsLoaded ||
    !tasksLoaded ||
    detailLoading;

  if (
    loading &&
    !task
  ) {
    return (
      <div className="mx-auto max-w-[1400px]">

        <div className="animate-pulse space-y-4 sm:space-y-5">

          <div className="h-4 w-44 rounded bg-kite-line sm:h-5 sm:w-64" />

          <div className="h-8 w-72 max-w-full rounded-xl bg-kite-line sm:h-10 sm:w-96" />

          {/* MOBILE DETAILS */}
          <div className="h-80 rounded-2xl bg-white xl:hidden" />

          <div className="grid gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">

            <div className="h-[440px] rounded-2xl bg-white sm:h-[500px]" />

            <div className="hidden h-[500px] rounded-2xl bg-white xl:block" />

          </div>

        </div>

      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | NOT FOUND
  |--------------------------------------------------------------------------
  */

  if (
    !projectId ||
    !taskId ||
    !project ||
    !task ||
    task.projectId !==
      project.id
  ) {
    return (
      <div className="mx-auto max-w-[1400px]">

        <section className="rounded-2xl border border-kite-line bg-white px-5 py-12 text-center sm:px-6 sm:py-16">

          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-kite-soft text-kite-muted sm:h-16 sm:w-16">

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-7 w-7 sm:h-8 sm:w-8"
              aria-hidden="true"
            >
              <path d="M8 6h8M8 10h8M8 14h5" />

              <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
            </svg>

          </div>

          <h1 className="mt-5 text-xl font-semibold text-kite-ink sm:text-2xl">
            Task not found
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-kite-muted">
            This task may have been removed or doesn&apos;t belong to this project.
          </p>

          {detailError && (
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-red-500">
              {
                detailError
              }
            </p>
          )}

          <Link
            to="/projects"
            className="mt-6 inline-flex rounded-xl bg-kite-blue-deep px-5 py-3 text-sm font-medium text-white transition hover:brightness-95"
          >
            Back to Projects
          </Link>

        </section>

      </div>
    );
  }

  const taskCode =
    `TASK-${task.id
      .replaceAll(
        "-",
        ""
      )
      .slice(
        -6
      )
      .toUpperCase()}`;

  /*
  |--------------------------------------------------------------------------
  | STATUS OPTIONS
  |--------------------------------------------------------------------------
  */

  const allowedStatuses =
    (): TaskStatus[] => {
      if (
        canEditAnyTask
      ) {
        switch (
          task.status
        ) {
          case "To Do":
            return [
              "To Do",
              "In Progress",
            ];

          case "In Progress":
            return [
              "To Do",
              "In Progress",
              "Review",
            ];

          /*
           * Review actions use the
           * dedicated review controls.
           */
          case "Review":
            return [
              "Review",
            ];

          case "Done":
            return [
              "Done",
            ];
        }
      }

      if (
        !canUpdateOwnTask
      ) {
        return [
          task.status,
        ];
      }

      switch (
        task.status
      ) {
        case "To Do":
          return [
            "To Do",
            "In Progress",
          ];

        case "In Progress":
          return [
            "To Do",
            "In Progress",
            "Review",
          ];

        case "Review":
          return [
            "Review",
          ];

        case "Done":
          return [
            "Done",
          ];
      }
    };

  /*
  |--------------------------------------------------------------------------
  | STATUS
  |--------------------------------------------------------------------------
  */

  const handleStatusChange =
    async (
      status:
        TaskStatus
    ) => {
      if (
        !canUpdateStatus ||
        status ===
          task.status
      ) {
        return;
      }

      setActionError(
        ""
      );

      setUpdatingField(
        "status"
      );

      try {
        await updateTaskStatus(
          task.id,
          status
        );
      } catch (
        error
      ) {
        setActionError(
          getErrorMessage(
            error
          )
        );
      } finally {
        setUpdatingField(
          null
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | COMMENT
  |--------------------------------------------------------------------------
  */

  const handleComment =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      const message =
        comment.trim();

      if (!message) {
        setCommentError(
          "Write a comment first."
        );

        return;
      }

      setCommentError(
        ""
      );

      setCommentSubmitting(
        true
      );

      try {
        await addComment(
          task.id,
          message
        );

        setComment(
          ""
        );
      } catch (
        error
      ) {
        console.error(
          "Failed to add comment:",
          error
        );

        setCommentError(
          getErrorMessage(
            error
          )
        );
      } finally {
        setCommentSubmitting(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | ATTACHMENTS
  |--------------------------------------------------------------------------
  */

  const handleFile =
    async (
      file:
        File | undefined
    ) => {
      if (!file) {
        return;
      }

      setAttachmentError(
        ""
      );

      setAttachmentUploading(
        true
      );

      try {
        await addAttachment(
          task.id,
          file
        );
      } catch (
        error
      ) {
        console.error(
          "Failed to upload attachment:",
          error
        );

        setAttachmentError(
          getErrorMessage(
            error
          )
        );
      } finally {
        setAttachmentUploading(
          false
        );
      }
    };

  const handleDownload =
    async (
      attachmentId:
        string,
      fileName:
        string
    ) => {
      setAttachmentError(
        ""
      );

      setDownloadingAttachmentId(
        attachmentId
      );

      try {
        await downloadAttachment(
          task.id,
          attachmentId,
          fileName
        );
      } catch (
        error
      ) {
        console.error(
          "Failed to download attachment:",
          error
        );

        setAttachmentError(
          getErrorMessage(
            error
          )
        );
      } finally {
        setDownloadingAttachmentId(
          null
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | REVIEW
  |--------------------------------------------------------------------------
  */

  const handleApprove =
    async () => {
      if (
        !canReviewTask ||
        task.status !==
          "Review"
      ) {
        return;
      }

      setActionError(
        ""
      );

      setUpdatingField(
        "review"
      );

      try {
        await updateTaskStatus(
          task.id,
          "Done"
        );

        setReviewFeedback(
          ""
        );
      } catch (
        error
      ) {
        setActionError(
          getErrorMessage(
            error
          )
        );
      } finally {
        setUpdatingField(
          null
        );
      }
    };

  const handleRequestChanges =
    async () => {
      if (
        !canReviewTask ||
        task.status !==
          "Review"
      ) {
        return;
      }

      const feedback =
        reviewFeedback.trim();

      if (
        !feedback
      ) {
        setActionError(
          "Please explain what changes are needed."
        );

        return;
      }

      setActionError(
        ""
      );

      setUpdatingField(
        "review"
      );

      try {
        await updateTaskStatus(
          task.id,
          "In Progress",
          feedback
        );

        setReviewFeedback(
          ""
        );
      } catch (
        error
      ) {
        setActionError(
          getErrorMessage(
            error
          )
        );
      } finally {
        setUpdatingField(
          null
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | DELETE
  |--------------------------------------------------------------------------
  */

  const handleDelete =
    async () => {
      if (
        !canDeleteTask ||
        deleting
      ) {
        return;
      }

      if (
        !window.confirm(
          `Delete "${task.title}"?`
        )
      ) {
        return;
      }

      setDeleting(
        true
      );

      setActionError(
        ""
      );

      try {
        await deleteTask(
          task.id
        );

        navigate(
          `/projects/${project.id}/tasks`,
          {
            replace:
              true,
          }
        );
      } catch (
        error
      ) {
        setActionError(
          getErrorMessage(
            error
          )
        );

        setDeleting(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | ASSIGNEE
  |--------------------------------------------------------------------------
  */

  const handleAssigneeChange =
    async (
      value:
        string
    ) => {
      if (
        !canAssignTask
      ) {
        return;
      }

      const assignee:
        ProjectMember | null =
        project.members.find(
          (
            member
          ) =>
            member.id ===
            value
        ) ??
        null;

      setUpdatingField(
        "assignee"
      );

      setActionError(
        ""
      );

      try {
        await updateTask(
          task.id,
          {
            assignee,
          }
        );
      } catch (
        error
      ) {
        setActionError(
          getErrorMessage(
            error
          )
        );
      } finally {
        setUpdatingField(
          null
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | PRIORITY / TYPE / DATE
  |--------------------------------------------------------------------------
  */

  const handlePriorityChange =
    async (
      priority:
        TaskPriority
    ) => {
      setUpdatingField(
        "priority"
      );

      setActionError(
        ""
      );

      try {
        await updateTask(
          task.id,
          {
            priority,
          }
        );
      } catch (
        error
      ) {
        setActionError(
          getErrorMessage(
            error
          )
        );
      } finally {
        setUpdatingField(
          null
        );
      }
    };

  const handleTypeChange =
    async (
      type:
        TaskType
    ) => {
      setUpdatingField(
        "type"
      );

      setActionError(
        ""
      );

      try {
        await updateTask(
          task.id,
          {
            type,
          }
        );
      } catch (
        error
      ) {
        setActionError(
          getErrorMessage(
            error
          )
        );
      } finally {
        setUpdatingField(
          null
        );
      }
    };

  const handleDueDateChange =
    async (
      dueDate:
        string | null
    ) => {
      setUpdatingField(
        "dueDate"
      );

      setActionError(
        ""
      );

      try {
        await updateTask(
          task.id,
          {
            dueDate,
          }
        );
      } catch (
        error
      ) {
        setActionError(
          getErrorMessage(
            error
          )
        );
      } finally {
        setUpdatingField(
          null
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | FORMATTERS
  |--------------------------------------------------------------------------
  */

  const formatDate =
    (
      value:
        string | null
    ) => {
      if (!value) {
        return "No due date";
      }

      return new Date(
        `${value}T00:00:00`
      ).toLocaleDateString(
        "en-US",
        {
          month:
            "short",
          day:
            "numeric",
          year:
            "numeric",
        }
      );
    };

  const formatDateTime =
    (
      value:
        string
    ) =>
      new Date(
        value
      ).toLocaleString(
        "en-US",
        {
          month:
            "short",
          day:
            "numeric",
          year:
            "numeric",
          hour:
            "numeric",
          minute:
            "2-digit",
        }
      );

  const formatFileSize =
    (
      bytes:
        number
    ) => {
      if (
        bytes < 1024
      ) {
        return `${bytes} B`;
      }

      if (
        bytes <
        1024 * 1024
      ) {
        return `${(
          bytes / 1024
        ).toFixed(
          1
        )} KB`;
      }

      return `${(
        bytes /
        (
          1024 *
          1024
        )
      ).toFixed(
        1
      )} MB`;
    };

  /*
  |--------------------------------------------------------------------------
  | BADGE STYLES
  |--------------------------------------------------------------------------
  */

  const priorityStyle =
    (
      priority:
        TaskPriority
    ) => {
      switch (
        priority
      ) {
        case "Urgent":
          return "bg-red-50 text-red-700";

        case "High":
          return "bg-orange-50 text-orange-700";

        case "Medium":
          return "bg-amber-50 text-amber-700";

        default:
          return "bg-kite-soft text-kite-muted";
      }
    };

  const statusStyle =
    (
      status:
        TaskStatus
    ) => {
      switch (
        status
      ) {
        case "Done":
          return "bg-emerald-50 text-emerald-700";

        case "Review":
          return "bg-violet-50 text-violet-700";

        case "In Progress":
          return "bg-kite-blue-wash text-kite-blue-deep";

        default:
          return "bg-kite-soft text-kite-muted";
      }
    };

  return (
    <div className="mx-auto min-w-0 max-w-[1400px]">

      {/* MOBILE-FRIENDLY BREADCRUMB */}
      <div className="mb-4 flex min-w-0 items-center gap-1.5 text-xs sm:mb-5 sm:gap-2 sm:text-sm">

        <Link
          to="/projects"
          className="hidden shrink-0 text-kite-muted transition hover:text-kite-ink sm:block"
        >
          Projects
        </Link>

        <span className="hidden text-kite-faint sm:block">
          /
        </span>

        <Link
          to={`/projects/${project.id}`}
          className="min-w-0 truncate text-kite-muted transition hover:text-kite-ink"
        >
          {project.name}
        </Link>

        <span className="shrink-0 text-kite-faint">
          /
        </span>

        <Link
          to={`/projects/${project.id}/tasks`}
          className="shrink-0 text-kite-muted transition hover:text-kite-ink"
        >
          Tasks
        </Link>

        <span className="hidden shrink-0 text-kite-faint sm:block">
          /
        </span>

        <span className="hidden shrink-0 font-medium text-kite-ink sm:block">
          {taskCode}
        </span>

      </div>

      {/* HEADER */}
      <div className="mb-5 sm:mb-7">

        <div className="min-w-0">

          <div className="mb-2 flex flex-wrap items-center gap-2">

            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-kite-faint sm:text-xs">
              {taskCode}
            </p>

            <span
              className={`rounded-lg px-2 py-1 text-[10px] font-medium sm:hidden ${statusStyle(
                task.status
              )}`}
            >
              {task.status}
            </span>

            <span
              className={`rounded-lg px-2 py-1 text-[10px] font-medium sm:hidden ${priorityStyle(
                task.priority
              )}`}
            >
              {task.priority}
            </span>

          </div>

          <h1 className="break-words text-2xl font-semibold tracking-tight text-kite-ink sm:text-3xl">
            {task.title}
          </h1>

          <p className="mt-2 truncate text-sm text-kite-muted">
            {project.name}
          </p>

        </div>

        {/* ACTIONS */}
        <div
          className={`mt-4 grid gap-2 ${
            canDeleteTask
              ? "grid-cols-2"
              : "grid-cols-1"
          } sm:flex`}
        >

          <Link
            to={`/projects/${project.id}/tasks`}
            className="flex items-center justify-center rounded-xl border border-kite-line bg-white px-4 py-2.5 text-sm font-medium text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink"
          >
            ← Back to Tasks
          </Link>

          {canDeleteTask && (
            <button
              type="button"
              disabled={
                deleting
              }
              onClick={() =>
                void handleDelete()
              }
              className="rounded-xl border border-red-100 bg-white px-4 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting
                ? "Deleting..."
                : "Delete"}
            </button>
          )}

        </div>

      </div>

      {/* ERROR */}
      {(actionError ||
        detailError) && (
        <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3">

          <p className="text-sm leading-6 text-red-600">
            {actionError ||
              detailError}
          </p>

        </div>
      )}

      {detailLoading && task && (
        <div className="mb-4 text-right">
          <span className="text-xs text-kite-faint">
            Refreshing task...
          </span>
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div className="grid min-w-0 gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">

        {/* MAIN CONTENT
            Mobile: second
            Desktop: left
        */}
        <main className="order-2 min-w-0 space-y-4 sm:space-y-5 xl:order-1">

          {/* DESCRIPTION */}
          <section className="min-w-0 rounded-2xl border border-kite-line bg-white">

            <div className="border-b border-kite-line px-4 py-4 sm:px-6">
              <h2 className="font-semibold text-kite-ink">
                Description
              </h2>
            </div>

            <div className="p-4 sm:p-6">
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-kite-muted">
                {task.description ||
                  "No description has been added to this task."}
              </p>
            </div>

          </section>

          {/* REVIEW */}
          {task.status ===
            "Review" &&
            canReviewTask && (
            <section className="min-w-0 rounded-2xl border border-kite-blue bg-kite-blue-wash/40">

              <div className="border-b border-kite-line px-4 py-4 sm:px-6">

                <h2 className="font-semibold text-kite-ink">
                  Review Required
                </h2>

                <p className="mt-1 text-sm leading-6 text-kite-muted">
                  Approve the work or return it to the assignee with feedback.
                </p>

              </div>

              <div className="p-4 sm:p-6">

                <label
                  htmlFor="review-feedback"
                  className="mb-2 block text-xs font-medium text-kite-muted"
                >
                  Feedback for requested changes
                </label>

                <textarea
                  id="review-feedback"
                  rows={3}
                  value={
                    reviewFeedback
                  }
                  disabled={
                    updatingField ===
                    "review"
                  }
                  onChange={(
                    event
                  ) => {
                    setReviewFeedback(
                      event.target.value
                    );

                    setActionError(
                      ""
                    );
                  }}
                  placeholder="Explain what needs to be revised..."
                  className="w-full resize-none rounded-xl border border-kite-line bg-white px-4 py-3 text-sm text-kite-ink outline-none transition placeholder:text-kite-faint focus:border-kite-blue focus:ring-4 focus:ring-kite-blue-wash disabled:opacity-60"
                />

                <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:justify-end sm:gap-3">

                  <button
                    type="button"
                    disabled={
                      updatingField ===
                        "review" ||
                      !reviewFeedback.trim()
                    }
                    onClick={() =>
                      void handleRequestChanges()
                    }
                    className="rounded-xl border border-kite-line bg-white px-3 py-2.5 text-xs font-medium text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink disabled:opacity-50 sm:px-4 sm:text-sm"
                  >
                    {updatingField ===
                      "review"
                      ? "Working..."
                      : "Request Changes"}
                  </button>

                  <button
                    type="button"
                    disabled={
                      updatingField ===
                      "review"
                    }
                    onClick={() =>
                      void handleApprove()
                    }
                    className="rounded-xl bg-kite-blue-deep px-3 py-2.5 text-xs font-medium text-white transition hover:brightness-95 disabled:opacity-50 sm:px-5 sm:text-sm"
                  >
                    {updatingField ===
                      "review"
                      ? "Working..."
                      : "Approve Task"}
                  </button>

                </div>

              </div>

            </section>
          )}

          {/* SUBTASKS AND CHECKLIST */}
          <section className="rounded-2xl border border-kite-line bg-white p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-kite-ink">Subtasks</h3>
            <div className="mt-3 space-y-2">
              {task.subtasks.map((subtask) => (
                <button key={subtask.id} type="button" onClick={() => navigate(`/projects/${subtask.projectId}/tasks/${subtask.id}`)} className="flex w-full items-center justify-between rounded-xl bg-kite-soft px-3 py-2.5 text-left text-sm">
                  <span className="truncate text-kite-ink">{subtask.title}</span>
                  <span className="ml-3 shrink-0 text-xs text-kite-muted">{subtask.status}</span>
                </button>
              ))}
              {task.subtasks.length === 0 && <p className="text-sm text-kite-faint">No subtasks yet.</p>}
            </div>
            {canEditAnyTask && (
              <div className="mt-3 flex gap-2">
                <input value={newSubtaskTitle} onChange={(event) => setNewSubtaskTitle(event.target.value)} maxLength={200} placeholder="Add a subtask" className="min-w-0 flex-1 rounded-xl border border-kite-line bg-kite-soft px-3 py-2 text-sm outline-none" />
                <button type="button" disabled={structureBusy || !newSubtaskTitle.trim()} onClick={() => void addSubtask()} className="rounded-xl bg-kite-blue-deep px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Add</button>
              </div>
            )}

            <div className="my-5 border-t border-kite-line" />
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-kite-ink">Checklist</h3>
              <span className="text-xs text-kite-muted">{task.checklistItems.filter((item) => item.isCompleted).length}/{task.checklistItems.length} complete</span>
            </div>
            <div className="mt-3 space-y-2">
              {task.checklistItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl bg-kite-soft px-3 py-2.5">
                  <input type="checkbox" checked={item.isCompleted} onChange={(event) => void toggleChecklistItem(item.id, event.target.checked)} className="h-4 w-4 accent-[#6E94B0]" />
                  <span className={`min-w-0 flex-1 text-sm ${item.isCompleted ? "text-kite-faint line-through" : "text-kite-ink"}`}>{item.title}</span>
                  {canManageChecklist && <button type="button" onClick={() => void removeChecklistItem(item.id)} aria-label={`Delete ${item.title}`} className="text-xs text-red-500">Delete</button>}
                </div>
              ))}
              {task.checklistItems.length === 0 && <p className="text-sm text-kite-faint">No checklist items yet.</p>}
            </div>
            {canManageChecklist && (
              <div className="mt-3 flex gap-2">
                <input value={newChecklistTitle} onChange={(event) => setNewChecklistTitle(event.target.value)} maxLength={200} placeholder="Add a checklist item" className="min-w-0 flex-1 rounded-xl border border-kite-line bg-kite-soft px-3 py-2 text-sm outline-none" />
                <button type="button" disabled={structureBusy || !newChecklistTitle.trim()} onClick={() => void addChecklistItem()} className="rounded-xl bg-kite-blue-deep px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Add</button>
              </div>
            )}
            {structureError && <p className="mt-3 text-xs text-red-600" role="alert">{structureError}</p>}
          </section>

          {/* ATTACHMENTS */}
          <section className="min-w-0 rounded-2xl border border-kite-line bg-white">

            <div className="flex flex-col gap-3 border-b border-kite-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

              <div>
                <h2 className="font-semibold text-kite-ink">
                  Attachments
                </h2>

                <p className="mt-1 text-xs leading-5 text-kite-muted">
                  Supporting files and work references.
                </p>
              </div>

              <label
                className={`flex w-full items-center justify-center rounded-xl border border-kite-line bg-white px-4 py-2.5 text-sm font-medium text-kite-muted sm:w-auto ${
                  attachmentUploading
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer transition hover:bg-kite-soft hover:text-kite-ink"
                }`}
              >
                {attachmentUploading
                  ? "Uploading..."
                  : "+ Add File"}

                <input
                  type="file"
                  disabled={
                    attachmentUploading
                  }
                  className="hidden"
                  onChange={(
                    event
                  ) => {
                    const file =
                      event.target
                        .files?.[0];

                    event.target.value =
                      "";

                    void handleFile(
                      file
                    );
                  }}
                />
              </label>

            </div>

            {attachmentError && (
              <div className="border-b border-kite-line bg-red-50 px-4 py-3 sm:px-6">

                <p className="text-sm leading-6 text-red-600">
                  {
                    attachmentError
                  }
                </p>

              </div>
            )}

            {task.attachments.length ===
            0 ? (
              <div className="px-4 py-8 text-center sm:p-6">

                <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-kite-soft text-kite-muted">

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path d="M8 12.5 13.5 7a3 3 0 0 1 4.2 4.2l-7.2 7.2a5 5 0 0 1-7.1-7.1l7.8-7.8" />
                  </svg>

                </div>

                <p className="mt-3 text-sm text-kite-muted">
                  No attachments yet.
                </p>

              </div>
            ) : (
              <div className="divide-y divide-kite-line">

                {task.attachments.map(
                  (
                    attachment
                  ) => (
                    <div
                      key={
                        attachment.id
                      }
                      className="flex min-w-0 flex-wrap items-center gap-3 px-4 py-4 sm:flex-nowrap sm:gap-4 sm:px-6"
                    >

                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-kite-soft text-kite-muted">

                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          className="h-5 w-5"
                          aria-hidden="true"
                        >
                          <path d="M8 12.5 13.5 7a3 3 0 0 1 4.2 4.2l-7.2 7.2a5 5 0 0 1-7.1-7.1l7.8-7.8" />
                        </svg>

                      </div>

                      <div className="min-w-0 flex-1">

                        <p className="truncate text-sm font-medium text-kite-ink">
                          {attachment.name}
                        </p>

                        <p className="mt-1 truncate text-xs text-kite-muted">
                          {formatFileSize(
                            attachment.size
                          )}{" "}
                          · Uploaded by{" "}
                          {
                            attachment.uploadedBy
                          }
                        </p>

                      </div>

                      <button
                        type="button"
                        disabled={
                          downloadingAttachmentId ===
                          attachment.id
                        }
                        onClick={() =>
                          void handleDownload(
                            attachment.id,
                            attachment.name
                          )
                        }
                        className="w-full shrink-0 rounded-lg border border-kite-line bg-white px-3 py-2.5 text-xs font-medium text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink disabled:opacity-50 sm:w-auto sm:py-2"
                      >
                        {downloadingAttachmentId ===
                        attachment.id
                          ? "Downloading..."
                          : "Download"}
                      </button>

                    </div>
                  )
                )}

              </div>
            )}

          </section>

          {/* COMMENTS */}
          <section className="min-w-0 rounded-2xl border border-kite-line bg-white">

            <div className="border-b border-kite-line px-4 py-4 sm:px-6">

              <div className="flex items-center justify-between gap-3">

                <div>
                  <h2 className="font-semibold text-kite-ink">
                    Comments
                  </h2>

                  <p className="mt-1 text-xs text-kite-muted">
                    Discuss this task with the project team.
                  </p>
                </div>

                {task.comments.length >
                  0 && (
                  <span className="grid min-w-7 shrink-0 place-items-center rounded-full bg-kite-soft px-2 py-1 text-xs font-medium text-kite-muted">
                    {
                      task.comments.length
                    }
                  </span>
                )}

              </div>

            </div>

            <div className="p-4 sm:p-6">

              <form
                onSubmit={
                  handleComment
                }
              >

                <div className="flex gap-3">

                  {/* Hide avatar on very small screens
                      to give the editor more width.
                  */}
                  <div className="hidden h-9 w-9 shrink-0 place-items-center rounded-full bg-kite-blue-wash text-xs font-semibold text-kite-blue-deep sm:grid">
                    {
                      currentUserInitials
                    }
                  </div>

                  <div className="min-w-0 flex-1">

                    <textarea
                      rows={3}
                      value={
                        comment
                      }
                      disabled={
                        commentSubmitting
                      }
                      onChange={(
                        event
                      ) => {
                        setComment(
                          event.target.value
                        );

                        setCommentError(
                          ""
                        );
                      }}
                      placeholder="Add a comment..."
                      className={`w-full resize-none rounded-xl border bg-kite-soft px-4 py-3 text-sm text-kite-ink outline-none transition placeholder:text-kite-faint focus:bg-white focus:ring-4 ${
                        commentError
                          ? "border-red-300 focus:ring-red-50"
                          : "border-kite-line focus:border-kite-blue focus:ring-kite-blue-wash"
                      }`}
                    />

                    {commentError && (
                      <p className="mt-2 text-sm text-red-500">
                        {
                          commentError
                        }
                      </p>
                    )}

                    <div className="mt-3 flex justify-end">

                      <button
                        type="submit"
                        disabled={
                          commentSubmitting ||
                          !comment.trim()
                        }
                        className="w-full rounded-xl bg-kite-blue-deep px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                      >
                        {commentSubmitting
                          ? "Posting..."
                          : "Comment"}
                      </button>

                    </div>

                  </div>

                </div>

              </form>

              {task.comments.length >
                0 && (
                <div className="mt-6 space-y-5 border-t border-kite-line pt-6">

                  {[...task.comments]
                    .reverse()
                    .map(
                      (
                        item
                      ) => (
                        <article
                          key={
                            item.id
                          }
                          className="flex min-w-0 gap-3"
                        >

                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-kite-soft text-[10px] font-semibold text-kite-ink sm:h-9 sm:w-9 sm:text-xs">
                            {
                              item.authorInitials
                            }
                          </div>

                          <div className="min-w-0 flex-1">

                            <div className="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">

                              <p className="truncate text-sm font-medium text-kite-ink">
                                {
                                  item.authorName
                                }
                              </p>

                              <span className="text-[10px] text-kite-faint sm:text-xs">
                                {formatDateTime(
                                  item.createdAt
                                )}
                              </span>

                            </div>

                            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-kite-muted">
                              {
                                item.message
                              }
                            </p>

                          </div>

                        </article>
                      )
                    )}

                </div>
              )}

            </div>

          </section>

          {/* ACTIVITY */}
          <section className="min-w-0 rounded-2xl border border-kite-line bg-white">

            <div className="border-b border-kite-line px-4 py-4 sm:px-6">

              <div className="flex items-center justify-between gap-3">

                <div>
                  <h2 className="font-semibold text-kite-ink">
                    Activity
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-kite-muted">
                    History of important changes to this task.
                  </p>
                </div>

                {taskActivity.length >
                  0 && (
                  <span className="grid min-w-7 shrink-0 place-items-center rounded-full bg-kite-soft px-2 py-1 text-xs font-medium text-kite-muted">
                    {
                      taskActivity.length
                    }
                  </span>
                )}

              </div>

            </div>

            <div className="p-4 sm:p-6">

              {taskActivity.length ===
              0 ? (
                <p className="text-sm text-kite-muted">
                  No activity yet.
                </p>
              ) : (
                <div className="space-y-5">

                  {taskActivity.map(
                    (
                      activity,
                      index
                    ) => (
                      <div
                        key={
                          activity.id
                        }
                        className="relative flex gap-3 sm:gap-4"
                      >

                        {index <
                          taskActivity.length -
                            1 && (
                          <div className="absolute left-[13px] top-7 h-[calc(100%+8px)] w-px bg-kite-line sm:left-[15px] sm:top-8" />
                        )}

                        <div className="relative z-10 mt-1 h-7 w-7 shrink-0 rounded-full border-4 border-white bg-kite-blue-wash sm:h-8 sm:w-8" />

                        <div className="min-w-0 flex-1 pb-2">

                          <p className="break-words text-sm leading-6 text-kite-ink">

                            <span className="font-medium">
                              {
                                activity.actor
                              }
                            </span>{" "}

                            {
                              activity.message
                            }

                          </p>

                          <p className="mt-1 text-[10px] text-kite-faint sm:text-xs">
                            {formatDateTime(
                              activity.createdAt
                            )}
                          </p>

                        </div>

                      </div>
                    )
                  )}

                </div>
              )}

            </div>

          </section>

        </main>

        {/* TASK SIDEBAR
            Mobile: FIRST
            Desktop: RIGHT
        */}
        <aside className="order-1 min-w-0 space-y-4 sm:space-y-5 xl:order-2">

          {/* TASK DETAILS */}
          <section className="min-w-0 rounded-2xl border border-kite-line bg-white">

            <div className="flex items-center justify-between border-b border-kite-line px-4 py-4 sm:px-5">

              <h2 className="font-semibold text-kite-ink">
                Task Details
              </h2>

              {updatingField && (
                <span className="text-[10px] font-medium text-kite-blue-deep">
                  Saving...
                </span>
              )}

            </div>

            <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-1">

              {/* STATUS */}
              <div className="min-w-0">

                <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-kite-faint sm:text-xs">
                  Status
                </p>

                {canUpdateStatus &&
                allowedStatuses().length >
                  1 ? (
                  <select
                    value={
                      task.status
                    }
                    disabled={
                      updatingField ===
                      "status"
                    }
                    onChange={(
                      event
                    ) =>
                      void handleStatusChange(
                        event.target
                          .value as TaskStatus
                      )
                    }
                    className="w-full rounded-xl border border-kite-line bg-kite-soft px-3 py-3 text-sm font-medium text-kite-ink outline-none transition focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash disabled:opacity-60"
                  >

                    {allowedStatuses().map(
                      (
                        status
                      ) => (
                        <option
                          key={
                            status
                          }
                          value={
                            status
                          }
                        >
                          {
                            status
                          }
                        </option>
                      )
                    )}

                  </select>
                ) : (
                  <span
                    className={`inline-flex rounded-lg px-2.5 py-1.5 text-xs font-medium ${statusStyle(
                      task.status
                    )}`}
                  >
                    {task.status}
                  </span>
                )}

              </div>

              {/* ASSIGNEE */}
              <div className="min-w-0">

                <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-kite-faint sm:text-xs">
                  Assignee
                </p>

                {canAssignTask ? (
                  <select
                    value={
                      task.assignee?.id ??
                      ""
                    }
                    disabled={
                      updatingField ===
                      "assignee"
                    }
                    onChange={(
                      event
                    ) =>
                      void handleAssigneeChange(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-kite-line bg-kite-soft px-3 py-3 text-sm text-kite-ink outline-none transition focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash disabled:opacity-60"
                  >

                    <option value="">
                      Unassigned
                    </option>

                    {project.members.map(
                      (
                        member
                      ) => (
                        <option
                          key={
                            member.id
                          }
                          value={
                            member.id
                          }
                        >
                          {
                            member.name
                          }
                        </option>
                      )
                    )}

                  </select>
                ) : task.assignee ? (
                  <div className="flex min-w-0 items-center gap-2">

                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-kite-soft text-[10px] font-semibold text-kite-ink">
                      {
                        task.assignee.initials
                      }
                    </div>

                    <p className="truncate text-sm text-kite-ink">
                      {
                        task.assignee.name
                      }
                    </p>

                  </div>
                ) : (
                  <p className="text-sm text-kite-faint">
                    Unassigned
                  </p>
                )}

              </div>

              {/* PRIORITY */}
              <div className="min-w-0">

                <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-kite-faint sm:text-xs">
                  Priority
                </p>

                {canEditAnyTask ? (
                  <select
                    value={
                      task.priority
                    }
                    disabled={
                      updatingField ===
                      "priority"
                    }
                    onChange={(
                      event
                    ) =>
                      void handlePriorityChange(
                        event.target
                          .value as TaskPriority
                      )
                    }
                    className="w-full rounded-xl border border-kite-line bg-kite-soft px-3 py-3 text-sm text-kite-ink outline-none transition focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash disabled:opacity-60"
                  >

                    {priorities.map(
                      (
                        priority
                      ) => (
                        <option
                          key={
                            priority
                          }
                          value={
                            priority
                          }
                        >
                          {
                            priority
                          }
                        </option>
                      )
                    )}

                  </select>
                ) : (
                  <span
                    className={`inline-flex rounded-lg px-2.5 py-1.5 text-xs font-medium ${priorityStyle(
                      task.priority
                    )}`}
                  >
                    {
                      task.priority
                    }
                  </span>
                )}

              </div>

              {/* TYPE */}
              <div className="min-w-0">

                <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-kite-faint sm:text-xs">
                  Type
                </p>

                {canEditAnyTask ? (
                  <select
                    value={
                      task.type
                    }
                    disabled={
                      updatingField ===
                      "type"
                    }
                    onChange={(
                      event
                    ) =>
                      void handleTypeChange(
                        event.target
                          .value as TaskType
                      )
                    }
                    className="w-full rounded-xl border border-kite-line bg-kite-soft px-3 py-3 text-sm text-kite-ink outline-none transition focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash disabled:opacity-60"
                  >

                    {taskTypes.map(
                      (
                        type
                      ) => (
                        <option
                          key={
                            type
                          }
                          value={
                            type
                          }
                        >
                          {
                            type
                          }
                        </option>
                      )
                    )}

                  </select>
                ) : (
                  <p className="text-sm font-medium text-kite-ink">
                    {task.type}
                  </p>
                )}

              </div>

              {/* DUE DATE */}
              <div className="min-w-0">

                <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-kite-faint sm:text-xs">
                  Due Date
                </p>

                {canEditAnyTask ? (
                  <input
                    type="date"
                    value={
                      task.dueDate ??
                      ""
                    }
                    disabled={
                      updatingField ===
                      "dueDate"
                    }
                    onChange={(
                      event
                    ) =>
                      void handleDueDateChange(
                        event.target.value ||
                        null
                      )
                    }
                    className="w-full rounded-xl border border-kite-line bg-kite-soft px-3 py-3 text-sm text-kite-ink outline-none transition focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash disabled:opacity-60"
                  />
                ) : (
                  <p className="text-sm text-kite-ink">
                    {formatDate(
                      task.dueDate
                    )}
                  </p>
                )}

              </div>

              {/* LABELS */}
              <div className="min-w-0 sm:col-span-2 xl:col-span-2">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-kite-faint sm:text-xs">
                  Labels
                </p>

                <div className="flex flex-wrap gap-2">
                  {availableLabels.map((label) => {
                    const selected = task.labels.some((item) => item.id === label.id);
                    return (
                      <span key={label.id} className="inline-flex items-center overflow-hidden rounded-full border" style={{ borderColor: label.color }}>
                        <button
                          type="button"
                          disabled={!canEditAnyTask || updatingField !== null || deletingLabelId !== null}
                          onClick={() => void toggleLabel(label)}
                          aria-pressed={selected}
                          className={`px-2.5 py-1 text-xs font-medium transition disabled:cursor-default ${selected ? "text-white" : "bg-white text-kite-muted"}`}
                          style={selected ? { backgroundColor: label.color } : undefined}
                        >
                          {label.name}
                        </button>

                        {canEditAnyTask && (
                          <button
                            type="button"
                            onClick={() => void deleteLabel(label)}
                            disabled={deletingLabelId !== null}
                            aria-label={`Delete ${label.name} label`}
                            title={`Delete ${label.name}`}
                            className="border-l px-2 py-1 text-xs font-semibold text-kite-muted transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            style={{ borderColor: label.color }}
                          >
                            {deletingLabelId === label.id ? "…" : "×"}
                          </button>
                        )}
                      </span>
                    );
                  })}

                  {!labelsLoading && availableLabels.length === 0 && (
                    <span className="text-sm text-kite-faint">No labels yet</span>
                  )}
                  {labelsLoading && <span className="text-sm text-kite-faint">Loading labels...</span>}
                </div>

                {canEditAnyTask && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={newLabelName}
                      maxLength={40}
                      onChange={(event) => setNewLabelName(event.target.value)}
                      placeholder="New label name"
                      aria-label="New label name"
                      className="min-w-0 flex-1 rounded-xl border border-kite-line bg-kite-soft px-3 py-2 text-sm outline-none focus:border-kite-blue focus:ring-4 focus:ring-kite-blue-wash"
                    />
                    <input
                      type="color"
                      value={newLabelColor}
                      onChange={(event) => setNewLabelColor(event.target.value)}
                      aria-label="Label color"
                      className="h-10 w-12 rounded-lg border border-kite-line bg-white p-1"
                    />
                    <button
                      type="button"
                      onClick={() => void createLabel()}
                      disabled={!newLabelName.trim()}
                      className="rounded-xl bg-kite-blue-deep px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Add label
                    </button>
                  </div>
                )}

                {labelError && <p className="mt-2 text-xs text-red-600" role="alert">{labelError}</p>}
              </div>

              {/* CREATED BY */}
              <div className="min-w-0">

                <p className="text-[10px] font-medium uppercase tracking-wide text-kite-faint sm:text-xs">
                  Created By
                </p>

                <p className="mt-2 truncate text-sm text-kite-ink">
                  {
                    task.createdBy
                  }
                </p>

              </div>

              {/* CREATED */}
              <div className="min-w-0 sm:col-span-2 xl:col-span-1">

                <p className="text-[10px] font-medium uppercase tracking-wide text-kite-faint sm:text-xs">
                  Created
                </p>

                <p className="mt-2 text-xs leading-5 text-kite-muted sm:text-sm">
                  {formatDateTime(
                    task.createdAt
                  )}
                </p>

              </div>

            </div>

          </section>

          {/* WORKFLOW */}
          <section className="rounded-2xl border border-kite-line bg-white p-4 sm:p-5">

            <div className="flex items-center justify-between">

              <h3 className="text-sm font-semibold text-kite-ink">
                Workflow
              </h3>

              <span
                className={`rounded-lg px-2 py-1 text-[10px] font-medium ${statusStyle(
                  task.status
                )}`}
              >
                {
                  task.status
                }
              </span>

            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 xl:block xl:space-y-3">

              {statuses.map(
                (
                  status,
                  index
                ) => {
                  const active =
                    task.status ===
                    status;

                  return (
                    <div
                      key={
                        status
                      }
                      className={`flex min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 xl:border-0 xl:p-0 ${
                        active
                          ? "border-kite-blue bg-kite-blue-wash/50"
                          : "border-kite-line bg-kite-soft/30 xl:bg-transparent"
                      }`}
                    >

                      <div
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${
                          active
                            ? "bg-kite-blue-deep text-white"
                            : "bg-kite-soft text-kite-muted"
                        }`}
                      >
                        {index + 1}
                      </div>

                      <span
                        className={`min-w-0 text-xs sm:text-sm ${
                          active
                            ? "font-medium text-kite-ink"
                            : "text-kite-muted"
                        }`}
                      >
                        {status}
                      </span>

                    </div>
                  );
                }
              )}

            </div>

          </section>

        </aside>

      </div>

    </div>
  );
}

export default TaskDetailsPage;
