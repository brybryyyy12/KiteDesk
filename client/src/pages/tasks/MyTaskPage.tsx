import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useProjects } from "../../context/ProjectContext";
import {
  useTasks,
  type ProjectTask,
  type TaskPriority,
  type TaskStatus,
  type TaskType,
} from "../../context/TaskContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useAuth } from "../../context/AuthContext";

type StatusFilter = "All" | TaskStatus;
type PriorityFilter = "All" | TaskPriority;
type TypeFilter = "All" | TaskType;
type DueFilter = "All" | "Overdue" | "Today" | "Next 7 days" | "No due date";
type SortOption = "Due date" | "Newest" | "Oldest" | "Priority";

function MyTasksPage() {
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const { user, isLoading: authLoading } = useAuth();

  const {
    projects,
    isLoaded: projectsLoaded,
    isLoading: projectsLoading,
    error: projectsError,
    refreshProjects,
  } = useProjects();

  const {
    tasks,
    isLoaded: tasksLoaded,
    isLoading: tasksLoading,
    error: tasksError,
    refreshTasks,
  } = useTasks();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("All");
  const [priorityFilter, setPriorityFilter] =
    useState<PriorityFilter>("All");
  const [projectFilter, setProjectFilter] =
    useState("All");
  const [typeFilter, setTypeFilter] =
    useState<TypeFilter>("All");
  const [dueFilter, setDueFilter] =
    useState<DueFilter>("All");
  const [sortOption, setSortOption] =
    useState<SortOption>("Due date");

  /*
  |--------------------------------------------------------------------------
  | MY TASKS
  |--------------------------------------------------------------------------
  */

  const myTasks = useMemo(() => {
    if (!user) {
      return [];
    }

    const activeProjectIds = new Set(projects.map((project) => project.id));
    return tasks.filter(
      (task) =>
        task.assignee?.id === user.id &&
        activeProjectIds.has(task.projectId)
    );
  }, [tasks, user, projects]);

  /*
  |--------------------------------------------------------------------------
  | MY PROJECTS
  |--------------------------------------------------------------------------
  */

  const myProjects = useMemo(() => {
    const projectIds = new Set(
      myTasks.map(
        (task) => task.projectId
      )
    );

    return projects.filter(
      (project) =>
        projectIds.has(project.id)
    );
  }, [myTasks, projects]);

  /*
  |--------------------------------------------------------------------------
  | STATS
  |--------------------------------------------------------------------------
  */

  const stats = useMemo(() => {
    const now = new Date();

    const sevenDaysLater =
      new Date(now);

    sevenDaysLater.setDate(
      now.getDate() + 7
    );

    const assigned =
      myTasks.filter(
        (task) =>
          task.status !== "Done"
      ).length;

    const inProgress =
      myTasks.filter(
        (task) =>
          task.status ===
          "In Progress"
      ).length;

    const review =
      myTasks.filter(
        (task) =>
          task.status === "Review"
      ).length;

    const dueSoon =
      myTasks.filter(
        (task) => {
          if (
            !task.dueDate ||
            task.status === "Done"
          ) {
            return false;
          }

          const dueDate =
            new Date(
              `${task.dueDate}T23:59:59`
            );

          return (
            dueDate >= now &&
            dueDate <=
              sevenDaysLater
          );
        }
      ).length;

    return {
      assigned,
      inProgress,
      review,
      dueSoon,
    };
  }, [myTasks]);

  /*
  |--------------------------------------------------------------------------
  | FILTER
  |--------------------------------------------------------------------------
  */

  const filteredTasks =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return myTasks.filter(
        (task) => {
          const project =
            projects.find(
              (item) =>
                item.id ===
                task.projectId
            );

          const matchesSearch =
            !query ||
            task.title
              .toLowerCase()
              .includes(query) ||
            task.description
              .toLowerCase()
              .includes(query) ||
            Boolean(
              project?.name
                .toLowerCase()
                .includes(query)
            );

          const matchesStatus =
            statusFilter ===
              "All" ||
            task.status ===
              statusFilter;

          const matchesPriority =
            priorityFilter ===
              "All" ||
            task.priority ===
              priorityFilter;

          const matchesProject =
            projectFilter ===
              "All" ||
            task.projectId ===
              projectFilter;

          const matchesType =
            typeFilter === "All" ||
            task.type === typeFilter;

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
            matchesProject &&
            matchesType &&
            matchesDue
          );
        }
      );
    }, [
      myTasks,
      projects,
      search,
      statusFilter,
      priorityFilter,
      projectFilter,
      typeFilter,
      dueFilter,
    ]);

  /*
  |--------------------------------------------------------------------------
  | SORT
  |--------------------------------------------------------------------------
  */

  const sortedTasks =
    useMemo(() => {
      return [
        ...filteredTasks,
      ].sort((a, b) => {
        if (sortOption === "Newest") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }

        if (sortOption === "Oldest") {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }

        if (sortOption === "Priority") {
          const priorityRank: Record<TaskPriority, number> = {
            Urgent: 0,
            High: 1,
            Medium: 2,
            Low: 3,
          };

          return priorityRank[a.priority] - priorityRank[b.priority];
        }

        if (
          a.status === "Done" &&
          b.status !== "Done"
        ) {
          return 1;
        }

        if (
          b.status === "Done" &&
          a.status !== "Done"
        ) {
          return -1;
        }

        if (
          a.dueDate &&
          b.dueDate
        ) {
          return (
            new Date(
              `${a.dueDate}T00:00:00`
            ).getTime() -
            new Date(
              `${b.dueDate}T00:00:00`
            ).getTime()
          );
        }

        if (
          a.dueDate &&
          !b.dueDate
        ) {
          return -1;
        }

        if (
          !a.dueDate &&
          b.dueDate
        ) {
          return 1;
        }

        return (
          new Date(
            b.createdAt
          ).getTime() -
          new Date(
            a.createdAt
          ).getTime()
        );
      });
    }, [filteredTasks, sortOption]);

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  const loading =
    authLoading ||
    projectsLoading ||
    !projectsLoaded ||
    !tasksLoaded ||
    tasksLoading;

  if (loading) {
    return (
      <div className="mx-auto min-w-0 max-w-[1500px]">

        <div className="animate-pulse space-y-5 sm:space-y-6">

          <div>

            <div className="h-7 w-40 rounded bg-kite-line sm:h-8 sm:w-48" />

            <div className="mt-3 h-4 w-72 max-w-full rounded bg-kite-line sm:w-80" />

          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4">

            {[1, 2, 3, 4].map(
              (item) => (
                <div
                  key={item}
                  className="h-24 rounded-2xl border border-kite-line bg-white sm:h-28"
                />
              )
            )}

          </div>

          <div className="h-[360px] rounded-2xl border border-kite-line bg-white sm:h-[420px]" />

        </div>

      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | ERROR
  |--------------------------------------------------------------------------
  */

  const fatalLoadError =
    projectsError ||
    (
      tasksError &&
      tasks.length === 0
    );

  const retryLoading =
    async () => {
      if (projectsError) {
        await refreshProjects();

        return;
      }

      await refreshTasks();
    };

  if (fatalLoadError) {
    return (
      <div className="mx-auto min-w-0 max-w-[1500px]">

        <div className="mb-6 sm:mb-8">

          <p className="mb-1 truncate text-xs text-kite-muted sm:text-sm">
            {workspace?.name}
          </p>

          <h1 className="text-2xl font-semibold tracking-tight text-kite-ink sm:text-3xl">
            My Tasks
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-kite-muted">
            View and manage work
            assigned to you across
            all projects in your
            workspace.
          </p>

        </div>

        <section
          className="rounded-2xl border border-kite-line bg-white px-5 py-12 text-center sm:px-6 sm:py-16"
          aria-live="polite"
        >

          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-500 sm:h-16 sm:w-16">

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7 sm:h-8 sm:w-8"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
              />

              <path d="M12 7v6M12 17h.01" />
            </svg>

          </div>

          <h2 className="mt-5 text-lg font-semibold tracking-tight text-kite-ink sm:text-xl">
            Couldn&apos;t load your
            tasks
          </h2>

          <p className="mx-auto mt-2 max-w-md break-words text-sm leading-6 text-kite-muted">
            {projectsError ||
              tasksError ||
              "Something went wrong while loading your tasks."}
          </p>

          <button
            type="button"
            onClick={() =>
              void retryLoading()
            }
            className="mt-6 w-full rounded-xl bg-kite-blue-deep px-5 py-3 text-sm font-medium text-white transition hover:brightness-95 sm:w-auto"
          >
            Try Again
          </button>

        </section>

      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | HELPERS
  |--------------------------------------------------------------------------
  */

  const getProject = (
    projectId: string
  ) =>
    projects.find(
      (project) =>
        project.id ===
        projectId
    );

  const formatDate = (
    date: string | null
  ) => {
    if (!date) {
      return "No due date";
    }

    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    );
  };

  const isOverdue = (
    task: ProjectTask
  ) => {
    if (
      !task.dueDate ||
      task.status === "Done"
    ) {
      return false;
    }

    return (
      new Date(
        `${task.dueDate}T23:59:59`
      ) < new Date()
    );
  };

  const priorityStyle = (
    priority: TaskPriority
  ) => {
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
  };

  const statusStyle = (
    status: TaskStatus
  ) => {
    switch (status) {
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

  const typeStyle = (
    type:
      ProjectTask["type"]
  ) => {
    switch (type) {
      case "Bug":
        return "bg-red-50 text-red-600";

      case "Feature":
        return "bg-violet-50 text-violet-600";

      default:
        return "bg-kite-soft text-kite-muted";
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setProjectFilter("All");
    setTypeFilter("All");
    setDueFilter("All");
    setSortOption("Due date");
  };

  const filtersActive =
    Boolean(
      search.trim()
    ) ||
    statusFilter !== "All" ||
    priorityFilter !== "All" ||
    projectFilter !== "All" ||
    typeFilter !== "All" ||
    dueFilter !== "All" ||
    sortOption !== "Due date";

  return (
    <div className="mx-auto min-w-0 max-w-[1500px]">

      {/* PAGE HEADER */}
      <div className="mb-6 sm:mb-8">

        <p className="mb-1 truncate text-xs text-kite-muted sm:text-sm">
          {workspace?.name}
        </p>

        <h1 className="text-2xl font-semibold tracking-tight text-kite-ink sm:text-3xl">
          My Tasks
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-kite-muted">
          View and manage work assigned
          to you across all projects in
          your workspace.
        </p>

      </div>

      {/* PARTIAL ERROR */}
      {tasksError &&
        tasks.length > 0 && (
        <div
          className="mb-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >

          <div className="min-w-0">

            <p className="text-sm font-medium text-amber-800">
              Some tasks may be missing
            </p>

            <p className="mt-1 break-words text-xs leading-5 text-amber-700">
              {tasksError}
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              void refreshTasks()
            }
            className="w-full shrink-0 rounded-lg border border-amber-200 bg-white px-3 py-2.5 text-xs font-medium text-amber-800 transition hover:bg-amber-100 sm:w-auto"
          >
            Try Again
          </button>

        </div>
      )}

      {/* STATS */}
      <section className="mb-5 grid grid-cols-2 gap-2 sm:mb-6 sm:gap-4 xl:grid-cols-4">

        <TaskStatCard
          title="Assigned"
          value={
            stats.assigned
          }
          subtitle="Open tasks"
          icon="assigned"
        />

        <TaskStatCard
          title="In Progress"
          value={
            stats.inProgress
          }
          subtitle="Currently working"
          icon="progress"
        />

        <TaskStatCard
          title="In Review"
          value={
            stats.review
          }
          subtitle="Waiting for approval"
          icon="review"
        />

        <TaskStatCard
          title="Due Soon"
          value={
            stats.dueSoon
          }
          subtitle="Next 7 days"
          icon="due"
        />

      </section>

      {/* FILTERS */}
      <section className="mb-5 rounded-2xl border border-kite-line bg-white p-3 sm:p-4">

        {/* SEARCH */}
        <div className="relative min-w-0">

          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-kite-faint"
            aria-hidden="true"
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
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search my tasks..."
            className="w-full rounded-xl border border-kite-line bg-kite-soft py-3 pl-12 pr-4 text-sm text-kite-ink outline-none transition placeholder:text-kite-faint focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash"
          />

        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4">

          {/* PROJECT */}
          <select
            value={projectFilter}
            onChange={(event) =>
              setProjectFilter(
                event.target.value
              )
            }
            className="col-span-2 min-w-0 rounded-xl border border-kite-line bg-kite-soft px-3 py-3 text-sm text-kite-ink outline-none focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash sm:col-span-1 sm:px-4"
          >

            <option value="All">
              All projects
            </option>

            {myProjects.map(
              (project) => (
                <option
                  key={
                    project.id
                  }
                  value={
                    project.id
                  }
                >
                  {project.name}
                </option>
              )
            )}

          </select>

          {/* STATUS */}
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target
                  .value as
                  StatusFilter
              )
            }
            className="min-w-0 rounded-xl border border-kite-line bg-kite-soft px-3 py-3 text-sm text-kite-ink outline-none focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash sm:px-4"
          >

            <option value="All">
              All statuses
            </option>

            <option value="To Do">
              To Do
            </option>

            <option value="In Progress">
              In Progress
            </option>

            <option value="Review">
              Review
            </option>

            <option value="Done">
              Done
            </option>

          </select>

          {/* PRIORITY */}
          <select
            value={priorityFilter}
            onChange={(event) =>
              setPriorityFilter(
                event.target
                  .value as
                  PriorityFilter
              )
            }
            className="min-w-0 rounded-xl border border-kite-line bg-kite-soft px-3 py-3 text-sm text-kite-ink outline-none focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash sm:px-4"
          >

            <option value="All">
              All priorities
            </option>

            <option value="Urgent">
              Urgent
            </option>

            <option value="High">
              High
            </option>

            <option value="Medium">
              Medium
            </option>

            <option value="Low">
              Low
            </option>

          </select>

          {/* TYPE */}
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
            aria-label="Filter by task type"
            className="min-w-0 rounded-xl border border-kite-line bg-kite-soft px-3 py-3 text-sm text-kite-ink outline-none focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash sm:px-4"
          >
            <option value="All">All types</option>
            <option value="Task">Task</option>
            <option value="Feature">Feature</option>
            <option value="Bug">Bug</option>
          </select>

          {/* DUE DATE */}
          <select
            value={dueFilter}
            onChange={(event) => setDueFilter(event.target.value as DueFilter)}
            aria-label="Filter by due date"
            className="min-w-0 rounded-xl border border-kite-line bg-kite-soft px-3 py-3 text-sm text-kite-ink outline-none focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash sm:px-4"
          >
            <option value="All">Any due date</option>
            <option value="Overdue">Overdue</option>
            <option value="Today">Due today</option>
            <option value="Next 7 days">Due in next 7 days</option>
            <option value="No due date">No due date</option>
          </select>

          {/* SORT */}
          <select
            value={sortOption}
            onChange={(event) => setSortOption(event.target.value as SortOption)}
            aria-label="Sort tasks"
            className="min-w-0 rounded-xl border border-kite-line bg-kite-soft px-3 py-3 text-sm text-kite-ink outline-none focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash sm:px-4"
          >
            <option value="Due date">Sort: Due date</option>
            <option value="Priority">Sort: Priority</option>
            <option value="Newest">Sort: Newest</option>
            <option value="Oldest">Sort: Oldest</option>
          </select>

        </div>

      </section>

      {/* RESULT COUNT */}
      <div className="mb-4 flex min-h-6 items-center justify-between gap-3">

        <p className="text-sm text-kite-muted">

          <span className="font-medium text-kite-ink">
            {sortedTasks.length}
          </span>{" "}

          {sortedTasks.length === 1
            ? "task"
            : "tasks"}

        </p>

        {filtersActive && (
          <button
            type="button"
            onClick={
              clearFilters
            }
            className="shrink-0 text-xs font-medium text-kite-blue-deep transition hover:text-kite-ink sm:text-sm"
          >
            Clear filters
          </button>
        )}

      </div>

      {/* NO TASKS */}
      {myTasks.length === 0 && (
        <section className="rounded-2xl border border-kite-line bg-white px-5 py-12 text-center sm:px-6 sm:py-16">

          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-kite-blue-wash text-kite-blue-deep sm:h-16 sm:w-16">

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-7 w-7 sm:h-8 sm:w-8"
              aria-hidden="true"
            >
              <path d="M8 6h12M8 12h12M8 18h12" />

              <path d="m3 6 1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2" />
            </svg>

          </div>

          <h2 className="mt-5 text-lg font-semibold tracking-tight text-kite-ink sm:text-xl">
            Nothing assigned to you
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-kite-muted">
            Tasks assigned to you
            from projects in this
            workspace will appear
            here.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/projects"
              )
            }
            className="mt-6 w-full rounded-xl border border-kite-line bg-white px-5 py-3 text-sm font-medium text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink sm:w-auto"
          >
            View Projects
          </button>

        </section>
      )}

      {/* FILTER EMPTY */}
      {myTasks.length > 0 &&
        sortedTasks.length ===
          0 && (
        <section className="rounded-2xl border border-kite-line bg-white px-5 py-12 text-center sm:px-6 sm:py-14">

          <h2 className="text-lg font-semibold text-kite-ink">
            No matching tasks
          </h2>

          <p className="mt-2 text-sm text-kite-muted">
            Try changing your search
            or filters.
          </p>

          <button
            type="button"
            onClick={
              clearFilters
            }
            className="mt-5 text-sm font-medium text-kite-blue-deep transition hover:text-kite-ink"
          >
            Clear filters
          </button>

        </section>
      )}

      {/* MOBILE / TABLET */}
      {sortedTasks.length > 0 && (
        <div className="space-y-3 lg:hidden">

          {sortedTasks.map(
            (task) => {
              const project =
                getProject(
                  task.projectId
                );

              const overdue =
                isOverdue(
                  task
                );

              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() =>
                    navigate(
                      `/projects/${task.projectId}/tasks/${task.id}`
                    )
                  }
                  className="group w-full min-w-0 rounded-2xl border border-kite-line bg-white p-4 text-left transition active:scale-[0.995] sm:p-5"
                >

                  {/* TITLE */}
                  <div className="flex min-w-0 items-start justify-between gap-3">

                    <div className="min-w-0 flex-1">

                      <div className="flex min-w-0 flex-wrap items-center gap-2">

                        <h3 className="min-w-0 break-words text-sm font-semibold leading-5 text-kite-ink transition group-hover:text-kite-blue-deep">
                          {task.title}
                        </h3>

                        {overdue && (
                          <span className="shrink-0 rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
                            Overdue
                          </span>
                        )}

                      </div>

                      {task.description && (
                        <p className="mt-1.5 line-clamp-2 break-words text-xs leading-5 text-kite-muted">
                          {
                            task.description
                          }
                        </p>
                      )}

                    </div>

                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      className="mt-0.5 h-5 w-5 shrink-0 text-kite-faint transition group-hover:translate-x-0.5 group-hover:text-kite-blue-deep"
                      aria-hidden="true"
                    >
                      <path d="m9 6 6 6-6 6" />
                    </svg>

                  </div>

                  {/* PROJECT */}
                  <div className="mt-3 flex min-w-0 items-center gap-2 text-xs text-kite-muted">

                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      className="h-4 w-4 shrink-0 text-kite-faint"
                      aria-hidden="true"
                    >
                      <path d="M4 6h6l2 2h8v10H4Z" />
                    </svg>

                    <span className="truncate">
                      {project?.name ??
                        "Unknown project"}
                    </span>

                  </div>

                  {/* BADGES */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">

                    <span
                      className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-medium ${typeStyle(
                        task.type
                      )}`}
                    >
                      {task.type}
                    </span>

                    <span
                      className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-medium ${priorityStyle(
                        task.priority
                      )}`}
                    >
                      {
                        task.priority
                      }
                    </span>

                    <span
                      className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-medium ${statusStyle(
                        task.status
                      )}`}
                    >
                      {task.status}
                    </span>

                  </div>

                  {/* DUE */}
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-kite-line pt-3">

                    <span className="text-[10px] font-medium uppercase tracking-wide text-kite-faint">
                      Due date
                    </span>

                    <span
                      className={`text-xs ${
                        overdue
                          ? "font-medium text-red-500"
                          : "text-kite-muted"
                      }`}
                    >
                      {formatDate(
                        task.dueDate
                      )}
                    </span>

                  </div>

                </button>
              );
            }
          )}

        </div>
      )}

      {/* DESKTOP TABLE */}
      {sortedTasks.length > 0 && (
        <section className="hidden overflow-hidden rounded-2xl border border-kite-line bg-white lg:block">

          <div className="grid grid-cols-[minmax(240px,1.6fr)_minmax(150px,0.9fr)_100px_110px_130px_130px] border-b border-kite-line bg-kite-soft/60 px-5 py-3 text-xs font-medium uppercase tracking-wide text-kite-faint">

            <span>Task</span>
            <span>Project</span>
            <span>Type</span>
            <span>Priority</span>
            <span>Due Date</span>
            <span>Status</span>

          </div>

          <div className="divide-y divide-kite-line">

            {sortedTasks.map(
              (task) => {
                const project =
                  getProject(
                    task.projectId
                  );

                const overdue =
                  isOverdue(
                    task
                  );

                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() =>
                      navigate(
                        `/projects/${task.projectId}/tasks/${task.id}`
                      )
                    }
                    className="group grid w-full grid-cols-[minmax(240px,1.6fr)_minmax(150px,0.9fr)_100px_110px_130px_130px] items-center gap-4 px-5 py-4 text-left transition hover:bg-kite-soft/50"
                  >

                    {/* TASK */}
                    <div className="min-w-0">

                      <div className="flex items-center gap-2">

                        <p className="truncate text-sm font-medium text-kite-ink transition group-hover:text-kite-blue-deep">
                          {
                            task.title
                          }
                        </p>

                        {overdue && (
                          <span className="shrink-0 rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
                            Overdue
                          </span>
                        )}

                      </div>

                      {task.description && (
                        <p className="mt-1 line-clamp-1 text-xs text-kite-muted">
                          {
                            task.description
                          }
                        </p>
                      )}

                    </div>

                    {/* PROJECT */}
                    <div className="min-w-0">

                      <p className="truncate text-xs font-medium text-kite-muted">
                        {project?.name ??
                          "Unknown project"}
                      </p>

                    </div>

                    {/* TYPE */}
                    <div>

                      <span
                        className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${typeStyle(
                          task.type
                        )}`}
                      >
                        {task.type}
                      </span>

                    </div>

                    {/* PRIORITY */}
                    <div>

                      <span
                        className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${priorityStyle(
                          task.priority
                        )}`}
                      >
                        {
                          task.priority
                        }
                      </span>

                    </div>

                    {/* DUE */}
                    <div>

                      <span
                        className={`text-xs ${
                          overdue
                            ? "font-medium text-red-500"
                            : "text-kite-muted"
                        }`}
                      >
                        {formatDate(
                          task.dueDate
                        )}
                      </span>

                    </div>

                    {/* STATUS */}
                    <div>

                      <span
                        className={`inline-flex rounded-lg px-2.5 py-1.5 text-xs font-medium ${statusStyle(
                          task.status
                        )}`}
                      >
                        {task.status}
                      </span>

                    </div>

                  </button>
                );
              }
            )}

          </div>

        </section>
      )}

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| STAT CARD
|--------------------------------------------------------------------------
*/

type TaskStatCardProps = {
  title: string;

  value: number;

  subtitle: string;

  icon:
    | "assigned"
    | "progress"
    | "review"
    | "due";
};

function TaskStatCard({
  title,
  value,
  subtitle,
  icon,
}: TaskStatCardProps) {
  return (
    <div className="min-w-0 rounded-2xl border border-kite-line bg-white p-3 sm:p-5">

      <div className="flex min-w-0 items-start gap-2.5 sm:items-center sm:gap-4">

        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-kite-blue-wash text-kite-blue-deep sm:h-11 sm:w-11">

          {icon === "assigned" && (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-4.5 w-4.5 sm:h-5 sm:w-5"
              aria-hidden="true"
            >
              <path d="M8 6h12M8 12h12M8 18h12" />

              <path d="m3 6 1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2" />
            </svg>
          )}

          {icon === "progress" && (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-4.5 w-4.5 sm:h-5 sm:w-5"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
              />

              <path d="M12 7v5l3 2" />
            </svg>
          )}

          {icon === "review" && (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-4.5 w-4.5 sm:h-5 sm:w-5"
              aria-hidden="true"
            >
              <path d="M5 4h14v16H5z" />

              <path d="M8 8h8M8 12h5M8 16h3" />
            </svg>
          )}

          {icon === "due" && (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-4.5 w-4.5 sm:h-5 sm:w-5"
              aria-hidden="true"
            >
              <rect
                x="4"
                y="5"
                width="16"
                height="15"
                rx="2"
              />

              <path d="M8 3v4M16 3v4M4 10h16" />
            </svg>
          )}

        </div>

        <div className="min-w-0">

          <p className="truncate text-[10px] font-medium text-kite-muted sm:text-sm sm:font-normal">
            {title}
          </p>

          <p className="mt-0.5 text-xl font-semibold tracking-tight text-kite-ink sm:mt-1 sm:text-2xl">
            {value}
          </p>

          <p className="mt-1 hidden truncate text-xs text-kite-faint sm:block">
            {subtitle}
          </p>

        </div>

      </div>

    </div>
  );
}

export default MyTasksPage;
