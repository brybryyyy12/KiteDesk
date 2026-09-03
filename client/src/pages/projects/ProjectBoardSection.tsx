import {
  useEffect,
  useMemo,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";

import {
  useNavigate,
} from "react-router";

import type {
  Project,
} from "../../context/ProjectContext";

import {
  useTasks,
  type ProjectTask,
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

type ProjectBoardSectionProps = {
  project: Project;
};

const columns: {
  status: TaskStatus;
  title: string;
  description: string;
}[] = [
  {
    status: "To Do",
    title: "To Do",
    description:
      "Ready to start",
  },
  {
    status: "In Progress",
    title: "In Progress",
    description:
      "Currently being worked on",
  },
  {
    status: "Review",
    title: "Review",
    description:
      "Waiting for approval",
  },
  {
    status: "Done",
    title: "Done",
    description:
      "Completed work",
  },
];

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

function priorityStyle(
  priority: TaskPriority
) {
  switch (priority) {
    case "Urgent":
      return "bg-red-50 text-red-700";

    case "High":
      return "bg-orange-50 text-orange-700";

    case "Medium":
      return "bg-amber-50 text-amber-700";

    default:
      return "bg-kite-soft text-kite-muted";
  }
}

function typeStyle(
  type: ProjectTask["type"]
) {
  switch (type) {
    case "Bug":
      return "bg-red-50 text-red-600";

    case "Feature":
      return "bg-violet-50 text-violet-700";

    default:
      return "bg-kite-soft text-kite-muted";
  }
}

function formatDate(
  date: string | null
) {
  if (!date) {
    return null;
  }

  return new Date(
    `${date}T00:00:00`
  ).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
    }
  );
}

function isOverdue(
  date: string | null,
  status: TaskStatus
) {
  if (
    !date ||
    status === "Done"
  ) {
    return false;
  }

  const due =
    new Date(
      `${date}T23:59:59`
    );

  return (
    due < new Date()
  );
}

function getMoveLabel(
  currentStatus: TaskStatus,
  targetStatus: TaskStatus
) {
  if (
    currentStatus === "To Do" &&
    targetStatus === "In Progress"
  ) {
    return "Start work";
  }

  if (
    currentStatus === "In Progress" &&
    targetStatus === "Review"
  ) {
    return "Submit for review";
  }

  if (
    currentStatus === "Review" &&
    targetStatus === "In Progress"
  ) {
    return "Request changes";
  }

  if (
    currentStatus === "Review" &&
    targetStatus === "Done"
  ) {
    return "Approve";
  }

  return `Move to ${targetStatus}`;
}

function ProjectBoardSection({
  project,
}: ProjectBoardSectionProps) {
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
    getTasksByProject,
    updateTaskStatus,
    refreshTasks,
    isLoaded,
    isLoading,
    error:
      taskContextError,
  } =
    useTasks();

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
    );

  const canReviewTask =
    hasPermission(
      role,
      "reviewTask"
    );

  const canCreateTask =
    hasPermission(
      role,
      "createTask"
    );

  const canUpdateOwnTask =
    hasPermission(
      role,
      "updateOwnTask"
    );

  /*
  |--------------------------------------------------------------------------
  | PROJECT TASKS
  |--------------------------------------------------------------------------
  */

  const projectTasks =
    getTasksByProject(
      project.id
    );

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"All" | TaskPriority>("All");
  const [typeFilter, setTypeFilter] = useState<"All" | TaskType>("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");

  const filteredProjectTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return projectTasks.filter((task) => {
      const matchesSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        Boolean(task.assignee?.name.toLowerCase().includes(query));

      const matchesPriority =
        priorityFilter === "All" || task.priority === priorityFilter;

      const matchesType =
        typeFilter === "All" || task.type === typeFilter;

      const matchesAssignee =
        assigneeFilter === "All" ||
        (assigneeFilter === "Unassigned"
          ? !task.assignee
          : task.assignee?.id === assigneeFilter);

      return matchesSearch && matchesPriority && matchesType && matchesAssignee;
    });
  }, [projectTasks, search, priorityFilter, typeFilter, assigneeFilter]);

  const filtersActive =
    Boolean(search.trim()) ||
    priorityFilter !== "All" ||
    typeFilter !== "All" ||
    assigneeFilter !== "All";

  const clearFilters = () => {
    setSearch("");
    setPriorityFilter("All");
    setTypeFilter("All");
    setAssigneeFilter("All");
  };

  /*
  |--------------------------------------------------------------------------
  | MOBILE BOARD
  |--------------------------------------------------------------------------
  */

  const [
    mobileStatus,
    setMobileStatus,
  ] =
    useState<TaskStatus>(
      "To Do"
    );

  /*
  |--------------------------------------------------------------------------
  | DRAG STATE
  |--------------------------------------------------------------------------
  */

  const [
    draggingTaskId,
    setDraggingTaskId,
  ] =
    useState<
      string | null
    >(null);

  const [
    dragOverStatus,
    setDragOverStatus,
  ] =
    useState<
      TaskStatus | null
    >(null);

  const [
    updatingTaskId,
    setUpdatingTaskId,
  ] =
    useState<
      string | null
    >(null);

  const [
    actionError,
    setActionError,
  ] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | REQUEST CHANGES MODAL
  |--------------------------------------------------------------------------
  */

  const [
    reviewTask,
    setReviewTask,
  ] =
    useState<
      ProjectTask | null
    >(null);

  const [
    feedback,
    setFeedback,
  ] =
    useState("");

  const [
    reviewSubmitting,
    setReviewSubmitting,
  ] =
    useState(false);

  const [
    reviewError,
    setReviewError,
  ] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | OWNERSHIP
  |--------------------------------------------------------------------------
  */

  const isOwnTask = (
    task: ProjectTask
  ) => {
    return Boolean(
      user &&
      task.assignee?.id ===
        user.id
    );
  };

  /*
  |--------------------------------------------------------------------------
  | ALLOWED WORKFLOW
  |--------------------------------------------------------------------------
  |
  | The frontend only exposes valid transitions.
  | The backend remains the source of truth.
  |
  */

  const getAllowedTargetStatuses =
    (
      task: ProjectTask
    ): TaskStatus[] => {
      if (
        canEditAnyTask
      ) {
        switch (
          task.status
        ) {
          case "To Do":
            return [
              "In Progress",
            ];

          case "In Progress":
            return [
              "Review",
            ];

          case "Review":
            return canReviewTask
              ? [
                  "In Progress",
                  "Done",
                ]
              : [];

          case "Done":
            return [];
        }
      }

      if (
        !canUpdateOwnTask ||
        !isOwnTask(
          task
        )
      ) {
        return [];
      }

      switch (
        task.status
      ) {
        case "To Do":
          return [
            "In Progress",
          ];

        case "In Progress":
          return [
            "Review",
          ];

        case "Review":
          return [];

        case "Done":
          return [];
      }
    };

  const canMoveTask = (
    task: ProjectTask
  ) => {
    return (
      getAllowedTargetStatuses(
        task
      ).length > 0
    );
  };

  const canMoveTaskToStatus =
    (
      task: ProjectTask,
      targetStatus:
        TaskStatus
    ) => {
      if (
        targetStatus ===
        task.status
      ) {
        return false;
      }

      return getAllowedTargetStatuses(
        task
      ).includes(
        targetStatus
      );
    };

  /*
  |--------------------------------------------------------------------------
  | REQUEST CHANGES
  |--------------------------------------------------------------------------
  */

  const openRequestChanges =
    (
      task: ProjectTask
    ) => {
      if (
        !canReviewTask
      ) {
        return;
      }

      setReviewTask(
        task
      );

      setFeedback("");

      setReviewError("");
    };

  const closeRequestChanges =
    () => {
      if (
        reviewSubmitting
      ) {
        return;
      }

      setReviewTask(
        null
      );

      setFeedback("");

      setReviewError("");
    };

  useEffect(
    () => {
      if (!reviewTask) {
        return;
      }

      const previousOverflow =
        document.body.style.overflow;

      document.body.style.overflow =
        "hidden";

      const handleKeyDown =
        (
          event: KeyboardEvent
        ) => {
          if (
            event.key === "Escape" &&
            !reviewSubmitting
          ) {
            setReviewTask(
              null
            );

            setFeedback("");

            setReviewError("");
          }
        };

      document.addEventListener(
        "keydown",
        handleKeyDown
      );

      return () => {
        document.body.style.overflow =
          previousOverflow;

        document.removeEventListener(
          "keydown",
          handleKeyDown
        );
      };
    },
    [
      reviewTask,
      reviewSubmitting,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | MOVE TASK
  |--------------------------------------------------------------------------
  */

  const moveTaskToStatus =
    async (
      task: ProjectTask,
      status: TaskStatus,
      followOnMobile = false
    ) => {
      if (
        !canMoveTaskToStatus(
          task,
          status
        ) ||
        updatingTaskId ===
          task.id
      ) {
        return;
      }

      /*
       * Review -> In Progress
       * requires reviewer feedback.
       */
      if (
        task.status ===
          "Review" &&
        status ===
          "In Progress"
      ) {
        openRequestChanges(
          task
        );

        return;
      }

      setActionError("");

      setUpdatingTaskId(
        task.id
      );

      try {
        await updateTaskStatus(
          task.id,
          status
        );

        /*
         * On mobile, follow the task
         * to its new column.
         */
        if (
          followOnMobile
        ) {
          setMobileStatus(
            status
          );
        }
      } catch (error) {
        console.error(
          "Failed to move task:",
          error
        );

        setActionError(
          getErrorMessage(
            error
          )
        );
      } finally {
        setUpdatingTaskId(
          null
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | DRAG START
  |--------------------------------------------------------------------------
  */

  const handleDragStart =
    (
      event:
        DragEvent<HTMLDivElement>,
      task:
        ProjectTask
    ) => {
      if (
        !canMoveTask(
          task
        ) ||
        updatingTaskId ===
          task.id
      ) {
        event.preventDefault();

        return;
      }

      setActionError("");

      setDraggingTaskId(
        task.id
      );

      event.dataTransfer.effectAllowed =
        "move";

      /*
       * UUID remains a string.
       */
      event.dataTransfer.setData(
        "text/plain",
        task.id
      );
    };

  const handleDragEnd =
    () => {
      setDraggingTaskId(
        null
      );

      setDragOverStatus(
        null
      );
    };

  const handleDragOver =
    (
      event:
        DragEvent<HTMLDivElement>,
      status:
        TaskStatus
    ) => {
      if (
        !draggingTaskId
      ) {
        return;
      }

      const task =
        projectTasks.find(
          (item) =>
            item.id ===
            draggingTaskId
        );

      if (
        !task ||
        !canMoveTaskToStatus(
          task,
          status
        )
      ) {
        return;
      }

      event.preventDefault();

      event.dataTransfer.dropEffect =
        "move";

      setDragOverStatus(
        status
      );
    };

  const handleDrop =
    async (
      event:
        DragEvent<HTMLDivElement>,
      status:
        TaskStatus
    ) => {
      event.preventDefault();

      /*
       * UUID stays a string.
       */
      const taskId =
        event.dataTransfer.getData(
          "text/plain"
        );

      const task =
        projectTasks.find(
          (item) =>
            item.id ===
            taskId
        );

      setDragOverStatus(
        null
      );

      if (!task) {
        handleDragEnd();

        return;
      }

      await moveTaskToStatus(
        task,
        status
      );

      handleDragEnd();
    };

  /*
  |--------------------------------------------------------------------------
  | APPROVE
  |--------------------------------------------------------------------------
  */

  const approveTask =
    async (
      task: ProjectTask,
      followOnMobile = false
    ) => {
      if (
        !canReviewTask ||
        task.status !==
          "Review" ||
        updatingTaskId ===
          task.id
      ) {
        return;
      }

      setActionError("");

      setUpdatingTaskId(
        task.id
      );

      try {
        await updateTaskStatus(
          task.id,
          "Done"
        );

        if (
          followOnMobile
        ) {
          setMobileStatus(
            "Done"
          );
        }
      } catch (error) {
        console.error(
          "Failed to approve task:",
          error
        );

        setActionError(
          getErrorMessage(
            error
          )
        );
      } finally {
        setUpdatingTaskId(
          null
        );
      }
    };

  const requestChanges =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      if (
        !reviewTask ||
        !canReviewTask
      ) {
        return;
      }

      const message =
        feedback.trim();

      if (!message) {
        setReviewError(
          "Please explain what changes are needed."
        );

        return;
      }

      setReviewError("");

      setReviewSubmitting(
        true
      );

      setUpdatingTaskId(
        reviewTask.id
      );

      try {
        await updateTaskStatus(
          reviewTask.id,
          "In Progress",
          message
        );

        setMobileStatus(
          "In Progress"
        );

        setReviewTask(
          null
        );

        setFeedback("");
      } catch (error) {
        console.error(
          "Failed to request changes:",
          error
        );

        setReviewError(
          getErrorMessage(
            error
          )
        );
      } finally {
        setReviewSubmitting(
          false
        );

        setUpdatingTaskId(
          null
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | TASK CARD
  |--------------------------------------------------------------------------
  */

  const renderTaskCard =
    (
      task: ProjectTask,
      mobile = false
    ) => {
      const movable =
        canMoveTask(
          task
        );

      const overdue =
        isOverdue(
          task.dueDate,
          task.status
        );

      const updating =
        updatingTaskId ===
        task.id;

      const allowedTargets =
        getAllowedTargetStatuses(
          task
        );

      return (
        <div
          key={
            task.id
          }
          draggable={
            !mobile &&
            movable &&
            !updating
          }
          onDragStart={
            mobile
              ? undefined
              : (
                  event
                ) =>
                  handleDragStart(
                    event,
                    task
                  )
          }
          onDragEnd={
            mobile
              ? undefined
              : handleDragEnd
          }
          className={`rounded-xl border bg-white p-4 shadow-[0_8px_22px_-20px_rgba(46,51,56,0.35)] transition ${
            !mobile &&
            movable &&
            !updating
              ? "cursor-grab hover:-translate-y-[1px] hover:border-kite-blue hover:shadow-[0_12px_28px_-20px_rgba(46,51,56,0.4)] active:cursor-grabbing"
              : "cursor-default"
          } ${
            draggingTaskId ===
            task.id
              ? "opacity-50"
              : ""
          } ${
            updating
              ? "pointer-events-none opacity-60"
              : ""
          }`}
        >

          {/* TOP LABELS */}
          <div className="mb-3 flex flex-wrap items-center gap-2">

            <span
              className={`rounded-lg px-2 py-1 text-[10px] font-medium ${typeStyle(
                task.type
              )}`}
            >
              {
                task.type
              }
            </span>

            <span
              className={`rounded-lg px-2 py-1 text-[10px] font-medium ${priorityStyle(
                task.priority
              )}`}
            >
              {
                task.priority
              }
            </span>

            {updating && (
              <span className="rounded-lg bg-kite-blue-wash px-2 py-1 text-[10px] font-medium text-kite-blue-deep">
                Updating...
              </span>
            )}

          </div>

          {/* TITLE */}
          <button
            type="button"
            onClick={() =>
              navigate(
                `/projects/${project.id}/tasks/${task.id}`
              )
            }
            className="block max-w-full text-left"
          >
            <h4 className="break-words text-sm font-semibold leading-5 text-kite-ink transition hover:text-kite-blue-deep">
              {
                task.title
              }
            </h4>
          </button>

          {/* DESCRIPTION */}
          {task.description && (
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-kite-muted">
              {
                task.description
              }
            </p>
          )}

          {/* DETAILS */}
          <div className="mt-4 flex items-center justify-between gap-3">

            {task.assignee ? (
              <div
                title={
                  task.assignee.name
                }
                className="flex min-w-0 items-center gap-2"
              >

                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-kite-soft text-[10px] font-semibold text-kite-ink">
                  {
                    task.assignee.initials
                  }
                </div>

                <span className="max-w-[120px] truncate text-[11px] text-kite-muted">
                  {
                    task.assignee.name
                  }
                </span>

              </div>
            ) : (
              <span className="text-[11px] text-kite-faint">
                Unassigned
              </span>
            )}

            {task.dueDate && (
              <span
                className={`shrink-0 text-[11px] ${
                  overdue
                    ? "font-medium text-red-500"
                    : "text-kite-muted"
                }`}
              >
                {overdue
                  ? "Overdue · "
                  : ""}

                {formatDate(
                  task.dueDate
                )}
              </span>
            )}

          </div>

          {/* REVIEW ACTIONS */}
          {task.status ===
            "Review" &&
            canReviewTask && (
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-kite-line pt-3">

              <button
                type="button"
                disabled={
                  updating
                }
                onClick={() =>
                  openRequestChanges(
                    task
                  )
                }
                className="rounded-lg border border-kite-line bg-white px-2 py-2 text-[11px] font-medium text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink disabled:opacity-50"
              >
                Request Changes
              </button>

              <button
                type="button"
                disabled={
                  updating
                }
                onClick={() =>
                  void approveTask(
                    task,
                    mobile
                  )
                }
                className="rounded-lg bg-kite-blue-deep px-2 py-2 text-[11px] font-medium text-white transition hover:brightness-95 disabled:opacity-50"
              >
                Approve
              </button>

            </div>
          )}

          {/* MOBILE MOVE ACTION */}
          {mobile &&
            task.status !==
              "Review" &&
            allowedTargets.length >
              0 && (
            <div className="mt-4 border-t border-kite-line pt-3">

              {allowedTargets.map(
                (
                  targetStatus
                ) => (
                  <button
                    key={
                      targetStatus
                    }
                    type="button"
                    disabled={
                      updating
                    }
                    onClick={() =>
                      void moveTaskToStatus(
                        task,
                        targetStatus,
                        true
                      )
                    }
                    className="w-full rounded-lg bg-kite-blue-deep px-3 py-2.5 text-xs font-medium text-white transition hover:brightness-95 disabled:opacity-50"
                  >
                    {getMoveLabel(
                      task.status,
                      targetStatus
                    )}
                  </button>
                )
              )}

            </div>
          )}

          {/* MEMBER WAITING FOR REVIEW */}
          {role ===
            "Member" &&
            isOwnTask(
              task
            ) &&
            task.status ===
              "Review" && (
            <div className="mt-3 border-t border-kite-line pt-3">

              <p className="text-[10px] leading-4 text-kite-faint">
                Submitted for review. Waiting for an owner or manager.
              </p>

            </div>
          )}

          {/* LOCKED TASK */}
          {!movable &&
            role ===
              "Member" &&
            !isOwnTask(
              task
            ) &&
            task.status !==
              "Done" && (
            <div className="mt-3 border-t border-kite-line pt-3">

              <p className="text-[10px] leading-4 text-kite-faint">
                Only the assignee or project manager can move this task.
              </p>

            </div>
          )}

        </div>
      );
    };

  /*
  |--------------------------------------------------------------------------
  | SELECTED MOBILE COLUMN
  |--------------------------------------------------------------------------
  */

  const mobileColumn =
    columns.find(
      (column) =>
        column.status ===
        mobileStatus
    ) ?? columns[0];

  const mobileColumnTasks =
    filteredProjectTasks.filter(
      (task) =>
        task.status ===
        mobileColumn.status
    );

  const loadingBoard =
    (
      !isLoaded ||
      isLoading
    ) &&
    projectTasks.length ===
      0;

  return (
    <>
      <section className="min-w-0">

        {/* BOARD HEADER */}
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

          <div>

            <h2 className="text-xl font-semibold tracking-tight text-kite-ink">
              Project Board
            </h2>

            <p className="mt-1 text-sm leading-6 text-kite-muted">
              Track work as it moves through the project workflow.
            </p>

          </div>

          <div
            className={`grid gap-2 ${
              canCreateTask
                ? "grid-cols-2"
                : "grid-cols-1"
            } sm:flex sm:flex-wrap`}
          >

            <button
              type="button"
              onClick={() =>
                navigate(
                  `/projects/${project.id}/tasks`
                )
              }
              className="rounded-xl border border-kite-line bg-white px-4 py-2.5 text-sm font-medium text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink"
            >
              View Tasks
            </button>

            {canCreateTask && (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/projects/${project.id}/tasks`
                  )
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-kite-blue-deep px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-95 sm:hover:-translate-y-[1px]"
              >
                <span className="text-lg leading-none">
                  +
                </span>

                New Task
              </button>
            )}

          </div>

        </div>

        {/* BOARD FILTERS */}
        {projectTasks.length > 0 && (
          <div className="mb-5 rounded-2xl border border-kite-line bg-white p-3 sm:p-4">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search board tasks..."
              aria-label="Search board tasks"
              className="w-full rounded-xl border border-kite-line bg-kite-soft px-4 py-3 text-sm text-kite-ink outline-none focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash"
            />

            <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value as "All" | TaskPriority)}
                aria-label="Filter board by priority"
                className="rounded-xl border border-kite-line bg-kite-soft px-3 py-3 text-sm outline-none focus:border-kite-blue focus:ring-4 focus:ring-kite-blue-wash"
              >
                <option value="All">All priorities</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as "All" | TaskType)}
                aria-label="Filter board by type"
                className="rounded-xl border border-kite-line bg-kite-soft px-3 py-3 text-sm outline-none focus:border-kite-blue focus:ring-4 focus:ring-kite-blue-wash"
              >
                <option value="All">All types</option>
                <option value="Task">Task</option>
                <option value="Feature">Feature</option>
                <option value="Bug">Bug</option>
              </select>

              <select
                value={assigneeFilter}
                onChange={(event) => setAssigneeFilter(event.target.value)}
                aria-label="Filter board by assignee"
                className="rounded-xl border border-kite-line bg-kite-soft px-3 py-3 text-sm outline-none focus:border-kite-blue focus:ring-4 focus:ring-kite-blue-wash"
              >
                <option value="All">All assignees</option>
                <option value="Unassigned">Unassigned</option>
                {project.members.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>

              {filtersActive && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-xl border border-kite-line bg-white px-4 py-3 text-sm font-medium text-kite-blue-deep transition hover:bg-kite-blue-wash"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* MEMBER NOTICE */}
        {role ===
          "Member" && (
          <div className="mb-5 rounded-xl border border-kite-line bg-kite-blue-wash/60 px-4 py-3">

            <p className="text-xs leading-5 text-kite-muted sm:text-sm sm:leading-6">
              You can move tasks assigned to you from To Do to In Progress, then submit them for Review. Only managers and owners can approve reviewed work.
            </p>

          </div>
        )}

        {/* ERROR */}
        {(taskContextError ||
          actionError) && (
          <div className="mb-5 flex flex-col gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-sm text-red-600">
              {
                actionError ||
                taskContextError
              }
            </p>

            {taskContextError && (
              <button
                type="button"
                disabled={
                  isLoading
                }
                onClick={() =>
                  void refreshTasks()
                }
                className="shrink-0 self-start text-xs font-medium text-red-700 disabled:opacity-50 sm:self-auto"
              >
                {isLoading
                  ? "Retrying..."
                  : "Try Again"}
              </button>
            )}

          </div>
        )}

        {/* BACKGROUND REFRESH */}
        {isLoading &&
          projectTasks.length >
            0 && (
          <div className="mb-3 text-right">
            <span className="text-xs text-kite-faint">
              Refreshing board...
            </span>
          </div>
        )}

        {/* LOADING */}
        {loadingBoard && (
          <>
            {/* MOBILE / TABLET */}
            <div className="space-y-3 xl:hidden">

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[1, 2, 3, 4].map(
                  (item) => (
                    <div
                      key={
                        item
                      }
                      className="h-12 animate-pulse rounded-xl bg-white"
                    />
                  )
                )}
              </div>

              <div className="rounded-2xl border border-kite-line bg-kite-soft/50 p-3">
                {[1, 2, 3].map(
                  (item) => (
                    <div
                      key={
                        item
                      }
                      className="mb-3 h-36 animate-pulse rounded-xl bg-white last:mb-0"
                    />
                  )
                )}
              </div>

            </div>

            {/* DESKTOP */}
            <div className="hidden grid-cols-4 gap-4 xl:grid">

              {[1, 2, 3, 4].map(
                (
                  item
                ) => (
                  <div
                    key={
                      item
                    }
                    className="h-[560px] animate-pulse rounded-2xl border border-kite-line bg-kite-soft"
                  />
                )
              )}

            </div>
          </>
        )}

        {/* EMPTY BOARD */}
        {isLoaded &&
          !isLoading &&
          projectTasks.length ===
            0 &&
          !taskContextError && (
          <div className="rounded-2xl border border-kite-line bg-white px-5 py-12 text-center sm:px-6 sm:py-16">

            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-kite-blue-wash text-kite-blue-deep sm:h-16 sm:w-16">

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="h-7 w-7 sm:h-8 sm:w-8"
              >
                <rect
                  x="3"
                  y="4"
                  width="5"
                  height="16"
                  rx="1.5"
                />

                <rect
                  x="10"
                  y="4"
                  width="5"
                  height="12"
                  rx="1.5"
                />

                <rect
                  x="17"
                  y="4"
                  width="4"
                  height="8"
                  rx="1.5"
                />
              </svg>

            </div>

            <h3 className="mt-5 text-lg font-semibold tracking-tight text-kite-ink sm:text-xl">
              Your board is empty
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-kite-muted">
              Create some project tasks first. They&apos;ll automatically appear on this board.
            </p>

            {canCreateTask && (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/projects/${project.id}/tasks`
                  )
                }
                className="mt-6 w-full rounded-xl bg-kite-blue-deep px-5 py-3 text-sm font-medium text-white transition hover:brightness-95 sm:w-auto"
              >
                Create a Task
              </button>
            )}

          </div>
        )}

        {/* MOBILE / TABLET BOARD */}
        {isLoaded &&
          projectTasks.length >
            0 && (
          <div className="xl:hidden">

            {/* STATUS SWITCHER */}
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">

              {columns.map(
                (
                  column
                ) => {
                  const active =
                    mobileStatus ===
                    column.status;

                  const count =
                    filteredProjectTasks.filter(
                      (task) =>
                        task.status ===
                        column.status
                    ).length;

                  return (
                    <button
                      key={
                        column.status
                      }
                      type="button"
                      aria-pressed={
                        active
                      }
                      onClick={() =>
                        setMobileStatus(
                          column.status
                        )
                      }
                      className={`flex min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-3 text-left transition ${
                        active
                          ? "border-kite-blue bg-kite-blue-wash text-kite-blue-deep"
                          : "border-kite-line bg-white text-kite-muted hover:bg-kite-soft hover:text-kite-ink"
                      }`}
                    >

                      <div className="flex min-w-0 items-center gap-2">
                        <ColumnDot
                          status={
                            column.status
                          }
                        />

                        <span className="truncate text-xs font-medium">
                          {
                            column.title
                          }
                        </span>
                      </div>

                      <span
                        className={`grid min-w-6 shrink-0 place-items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          active
                            ? "bg-white text-kite-blue-deep"
                            : "bg-kite-soft text-kite-muted"
                        }`}
                      >
                        {
                          count
                        }
                      </span>

                    </button>
                  );
                }
              )}

            </div>

            {/* SELECTED COLUMN */}
            <section className="rounded-2xl border border-kite-line bg-kite-soft/50">

              <div className="border-b border-kite-line px-4 py-4">

                <div className="flex items-center justify-between gap-3">

                  <div className="flex min-w-0 items-center gap-2">
                    <ColumnDot
                      status={
                        mobileColumn.status
                      }
                    />

                    <h3 className="truncate text-sm font-semibold text-kite-ink">
                      {
                        mobileColumn.title
                      }
                    </h3>
                  </div>

                  <span className="grid min-w-7 place-items-center rounded-full bg-white px-2 py-1 text-xs font-medium text-kite-muted">
                    {
                      mobileColumnTasks.length
                    }
                  </span>

                </div>

                <p className="mt-1.5 text-xs text-kite-faint">
                  {
                    mobileColumn.description
                  }
                </p>

              </div>

              <div className="space-y-3 p-3">

                {mobileColumnTasks.length ===
                  0 ? (
                  <div className="rounded-xl border border-dashed border-kite-line bg-white/70 px-5 py-10 text-center">
                    <p className="text-sm font-medium text-kite-ink">
                      No tasks here
                    </p>

                    <p className="mt-1 text-xs leading-5 text-kite-muted">
                      Tasks in this stage will appear here.
                    </p>
                  </div>
                ) : (
                  mobileColumnTasks.map(
                    (task) =>
                      renderTaskCard(
                        task,
                        true
                      )
                  )
                )}

              </div>

            </section>

          </div>
        )}

        {/* DESKTOP KANBAN */}
        {isLoaded &&
          projectTasks.length >
            0 && (
          <div className="hidden grid-cols-4 gap-4 xl:grid">

            {columns.map(
              (
                column
              ) => {
                const columnTasks =
                  filteredProjectTasks.filter(
                    (
                      task
                    ) =>
                      task.status ===
                      column.status
                  );

                const isDragOver =
                  dragOverStatus ===
                  column.status;

                return (
                  <div
                    key={
                      column.status
                    }
                    onDragOver={(
                      event
                    ) =>
                      handleDragOver(
                        event,
                        column.status
                      )
                    }
                    onDragLeave={() => {
                      if (
                        dragOverStatus ===
                        column.status
                      ) {
                        setDragOverStatus(
                          null
                        );
                      }
                    }}
                    onDrop={(
                      event
                    ) =>
                      void handleDrop(
                        event,
                        column.status
                      )
                    }
                    className={`flex min-h-[560px] min-w-0 flex-col rounded-2xl border transition ${
                      isDragOver
                        ? "border-kite-blue bg-kite-blue-wash/40"
                        : "border-kite-line bg-kite-soft/50"
                    }`}
                  >

                    {/* COLUMN HEADER */}
                    <div className="border-b border-kite-line px-4 py-4">

                      <div className="flex items-center justify-between gap-3">

                        <div className="flex min-w-0 items-center gap-2">
                          <ColumnDot
                            status={
                              column.status
                            }
                          />

                          <h3 className="truncate text-sm font-semibold text-kite-ink">
                            {
                              column.title
                            }
                          </h3>
                        </div>

                        <span className="grid min-w-7 shrink-0 place-items-center rounded-full bg-white px-2 py-1 text-xs font-medium text-kite-muted">
                          {
                            columnTasks.length
                          }
                        </span>

                      </div>

                      <p className="mt-1.5 text-xs text-kite-faint">
                        {
                          column.description
                        }
                      </p>

                    </div>

                    {/* CARDS */}
                    <div className="flex-1 space-y-3 p-3">

                      {columnTasks.length ===
                        0 && (
                        <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-kite-line bg-white/50 px-4 text-center">

                          <p className="text-xs leading-5 text-kite-faint">
                            {draggingTaskId
                              ? "Move task here"
                              : "No tasks"}
                          </p>

                        </div>
                      )}

                      {columnTasks.map(
                        (task) =>
                          renderTaskCard(
                            task
                          )
                      )}

                    </div>

                  </div>
                );
              }
            )}

          </div>
        )}

      </section>

      {/* REQUEST CHANGES MODAL */}
      {reviewTask && (
        <div className="fixed inset-0 z-[140] flex items-end justify-center sm:items-center sm:p-4">

          <button
            type="button"
            disabled={
              reviewSubmitting
            }
            onClick={
              closeRequestChanges
            }
            aria-label="Close request changes"
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          />

          <div className="relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-[24px] border border-kite-line bg-white shadow-[0_25px_80px_-30px_rgba(46,51,56,0.5)] sm:max-w-[520px] sm:rounded-[24px]">

            {/* MOBILE HANDLE */}
            <div className="flex justify-center pt-2 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-kite-line" />
            </div>

            <form
              onSubmit={
                requestChanges
              }
            >

              <div className="border-b border-kite-line px-4 py-4 sm:px-6 sm:py-5">

                <div className="flex items-start justify-between gap-4">

                  <div className="min-w-0">

                    <h2 className="text-lg font-semibold tracking-tight text-kite-ink sm:text-xl">
                      Request changes
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-kite-muted">
                      Send{" "}
                      <span className="font-medium text-kite-ink">
                        {
                          reviewTask.title
                        }
                      </span>{" "}
                      back to In Progress.
                    </p>

                  </div>

                  <button
                    type="button"
                    disabled={
                      reviewSubmitting
                    }
                    onClick={
                      closeRequestChanges
                    }
                    aria-label="Close"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xl text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink disabled:opacity-40"
                  >
                    ×
                  </button>

                </div>

              </div>

              <div className="p-4 sm:p-6">

                {reviewError && (
                  <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3">

                    <p className="text-sm text-red-600">
                      {
                        reviewError
                      }
                    </p>

                  </div>
                )}

                <label
                  htmlFor="review-feedback"
                  className="mb-2 block text-sm font-medium text-kite-muted"
                >
                  Feedback
                </label>

                <textarea
                  id="review-feedback"
                  rows={5}
                  value={
                    feedback
                  }
                  disabled={
                    reviewSubmitting
                  }
                  onChange={(
                    event
                  ) => {
                    setFeedback(
                      event.target.value
                    );

                    setReviewError("");
                  }}
                  placeholder="Explain what needs to be revised..."
                  autoFocus
                  className="w-full resize-none rounded-xl border border-kite-line bg-kite-soft px-4 py-3.5 text-sm leading-6 text-kite-ink outline-none transition placeholder:text-kite-faint focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash disabled:opacity-60"
                />

                <p className="mt-2 text-xs leading-5 text-kite-faint">
                  The assignee will receive this feedback with the changes-requested notification.
                </p>

              </div>

              <div className="sticky bottom-0 grid grid-cols-2 gap-3 border-t border-kite-line bg-white/95 px-4 py-4 backdrop-blur sm:flex sm:justify-end sm:px-6">

                <button
                  type="button"
                  disabled={
                    reviewSubmitting
                  }
                  onClick={
                    closeRequestChanges
                  }
                  className="rounded-xl border border-kite-line bg-white px-4 py-2.5 text-sm font-medium text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    reviewSubmitting ||
                    !feedback.trim()
                  }
                  className="rounded-xl bg-kite-blue-deep px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
                >
                  {reviewSubmitting
                    ? "Requesting..."
                    : "Request Changes"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </>
  );
}

function ColumnDot({
  status,
}: {
  status: TaskStatus;
}) {
  let className =
    "bg-kite-faint";

  if (
    status ===
    "In Progress"
  ) {
    className =
      "bg-kite-blue-deep";
  }

  if (
    status ===
    "Review"
  ) {
    className =
      "bg-violet-400";
  }

  if (
    status ===
    "Done"
  ) {
    className =
      "bg-emerald-400";
  }

  return (
    <span
      className={`h-2 w-2 shrink-0 rounded-full ${className}`}
    />
  );
}

export default ProjectBoardSection;
