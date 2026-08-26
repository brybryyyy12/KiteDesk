import {
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router";

import type {
  Project,
} from "../../context/ProjectContext";

import {
  useTasks,
  type TaskActivity,
} from "../../context/TaskContext";

type ProjectActivitySectionProps = {
  project: Project;
};

type ActivityFilter =
  | "All"
  | "Status"
  | "Comments"
  | "Attachments"
  | "Assignments";

type ActivityKind =
  | "project"
  | "status"
  | "comment"
  | "attachment"
  | "assignment"
  | "priority"
  | "task";

type ProjectActivityItem = {
  id: string;

  taskId: string | null;

  taskTitle: string | null;

  actor: string;

  message: string;

  createdAt: string;

  kind: ActivityKind;
};

const filters: ActivityFilter[] = [
  "All",
  "Status",
  "Comments",
  "Attachments",
  "Assignments",
];

function getActivityKind(
  activity: TaskActivity
): ActivityKind {
  const message =
    activity.message.toLowerCase();

  if (
    message.includes("status") ||
    message.includes("approved") ||
    message.includes("done")
  ) {
    return "status";
  }

  if (
    message.includes("comment")
  ) {
    return "comment";
  }

  if (
    message.includes("attached")
  ) {
    return "attachment";
  }

  if (
    message.includes("assigned") ||
    message.includes("assignee")
  ) {
    return "assignment";
  }

  if (
    message.includes("priority")
  ) {
    return "priority";
  }

  return "task";
}

function ProjectActivitySection({
  project,
}: ProjectActivitySectionProps) {
  const navigate =
    useNavigate();

  const {
    getTasksByProject,
  } = useTasks();

  const projectTasks =
    getTasksByProject(
      project.id
    );

  const [
    selectedFilter,
    setSelectedFilter,
  ] =
    useState<ActivityFilter>(
      "All"
    );

  const [search, setSearch] =
    useState("");

  /*
   * Flatten activity from every
   * task inside the project.
   */
  const allActivity =
    useMemo(() => {
      const activityItems:
        ProjectActivityItem[] =
        [];

      /*
       * Project creation event.
       */
      activityItems.push({
        id: `project-${project.id}`,

        taskId: null,

        taskTitle: null,

        actor: "Project",

        message: `${project.name} was created.`,

        createdAt:
          project.createdAt,

        kind: "project",
      });

      /*
       * Task activity events.
       */
      projectTasks.forEach(
        (task) => {
          const taskActivity =
            task.activity ?? [];

          taskActivity.forEach(
            (activity) => {
              activityItems.push({
                id: `${task.id}-${activity.id}`,

                taskId:
                  task.id,

                taskTitle:
                  task.title,

                actor:
                  activity.actor,

                message:
                  activity.message,

                createdAt:
                  activity.createdAt,

                kind:
                  getActivityKind(
                    activity
                  ),
              });
            }
          );
        }
      );

      /*
       * Newest activity first.
       */
      return activityItems.sort(
        (a, b) =>
          new Date(
            b.createdAt
          ).getTime() -
          new Date(
            a.createdAt
          ).getTime()
      );
    }, [
      project,
      projectTasks,
    ]);

  const filteredActivity =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return allActivity.filter(
        (activity) => {
          let matchesFilter =
            true;

          if (
            selectedFilter ===
            "Status"
          ) {
            matchesFilter =
              activity.kind ===
                "status";
          }

          if (
            selectedFilter ===
            "Comments"
          ) {
            matchesFilter =
              activity.kind ===
                "comment";
          }

          if (
            selectedFilter ===
            "Attachments"
          ) {
            matchesFilter =
              activity.kind ===
                "attachment";
          }

          if (
            selectedFilter ===
            "Assignments"
          ) {
            matchesFilter =
              activity.kind ===
                "assignment";
          }

          const matchesSearch =
            !query ||
            activity.actor
              .toLowerCase()
              .includes(query) ||
            activity.message
              .toLowerCase()
              .includes(query) ||
            activity.taskTitle
              ?.toLowerCase()
              .includes(query);

          return (
            matchesFilter &&
            matchesSearch
          );
        }
      );
    }, [
      allActivity,
      search,
      selectedFilter,
    ]);

  const todayCount =
    useMemo(() => {
      const today =
        new Date();

      return allActivity.filter(
        (activity) => {
          const date =
            new Date(
              activity.createdAt
            );

          return (
            date.getFullYear() ===
              today.getFullYear() &&
            date.getMonth() ===
              today.getMonth() &&
            date.getDate() ===
              today.getDate()
          );
        }
      ).length;
    }, [allActivity]);

  const commentCount =
    allActivity.filter(
      (activity) =>
        activity.kind ===
        "comment"
    ).length;

  const attachmentCount =
    allActivity.filter(
      (activity) =>
        activity.kind ===
        "attachment"
    ).length;

  const statusCount =
    allActivity.filter(
      (activity) =>
        activity.kind ===
        "status"
    ).length;

  const formatDateTime = (
    value: string
  ) => {
    return new Date(
      value
    ).toLocaleString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    );
  };

  const formatRelativeDate = (
    value: string
  ) => {
    const date =
      new Date(value);

    const now =
      new Date();

    const diff =
      now.getTime() -
      date.getTime();

    const minutes =
      Math.floor(
        diff / 60000
      );

    const hours =
      Math.floor(
        diff /
          (1000 *
            60 *
            60)
      );

    const days =
      Math.floor(
        diff /
          (1000 *
            60 *
            60 *
            24)
      );

    if (minutes < 1) {
      return "Just now";
    }

    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    if (hours < 24) {
      return `${hours}h ago`;
    }

    if (days === 1) {
      return "Yesterday";
    }

    if (days < 7) {
      return `${days}d ago`;
    }

    return formatDateTime(
      value
    );
  };

  const activityIcon = (
    kind: ActivityKind
  ) => {
    switch (kind) {
      case "status":
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4"
          >
            <path d="m5 12 4 4L19 6" />
          </svg>
        );

      case "comment":
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4"
          >
            <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
          </svg>
        );

      case "attachment":
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4"
          >
            <path d="M8 12.5 13.5 7a3 3 0 0 1 4.2 4.2l-7.2 7.2a5 5 0 0 1-7.1-7.1l7.8-7.8" />
          </svg>
        );

      case "assignment":
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4"
          >
            <circle
              cx="9"
              cy="8"
              r="3"
            />

            <path d="M4 19c.6-3.2 2.3-5 5-5s4.4 1.8 5 5M17 9v6M14 12h6" />
          </svg>
        );

      case "priority":
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4"
          >
            <path d="M6 20V5M6 5h10l-2 4 2 4H6" />
          </svg>
        );

      case "project":
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4"
          >
            <path d="M3 7.5a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
          </svg>
        );

      default:
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4"
          >
            <path d="M8 6h12M8 12h12M8 18h12" />
            <circle
              cx="4"
              cy="6"
              r="1"
              fill="currentColor"
            />
            <circle
              cx="4"
              cy="12"
              r="1"
              fill="currentColor"
            />
            <circle
              cx="4"
              cy="18"
              r="1"
              fill="currentColor"
            />
          </svg>
        );
    }
  };

  const activityIconStyle = (
    kind: ActivityKind
  ) => {
    switch (kind) {
      case "status":
        return "bg-emerald-50 text-emerald-600";

      case "comment":
        return "bg-violet-50 text-violet-600";

      case "attachment":
        return "bg-orange-50 text-orange-600";

      case "assignment":
        return "bg-kite-blue-wash text-kite-blue-deep";

      case "priority":
        return "bg-amber-50 text-amber-600";

      case "project":
        return "bg-kite-blue-wash text-kite-blue-deep";

      default:
        return "bg-kite-soft text-kite-muted";
    }
  };

  return (
    <section>

      {/* HEADER */}
      <div className="mb-6">

        <h2 className="text-xl font-semibold tracking-tight text-kite-ink">
          Project Activity
        </h2>

        <p className="mt-1 text-sm text-kite-muted">
          Follow task updates,
          comments, assignments,
          reviews, and files across
          this project.
        </p>

      </div>

      {/* SUMMARY */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <ActivityStat
          label="Total Activity"
          value={
            allActivity.length
          }
        />

        <ActivityStat
          label="Today"
          value={todayCount}
        />

        <ActivityStat
          label="Status Updates"
          value={statusCount}
        />

        <ActivityStat
          label="Comments"
          value={commentCount}
        />

      </div>

      {/* MAIN GRID */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">

        {/* TIMELINE */}
        <section className="overflow-hidden rounded-2xl border border-kite-line bg-white">

          {/* TOOLBAR */}
          <div className="border-b border-kite-line p-4 sm:p-5">

            <div className="flex flex-col gap-3 lg:flex-row">

              {/* SEARCH */}
              <div className="relative flex-1">

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
                  value={search}
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event.target
                        .value
                    )
                  }
                  placeholder="Search activity..."
                  className="w-full rounded-xl border border-kite-line bg-kite-soft py-3 pl-12 pr-4 text-sm text-kite-ink outline-none transition placeholder:text-kite-faint focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash"
                />

              </div>

              {/* FILTER */}
              <select
                value={
                  selectedFilter
                }
                onChange={(
                  event
                ) =>
                  setSelectedFilter(
                    event.target
                      .value as ActivityFilter
                  )
                }
                className="rounded-xl border border-kite-line bg-kite-soft px-4 py-3 text-sm text-kite-ink outline-none focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash lg:min-w-[180px]"
              >

                {filters.map(
                  (filter) => (
                    <option
                      key={
                        filter
                      }
                      value={
                        filter
                      }
                    >
                      {filter}
                    </option>
                  )
                )}

              </select>

            </div>

          </div>

          {/* EMPTY RESULT */}
          {filteredActivity.length ===
            0 && (
            <div className="px-6 py-16 text-center">

              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-kite-soft text-kite-muted">

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-7 w-7"
                >
                  <path d="M4 12h3l2-6 4 12 2-6h5" />
                </svg>

              </div>

              <h3 className="mt-4 font-semibold text-kite-ink">
                No matching activity
              </h3>

              <p className="mt-2 text-sm text-kite-muted">
                Try another search or
                activity filter.
              </p>

            </div>
          )}

          {/* ACTIVITY ITEMS */}
          {filteredActivity.length >
            0 && (
            <div className="px-5 py-2 sm:px-6">

              {filteredActivity.map(
                (
                  activity,
                  index
                ) => {
                  const hasNext =
                    index <
                    filteredActivity.length -
                      1;

                  return (
                    <div
                      key={
                        activity.id
                      }
                      className="relative flex gap-4 py-5"
                    >

                      {/* TIMELINE LINE */}
                      {hasNext && (
                        <div className="absolute left-[19px] top-[52px] h-[calc(100%-20px)] w-px bg-kite-line" />
                      )}

                      {/* ICON */}
                      <div
                        className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${activityIconStyle(
                          activity.kind
                        )}`}
                      >
                        {activityIcon(
                          activity.kind
                        )}
                      </div>

                      {/* CONTENT */}
                      <div className="min-w-0 flex-1">

                        <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-start">

                          <div className="min-w-0">

                            <p className="text-sm leading-6 text-kite-ink">

                              {activity.kind !==
                                "project" && (
                                <>
                                  <span className="font-medium">
                                    {
                                      activity.actor
                                    }
                                  </span>{" "}
                                </>
                              )}

                              {
                                activity.message
                              }

                            </p>

                            {activity.taskTitle &&
                              activity.taskId && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate(
                                      `/projects/${project.id}/tasks/${activity.taskId}`
                                    )
                                  }
                                  className="mt-2 inline-flex max-w-full items-center gap-2 rounded-lg bg-kite-soft px-3 py-2 text-xs text-kite-muted transition hover:bg-kite-blue-wash hover:text-kite-blue-deep"
                                >

                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    className="h-3.5 w-3.5 shrink-0"
                                  >
                                    <path d="M8 6h12M8 12h12M8 18h12" />
                                    <circle
                                      cx="4"
                                      cy="6"
                                      r="1"
                                      fill="currentColor"
                                    />
                                    <circle
                                      cx="4"
                                      cy="12"
                                      r="1"
                                      fill="currentColor"
                                    />
                                    <circle
                                      cx="4"
                                      cy="18"
                                      r="1"
                                      fill="currentColor"
                                    />
                                  </svg>

                                  <span className="truncate">
                                    {
                                      activity.taskTitle
                                    }
                                  </span>

                                </button>
                              )}

                          </div>

                          <span
                            title={formatDateTime(
                              activity.createdAt
                            )}
                            className="shrink-0 text-xs text-kite-faint"
                          >
                            {formatRelativeDate(
                              activity.createdAt
                            )}
                          </span>

                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </section>

        {/* SIDEBAR */}
        <aside className="space-y-5">

          {/* ACTIVITY TYPES */}
          <section className="rounded-2xl border border-kite-line bg-white">

            <div className="border-b border-kite-line px-5 py-4">

              <h3 className="font-semibold text-kite-ink">
                Activity Summary
              </h3>

            </div>

            <div className="space-y-4 p-5">

              <SummaryRow
                label="Status updates"
                value={statusCount}
                kind="status"
              />

              <SummaryRow
                label="Comments"
                value={commentCount}
                kind="comment"
              />

              <SummaryRow
                label="Attachments"
                value={
                  attachmentCount
                }
                kind="attachment"
              />

              <SummaryRow
                label="Assignments"
                value={
                  allActivity.filter(
                    (
                      activity
                    ) =>
                      activity.kind ===
                      "assignment"
                  ).length
                }
                kind="assignment"
              />

            </div>

          </section>

          {/* PROJECT INFO */}
          <section className="rounded-2xl border border-kite-line bg-white p-5">

            <p className="text-xs font-medium uppercase tracking-wide text-kite-faint">
              Project
            </p>

            <p className="mt-2 font-medium text-kite-ink">
              {project.name}
            </p>

            <div className="mt-5 h-px bg-kite-line" />

            <div className="mt-5">

              <p className="text-xs font-medium uppercase tracking-wide text-kite-faint">
                Tasks
              </p>

              <p className="mt-2 text-2xl font-semibold text-kite-ink">
                {
                  projectTasks.length
                }
              </p>

            </div>

            <div className="mt-5">

              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/projects/${project.id}/tasks`
                  )
                }
                className="w-full rounded-xl border border-kite-line bg-kite-soft px-4 py-2.5 text-sm font-medium text-kite-muted transition hover:bg-kite-blue-wash hover:text-kite-blue-deep"
              >
                View Project Tasks
              </button>

            </div>

          </section>

        </aside>

      </div>

    </section>
  );
}

function ActivityStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-kite-line bg-white p-5">

      <p className="text-sm text-kite-muted">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold tracking-tight text-kite-ink">
        {value}
      </p>

    </div>
  );
}

function SummaryRow({
  label,
  value,
  kind,
}: {
  label: string;
  value: number;
  kind:
    | "status"
    | "comment"
    | "attachment"
    | "assignment";
}) {
  const iconClass =
    kind === "status"
      ? "bg-emerald-50 text-emerald-600"
      : kind ===
          "comment"
        ? "bg-violet-50 text-violet-600"
        : kind ===
            "attachment"
          ? "bg-orange-50 text-orange-600"
          : "bg-kite-blue-wash text-kite-blue-deep";

  return (
    <div className="flex items-center gap-3">

      <div
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${iconClass}`}
      >
        {kind ===
          "status" && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4"
          >
            <path d="m5 12 4 4L19 6" />
          </svg>
        )}

        {kind ===
          "comment" && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4"
          >
            <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
          </svg>
        )}

        {kind ===
          "attachment" && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4"
          >
            <path d="M8 12.5 13.5 7a3 3 0 0 1 4.2 4.2l-7.2 7.2a5 5 0 0 1-7.1-7.1l7.8-7.8" />
          </svg>
        )}

        {kind ===
          "assignment" && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4"
          >
            <circle
              cx="9"
              cy="8"
              r="3"
            />

            <path d="M4 19c.6-3.2 2.3-5 5-5s4.4 1.8 5 5M17 9v6M14 12h6" />
          </svg>
        )}

      </div>

      <div className="min-w-0 flex-1">

        <p className="text-sm text-kite-muted">
          {label}
        </p>

      </div>

      <span className="text-sm font-semibold text-kite-ink">
        {value}
      </span>

    </div>
  );
}

export default ProjectActivitySection;