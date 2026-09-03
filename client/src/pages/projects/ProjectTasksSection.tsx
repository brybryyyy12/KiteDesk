import {
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  useNavigate,
} from "react-router";

import {
  type Project,
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

type ProjectTasksSectionProps = {
  project: Project;
};

const taskStatuses: TaskStatus[] = [
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

function ProjectTasksSection({
  project,
}: ProjectTasksSectionProps) {
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
    tasks,
    isLoaded,
    isLoading,
    error:
      taskContextError,
    createTask,
    updateTaskStatus,
    deleteTask,
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

  const canCreateTask =
    hasPermission(
      role,
      "createTask"
    );

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

  const canDeleteTask =
    hasPermission(
      role,
      "deleteTask"
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
    useMemo(
      () =>
        tasks.filter(
          (task) =>
            task.projectId ===
            project.id
        ),
      [
        tasks,
        project.id,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | CURRENT PROJECT MEMBER
  |--------------------------------------------------------------------------
  */

  const currentMember =
    useMemo(
      () =>
        project.members.find(
          (member) =>
            member.id ===
            user?.id
        ),
      [
        project.members,
        user?.id,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | FILTERS
  |--------------------------------------------------------------------------
  */

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      "All" | TaskStatus
    >("All");

  const [
    priorityFilter,
    setPriorityFilter,
  ] = useState<"All" | TaskPriority>("All");

  const [
    typeFilter,
    setTypeFilter,
  ] = useState<"All" | TaskType>("All");

  const [
    assigneeFilter,
    setAssigneeFilter,
  ] = useState("All");

  const [
    dueFilter,
    setDueFilter,
  ] = useState<"All" | "Overdue" | "Today" | "Next 7 days" | "No due date">("All");

  const [
    sortOption,
    setSortOption,
  ] = useState<"Due date" | "Newest" | "Oldest" | "Priority">("Due date");

  /*
  |--------------------------------------------------------------------------
  | CREATE FORM
  |--------------------------------------------------------------------------
  */

  const [
    createOpen,
    setCreateOpen,
  ] =
    useState(false);

  const [
    title,
    setTitle,
  ] =
    useState("");

  const [
    description,
    setDescription,
  ] =
    useState("");

  const [
    type,
    setType,
  ] =
    useState<TaskType>(
      "Task"
    );

  const [
    priority,
    setPriority,
  ] =
    useState<TaskPriority>(
      "Medium"
    );

  const [
    assigneeId,
    setAssigneeId,
  ] =
    useState("");

  const [
    dueDate,
    setDueDate,
  ] =
    useState("");

  const [
    errors,
    setErrors,
  ] =
    useState<{
      title?: string;
      dueDate?: string;
    }>({});

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  const [
    submitError,
    setSubmitError,
  ] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | ACTION STATE
  |--------------------------------------------------------------------------
  */

  const [
    actionError,
    setActionError,
  ] =
    useState("");

  const [
    statusUpdatingId,
    setStatusUpdatingId,
  ] =
    useState<
      string | null
    >(null);

  const [
    deletingId,
    setDeletingId,
  ] =
    useState<
      string | null
    >(null);

  /*
  |--------------------------------------------------------------------------
  | FILTERED TASKS
  |--------------------------------------------------------------------------
  */

  const filteredTasks =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        return projectTasks.filter(
          (task) => {
            const matchesSearch =
              !query ||
              task.title
                .toLowerCase()
                .includes(
                  query
                ) ||
              task.description
                .toLowerCase()
                .includes(
                  query
                ) ||
              Boolean(
                task.assignee
                  ?.name
                  .toLowerCase()
                  .includes(
                    query
                  )
              );

            const matchesStatus =
              statusFilter ===
                "All" ||
              task.status ===
                statusFilter;

            const matchesPriority =
              priorityFilter === "All" ||
              task.priority === priorityFilter;

            const matchesType =
              typeFilter === "All" ||
              task.type === typeFilter;

            const matchesAssignee =
              assigneeFilter === "All" ||
              (assigneeFilter === "Unassigned"
                ? !task.assignee
                : task.assignee?.id === assigneeFilter);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);

            const taskDueDate = task.dueDate
              ? new Date(`${task.dueDate}T00:00:00`)
              : null;

            const matchesDue =
              dueFilter === "All" ||
              (dueFilter === "No due date" && !taskDueDate) ||
              (dueFilter === "Overdue" &&
                Boolean(taskDueDate && taskDueDate < today && task.status !== "Done")) ||
              (dueFilter === "Today" &&
                Boolean(taskDueDate && taskDueDate.getTime() === today.getTime())) ||
              (dueFilter === "Next 7 days" &&
                Boolean(taskDueDate && taskDueDate >= today && taskDueDate <= nextWeek));

            return (
              matchesSearch &&
              matchesStatus &&
              matchesPriority &&
              matchesType &&
              matchesAssignee &&
              matchesDue
            );
          }
        );
      },
      [
        projectTasks,
        search,
        statusFilter,
        priorityFilter,
        typeFilter,
        assigneeFilter,
        dueFilter,
      ]
    );

  const sortedFilteredTasks =
    useMemo(() => {
      const priorityRank: Record<TaskPriority, number> = {
        Urgent: 0,
        High: 1,
        Medium: 2,
        Low: 3,
      };

      return [...filteredTasks].sort((a, b) => {
        if (sortOption === "Newest") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }

        if (sortOption === "Oldest") {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }

        if (sortOption === "Priority") {
          return priorityRank[a.priority] - priorityRank[b.priority];
        }

        if (a.dueDate && b.dueDate) {
          return a.dueDate.localeCompare(b.dueDate);
        }

        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      });
    }, [filteredTasks, sortOption]);

  const filtersActive =
    Boolean(search.trim()) ||
    statusFilter !== "All" ||
    priorityFilter !== "All" ||
    typeFilter !== "All" ||
    assigneeFilter !== "All" ||
    dueFilter !== "All" ||
    sortOption !== "Due date";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setTypeFilter("All");
    setAssigneeFilter("All");
    setDueFilter("All");
    setSortOption("Due date");
  };

  /*
  |--------------------------------------------------------------------------
  | RESET FORM
  |--------------------------------------------------------------------------
  */

  const resetForm =
    () => {
      setTitle(
        ""
      );

      setDescription(
        ""
      );

      setType(
        "Task"
      );

      setPriority(
        "Medium"
      );

      setAssigneeId(
        currentMember?.id ??
        ""
      );

      setDueDate(
        ""
      );

      setErrors(
        {}
      );

      setSubmitError(
        ""
      );
    };

  const openCreateModal =
    () => {
      resetForm();

      setCreateOpen(
        true
      );
    };

  const closeCreateModal =
    () => {
      if (
        isSubmitting
      ) {
        return;
      }

      setCreateOpen(
        false
      );

      resetForm();
    };

  /*
  |--------------------------------------------------------------------------
  | CREATE TASK
  |--------------------------------------------------------------------------
  */

  const handleCreate =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      if (
        !canCreateTask
      ) {
        return;
      }

      const nextErrors: {
        title?: string;
        dueDate?: string;
      } = {};

      if (
        title
          .trim()
          .length <
        2
      ) {
        nextErrors.title =
          "Task title must contain at least 2 characters.";
      }

      if (
        dueDate
      ) {
        const selected =
          new Date(
            `${dueDate}T23:59:59`
          );

        if (
          selected <
          new Date()
        ) {
          nextErrors.dueDate =
            "Due date cannot be in the past.";
        }
      }

      if (
        Object.keys(
          nextErrors
        ).length >
        0
      ) {
        setErrors(
          nextErrors
        );

        return;
      }

      setErrors(
        {}
      );

      setSubmitError(
        ""
      );

      setIsSubmitting(
        true
      );

      try {
        const assignee:
          ProjectMember | null =
          project.members.find(
            (member) =>
              member.id ===
              assigneeId
          ) ??
          null;

        await createTask({
          projectId:
            project.id,

          title:
            title.trim(),

          description:
            description.trim(),

          type,

          priority,

          assignee,

          dueDate:
            dueDate ||
            null,
        });

        setCreateOpen(
          false
        );

        resetForm();
      } catch (error) {
        console.error(
          "Failed to create task:",
          error
        );

        setSubmitError(
          getErrorMessage(
            error
          )
        );
      } finally {
        setIsSubmitting(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | CAN UPDATE TASK
  |--------------------------------------------------------------------------
  */

  const canUpdateTask =
    (
      taskAssigneeId?:
        string
    ) => {
      if (
        canEditAnyTask
      ) {
        return true;
      }

      if (
        !user
      ) {
        return false;
      }

      return (
        canUpdateOwnTask &&
        taskAssigneeId ===
          user.id
      );
    };

  /*
  |--------------------------------------------------------------------------
  | ALLOWED STATUSES
  |--------------------------------------------------------------------------
  |
  | Include the current status because
  | these values are rendered inside
  | a <select>.
  |
  */

  const allowedStatuses =
    (
      currentStatus:
        TaskStatus,
      taskAssigneeId?:
        string
    ): TaskStatus[] => {
      /*
       * OWNER / MANAGER
       */
      if (
        canEditAnyTask
      ) {
        switch (
          currentStatus
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
            return canReviewTask
              ? [
                  "Review",
                  "In Progress",
                  "Done",
                ]
              : [
                  "Review",
                ];

          case "Done":
            return [
              "Done",
            ];
        }
      }

      /*
       * MEMBER
       */
      const ownsTask =
        Boolean(
          user &&
          taskAssigneeId ===
            user.id
        );

      if (
        !ownsTask ||
        !canUpdateOwnTask
      ) {
        return [
          currentStatus,
        ];
      }

      switch (
        currentStatus
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
  | STATUS CHANGE
  |--------------------------------------------------------------------------
  */

  const handleStatusChange =
    async (
      taskId: string,
      nextStatus:
        TaskStatus
    ) => {
      const task =
        projectTasks.find(
          (item) =>
            item.id ===
            taskId
        );

      if (
        !task ||
        task.status ===
          nextStatus
      ) {
        return;
      }

      /*
       * Review → In Progress is really
       * "Request Changes".
       *
       * We keep that action on the
       * Board / Task Details where
       * feedback can be collected.
       */
      if (
        task.status ===
          "Review" &&
        nextStatus ===
          "In Progress"
      ) {
        setActionError(
          "Use the Board's Request Changes action so review feedback can be provided."
        );

        return;
      }

      setActionError(
        ""
      );

      setStatusUpdatingId(
        taskId
      );

      try {
        await updateTaskStatus(
          taskId,
          nextStatus
        );
      } catch (error) {
        console.error(
          "Failed to update task status:",
          error
        );

        setActionError(
          getErrorMessage(
            error
          )
        );
      } finally {
        setStatusUpdatingId(
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
    async (
      taskId: string,
      taskTitle: string
    ) => {
      if (
        !canDeleteTask
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `Delete "${taskTitle}"?`
        );

      if (
        !confirmed
      ) {
        return;
      }

      setActionError(
        ""
      );

      setDeletingId(
        taskId
      );

      try {
        await deleteTask(
          taskId
        );
      } catch (error) {
        console.error(
          "Failed to delete task:",
          error
        );

        setActionError(
          getErrorMessage(
            error
          )
        );
      } finally {
        setDeletingId(
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
      date:
        string | null
    ) => {
      if (
        !date
      ) {
        return "No due date";
      }

      return new Date(
        `${date}T00:00:00`
      ).toLocaleDateString(
        "en-US",
        {
          month:
            "short",

          day:
            "numeric",
        }
      );
    };

  const priorityStyle =
    (
      value:
        TaskPriority
    ) => {
      switch (
        value
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
      value:
        TaskStatus
    ) => {
      switch (
        value
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
    <>
      <section>

        {/* HEADER */}
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

          <div>

            <h2 className="text-xl font-semibold tracking-tight text-kite-ink">
              Project Tasks
            </h2>

            <p className="mt-1 text-sm text-kite-muted">
              Create, assign, and
              track work for this
              project.
            </p>

          </div>

          {canCreateTask && (
            <button
              type="button"
              onClick={
                openCreateModal
              }
              className="flex w-fit items-center gap-2 rounded-xl bg-kite-blue-deep px-4 py-2.5 text-sm font-medium text-white transition hover:-translate-y-[1px] hover:brightness-95"
            >
              <span className="text-lg leading-none">
                +
              </span>

              New Task
            </button>
          )}

        </div>

        {/* MEMBER NOTICE */}
        {role ===
          "Member" && (
          <div className="mb-5 rounded-xl border border-kite-line bg-kite-blue-wash/60 px-4 py-3">

            <p className="text-sm leading-6 text-kite-muted">
              You can update
              tasks assigned to
              you and submit
              them for review.
            </p>

          </div>
        )}

        {/* ERROR */}
        {(taskContextError ||
          actionError) && (
          <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3">

            <p className="text-sm text-red-600">
              {
                actionError ||
                taskContextError
              }
            </p>

          </div>
        )}

        {/* FILTERS */}
        <div className="mb-5 rounded-2xl border border-kite-line bg-kite-soft/40 p-3">

          <div className="relative">

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-kite-faint"
            >
              <circle
                cx="11"
                cy="11"
                r="7"
              />

              <path d="m20 20-4-4" />
            </svg>

            <input
              type="search"
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search tasks..."
              className="w-full rounded-xl border border-kite-line bg-white py-3 pl-12 pr-4 text-sm outline-none focus:border-kite-blue focus:ring-4 focus:ring-kite-blue-wash"
            />

          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
          <select
            value={
              statusFilter
            }
            onChange={(
              event
            ) =>
              setStatusFilter(
                event.target
                  .value as
                  | "All"
                  | TaskStatus
              )
            }
            className="rounded-xl border border-kite-line bg-white px-4 py-3 text-sm outline-none focus:border-kite-blue focus:ring-4 focus:ring-kite-blue-wash sm:min-w-[180px]"
          >

            <option value="All">
              All statuses
            </option>

            {taskStatuses.map(
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

          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value as "All" | TaskPriority)}
            aria-label="Filter by priority"
            className="rounded-xl border border-kite-line bg-white px-4 py-3 text-sm outline-none focus:border-kite-blue focus:ring-4 focus:ring-kite-blue-wash"
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
            aria-label="Filter by task type"
            className="rounded-xl border border-kite-line bg-white px-4 py-3 text-sm outline-none focus:border-kite-blue focus:ring-4 focus:ring-kite-blue-wash"
          >
            <option value="All">All types</option>
            <option value="Task">Task</option>
            <option value="Feature">Feature</option>
            <option value="Bug">Bug</option>
          </select>

          <select
            value={assigneeFilter}
            onChange={(event) => setAssigneeFilter(event.target.value)}
            aria-label="Filter by assignee"
            className="rounded-xl border border-kite-line bg-white px-4 py-3 text-sm outline-none focus:border-kite-blue focus:ring-4 focus:ring-kite-blue-wash"
          >
            <option value="All">All assignees</option>
            <option value="Unassigned">Unassigned</option>
            {project.members.map((member) => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>

          <select
            value={dueFilter}
            onChange={(event) => setDueFilter(event.target.value as typeof dueFilter)}
            aria-label="Filter by due date"
            className="rounded-xl border border-kite-line bg-white px-4 py-3 text-sm outline-none focus:border-kite-blue focus:ring-4 focus:ring-kite-blue-wash"
          >
            <option value="All">Any due date</option>
            <option value="Overdue">Overdue</option>
            <option value="Today">Due today</option>
            <option value="Next 7 days">Due in next 7 days</option>
            <option value="No due date">No due date</option>
          </select>

          <select
            value={sortOption}
            onChange={(event) => setSortOption(event.target.value as typeof sortOption)}
            aria-label="Sort tasks"
            className="rounded-xl border border-kite-line bg-white px-4 py-3 text-sm outline-none focus:border-kite-blue focus:ring-4 focus:ring-kite-blue-wash"
          >
            <option value="Due date">Sort: Due date</option>
            <option value="Priority">Sort: Priority</option>
            <option value="Newest">Sort: Newest</option>
            <option value="Oldest">Sort: Oldest</option>
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

        {/* LOADING */}
        {(!isLoaded ||
          isLoading) && (
          <div className="space-y-3">

            {[1, 2, 3].map(
              (
                item
              ) => (
                <div
                  key={
                    item
                  }
                  className="h-20 animate-pulse rounded-xl border border-kite-line bg-white"
                />
              )
            )}

          </div>
        )}

        {/* EMPTY */}
        {isLoaded &&
          !isLoading &&
          projectTasks.length ===
            0 && (
          <div className="rounded-2xl border border-kite-line bg-white px-6 py-14 text-center">

            <h3 className="text-lg font-semibold text-kite-ink">
              No tasks yet
            </h3>

            <p className="mt-2 text-sm text-kite-muted">
              {canCreateTask
                ? "Create the first task for this project."
                : "No tasks have been created yet."}
            </p>

            {canCreateTask && (
              <button
                type="button"
                onClick={
                  openCreateModal
                }
                className="mt-5 rounded-xl bg-kite-blue-deep px-5 py-2.5 text-sm font-medium text-white"
              >
                Create Task
              </button>
            )}

          </div>
        )}

        {/* NO MATCHES */}
        {isLoaded &&
          !isLoading &&
          projectTasks.length >
            0 &&
          sortedFilteredTasks.length ===
            0 && (
          <div className="rounded-2xl border border-kite-line bg-white px-6 py-12 text-center">

            <h3 className="font-semibold text-kite-ink">
              No matching tasks
            </h3>

            <p className="mt-2 text-sm text-kite-muted">
              Try changing your
              search or status
              filter.
            </p>

          </div>
        )}

        {/* TABLE */}
        {isLoaded &&
          !isLoading &&
          sortedFilteredTasks.length >
            0 && (
          <div className="overflow-hidden rounded-2xl border border-kite-line bg-white">

            <div className="hidden grid-cols-[1.7fr_0.7fr_0.8fr_1fr_0.8fr_140px_50px] border-b border-kite-line bg-kite-soft/60 px-5 py-3 text-xs font-medium uppercase tracking-wide text-kite-faint lg:grid">

              <span>Task</span>
              <span>Type</span>
              <span>Priority</span>
              <span>Assignee</span>
              <span>Due</span>
              <span>Status</span>
              <span />

            </div>

            <div className="divide-y divide-kite-line">

              {sortedFilteredTasks.map(
                (
                  task
                ) => {
                  const editable =
                    canUpdateTask(
                      task.assignee
                        ?.id
                    );

                  const statuses =
                    allowedStatuses(
                      task.status,
                      task.assignee
                        ?.id
                    );

                  const updating =
                    statusUpdatingId ===
                    task.id;

                  const deleting =
                    deletingId ===
                    task.id;

                  return (
                    <div
                      key={
                        task.id
                      }
                      className="grid gap-4 px-5 py-4 transition hover:bg-kite-soft/40 lg:grid-cols-[1.7fr_0.7fr_0.8fr_1fr_0.8fr_140px_50px] lg:items-center"
                    >

                      {/* TASK */}
                      <div className="min-w-0">

                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/projects/${project.id}/tasks/${task.id}`
                            )
                          }
                          className="block max-w-full text-left"
                        >
                          <p className="truncate text-sm font-medium text-kite-ink transition hover:text-kite-blue-deep">
                            {
                              task.title
                            }
                          </p>

                          {task.description && (
                            <p className="mt-1 line-clamp-1 text-xs text-kite-muted">
                              {
                                task.description
                              }
                            </p>
                          )}

                        </button>

                      </div>

                      {/* TYPE */}
                      <span className="text-xs text-kite-muted">
                        {
                          task.type
                        }
                      </span>

                      {/* PRIORITY */}
                      <span
                        className={`w-fit rounded-lg px-2.5 py-1 text-xs font-medium ${priorityStyle(
                          task.priority
                        )}`}
                      >
                        {
                          task.priority
                        }
                      </span>

                      {/* ASSIGNEE */}
                      <div>

                        {task.assignee ? (
                          <div className="flex items-center gap-2">

                            <div className="grid h-7 w-7 place-items-center rounded-full bg-kite-soft text-[10px] font-semibold">
                              {
                                task.assignee.initials
                              }
                            </div>

                            <span className="truncate text-xs text-kite-muted">
                              {
                                task.assignee.name
                              }
                            </span>

                          </div>
                        ) : (
                          <span className="text-xs text-kite-faint">
                            Unassigned
                          </span>
                        )}

                      </div>

                      {/* DUE */}
                      <span className="text-xs text-kite-muted">
                        {formatDate(
                          task.dueDate
                        )}
                      </span>

                      {/* STATUS */}
                      <div>

                        {editable &&
                        statuses.length >
                          1 ? (
                          <select
                            value={
                              task.status
                            }
                            disabled={
                              updating ||
                              deleting
                            }
                            onChange={(
                              event
                            ) =>
                              void handleStatusChange(
                                task.id,
                                event.target
                                  .value as TaskStatus
                              )
                            }
                            className={`w-full rounded-lg border-0 px-2.5 py-2 text-xs font-medium outline-none disabled:cursor-not-allowed disabled:opacity-60 ${statusStyle(
                              task.status
                            )}`}
                          >

                            {statuses.map(
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
                            {updating
                              ? "Updating..."
                              : task.status}
                          </span>
                        )}

                      </div>

                      {/* DELETE */}
                      <div className="flex justify-end">

                        {canDeleteTask && (
                          <button
                            type="button"
                            disabled={
                              deleting ||
                              updating
                            }
                            onClick={() =>
                              void handleDelete(
                                task.id,
                                task.title
                              )
                            }
                            title="Delete task"
                            className="grid h-8 w-8 place-items-center rounded-lg text-kite-faint transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {deleting
                              ? "…"
                              : "×"}
                          </button>
                        )}

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          </div>
        )}

      </section>

      {/* CREATE TASK MODAL */}
      {createOpen &&
        canCreateTask && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">

          <button
            type="button"
            disabled={
              isSubmitting
            }
            onClick={
              closeCreateModal
            }
            aria-label="Close create task"
            className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
          />

          <div className="relative z-10 max-h-[92vh] w-full max-w-[620px] overflow-y-auto rounded-[24px] border border-kite-line bg-white shadow-xl">

            {/* HEADER */}
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-kite-line bg-white px-6 py-5">

              <div>

                <h2 className="text-xl font-semibold text-kite-ink">
                  Create task
                </h2>

                <p className="mt-1 text-sm text-kite-muted">
                  Add work to{" "}
                  {
                    project.name
                  }
                  .
                </p>

              </div>

              <button
                type="button"
                disabled={
                  isSubmitting
                }
                onClick={
                  closeCreateModal
                }
                className="text-xl text-kite-muted transition hover:text-kite-ink disabled:opacity-40"
              >
                ×
              </button>

            </div>

            <form
              onSubmit={
                handleCreate
              }
            >

              <div className="space-y-5 p-6">

                {/* ERROR */}
                {submitError && (
                  <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">

                    <p className="text-sm text-red-600">
                      {
                        submitError
                      }
                    </p>

                  </div>
                )}

                {/* TITLE */}
                <div>

                  <label
                    htmlFor="task-title"
                    className="mb-2 block text-sm font-medium text-kite-muted"
                  >
                    Task title
                  </label>

                  <input
                    id="task-title"
                    value={
                      title
                    }
                    disabled={
                      isSubmitting
                    }
                    onChange={(
                      event
                    ) => {
                      setTitle(
                        event.target.value
                      );

                      setErrors(
                        (
                          current
                        ) => ({
                          ...current,

                          title:
                            undefined,
                        })
                      );

                      setSubmitError(
                        ""
                      );
                    }}
                    placeholder="Implement login page"
                    autoFocus
                    className={`w-full rounded-xl border bg-kite-soft px-4 py-3.5 text-sm outline-none transition focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
                      errors.title
                        ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                        : "border-kite-line focus:border-kite-blue focus:ring-kite-blue-wash"
                    }`}
                  />

                  {errors.title && (
                    <p className="mt-2 text-sm text-red-500">
                      {
                        errors.title
                      }
                    </p>
                  )}

                </div>

                {/* DESCRIPTION */}
                <div>

                  <label
                    htmlFor="task-description"
                    className="mb-2 block text-sm font-medium text-kite-muted"
                  >
                    Description
                  </label>

                  <textarea
                    id="task-description"
                    rows={4}
                    value={
                      description
                    }
                    disabled={
                      isSubmitting
                    }
                    onChange={(
                      event
                    ) =>
                      setDescription(
                        event.target.value
                      )
                    }
                    placeholder="Describe the task..."
                    className="w-full resize-none rounded-xl border border-kite-line bg-kite-soft px-4 py-3.5 text-sm outline-none transition focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash disabled:cursor-not-allowed disabled:opacity-60"
                  />

                </div>

                {/* TYPE / PRIORITY */}
                <div className="grid gap-5 sm:grid-cols-2">

                  <div>

                    <label
                      htmlFor="task-type"
                      className="mb-2 block text-sm font-medium text-kite-muted"
                    >
                      Type
                    </label>

                    <select
                      id="task-type"
                      value={
                        type
                      }
                      disabled={
                        isSubmitting
                      }
                      onChange={(
                        event
                      ) =>
                        setType(
                          event.target
                            .value as TaskType
                        )
                      }
                      className="w-full rounded-xl border border-kite-line bg-kite-soft px-4 py-3.5 text-sm outline-none focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash disabled:opacity-60"
                    >

                      {taskTypes.map(
                        (
                          item
                        ) => (
                          <option
                            key={
                              item
                            }
                            value={
                              item
                            }
                          >
                            {
                              item
                            }
                          </option>
                        )
                      )}

                    </select>

                  </div>

                  <div>

                    <label
                      htmlFor="task-priority"
                      className="mb-2 block text-sm font-medium text-kite-muted"
                    >
                      Priority
                    </label>

                    <select
                      id="task-priority"
                      value={
                        priority
                      }
                      disabled={
                        isSubmitting
                      }
                      onChange={(
                        event
                      ) =>
                        setPriority(
                          event.target
                            .value as TaskPriority
                        )
                      }
                      className="w-full rounded-xl border border-kite-line bg-kite-soft px-4 py-3.5 text-sm outline-none focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash disabled:opacity-60"
                    >

                      {priorities.map(
                        (
                          item
                        ) => (
                          <option
                            key={
                              item
                            }
                            value={
                              item
                            }
                          >
                            {
                              item
                            }
                          </option>
                        )
                      )}

                    </select>

                  </div>

                </div>

                {/* ASSIGNEE */}
                <div>

                  <label
                    htmlFor="task-assignee"
                    className="mb-2 block text-sm font-medium text-kite-muted"
                  >
                    Assignee
                  </label>

                  <select
                    id="task-assignee"
                    value={
                      assigneeId
                    }
                    disabled={
                      isSubmitting
                    }
                    onChange={(
                      event
                    ) =>
                      setAssigneeId(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-kite-line bg-kite-soft px-4 py-3.5 text-sm outline-none focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash disabled:opacity-60"
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

                  <p className="mt-2 text-xs text-kite-faint">
                    Only members of
                    this project can
                    be assigned.
                  </p>

                </div>

                {/* DUE DATE */}
                <div>

                  <label
                    htmlFor="task-due-date"
                    className="mb-2 block text-sm font-medium text-kite-muted"
                  >
                    Due date
                  </label>

                  <input
                    id="task-due-date"
                    type="date"
                    value={
                      dueDate
                    }
                    disabled={
                      isSubmitting
                    }
                    onChange={(
                      event
                    ) => {
                      setDueDate(
                        event.target.value
                      );

                      setErrors(
                        (
                          current
                        ) => ({
                          ...current,

                          dueDate:
                            undefined,
                        })
                      );
                    }}
                    className={`w-full rounded-xl border bg-kite-soft px-4 py-3.5 text-sm outline-none transition focus:bg-white focus:ring-4 disabled:opacity-60 ${
                      errors.dueDate
                        ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                        : "border-kite-line focus:border-kite-blue focus:ring-kite-blue-wash"
                    }`}
                  />

                  {errors.dueDate && (
                    <p className="mt-2 text-sm text-red-500">
                      {
                        errors.dueDate
                      }
                    </p>
                  )}

                  {dueDate && (
                    <button
                      type="button"
                      disabled={
                        isSubmitting
                      }
                      onClick={() => {
                        setDueDate(
                          ""
                        );

                        setErrors(
                          (
                            current
                          ) => ({
                            ...current,

                            dueDate:
                              undefined,
                          })
                        );
                      }}
                      className="mt-2 text-xs font-medium text-kite-muted transition hover:text-kite-ink disabled:opacity-40"
                    >
                      Remove due date
                    </button>
                  )}

                </div>

                {/* INITIAL STATUS */}
                <div className="rounded-xl border border-kite-line bg-kite-soft px-4 py-3">

                  <p className="text-xs font-medium text-kite-faint">
                    Initial status
                  </p>

                  <p className="mt-1 text-sm font-medium text-kite-ink">
                    To Do
                  </p>

                  <p className="mt-1 text-xs leading-5 text-kite-muted">
                    New tasks always
                    begin in To Do.
                  </p>

                </div>

              </div>

              {/* FOOTER */}
              <div className="sticky bottom-0 flex justify-end gap-3 border-t border-kite-line bg-kite-soft/95 px-6 py-4 backdrop-blur">

                <button
                  type="button"
                  disabled={
                    isSubmitting
                  }
                  onClick={
                    closeCreateModal
                  }
                  className="rounded-xl border border-kite-line bg-white px-4 py-2.5 text-sm font-medium text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    isSubmitting
                  }
                  className="rounded-xl bg-kite-blue-deep px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting
                    ? "Creating..."
                    : "Create Task"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </>
  );
}

export default ProjectTasksSection;
