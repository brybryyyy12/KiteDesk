import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  useNavigate,
} from "react-router";

import {
  useProjects,
} from "../../context/ProjectContext";

import {
  useTasks,
  type ProjectTask,
  type TaskStatus,
} from "../../context/TaskContext";

import {
  useWorkspace,
} from "../../context/WorkspaceContext";

import {
  useAuth,
} from "../../context/AuthContext";

import {
  activityService,
  type WorkspaceActivity,
} from "../../services/activity.service";

/*
|--------------------------------------------------------------------------
| MOBILE DASHBOARD SECTIONS
|--------------------------------------------------------------------------
*/

type MobileDashboardSection =
  | "tasks"
  | "projects"
  | "activity"
  | "deadlines";

const mobileDashboardSections: {
  id: MobileDashboardSection;
  label: string;
}[] = [
  {
    id: "tasks",
    label: "Tasks",
  },
  {
    id: "projects",
    label: "Projects",
  },
  {
    id: "activity",
    label: "Activity",
  },
  {
    id: "deadlines",
    label: "Deadlines",
  },
];

/*
|--------------------------------------------------------------------------
| DASHBOARD
|--------------------------------------------------------------------------
*/

function DashboardPage() {
  const navigate =
    useNavigate();

  const [
    mobileSection,
    setMobileSection,
  ] =
    useState<MobileDashboardSection>(
      "tasks"
    );

  const {
    workspace,
  } =
    useWorkspace();

  const {
    user,
    isLoading:
      authLoading,
  } =
    useAuth();

  const {
    projects,
    isLoaded:
      projectsLoaded,
    isLoading:
      projectsLoading,
    error:
      projectsError,
    refreshProjects,
  } =
    useProjects();

  const {
    tasks,
    isLoaded:
      tasksLoaded,
    isLoading:
      tasksLoading,
    error:
      tasksError,
    refreshTasks,
  } =
    useTasks();

  /*
  |--------------------------------------------------------------------------
  | WORKSPACE ACTIVITY
  |--------------------------------------------------------------------------
  */

  const [
    recentActivity,
    setRecentActivity,
  ] =
    useState<
      WorkspaceActivity[]
    >([]);

  const [
    activityLoading,
    setActivityLoading,
  ] =
    useState(false);

  const [
    activityError,
    setActivityError,
  ] =
    useState("");

  const [
    dashboardRetrying,
    setDashboardRetrying,
  ] =
    useState(false);

  const refreshActivity =
    useCallback(
      async () => {
        if (
          !workspace?.id
        ) {
          setRecentActivity(
            []
          );

          setActivityError(
            ""
          );

          setActivityLoading(
            false
          );

          return;
        }

        setActivityLoading(
          true
        );

        setActivityError(
          ""
        );

        try {
          const response =
            await activityService.getWorkspaceActivity(
              workspace.id,
              {
                page: 1,
                limit: 5,
              }
            );

          setRecentActivity(
            response.data
              .activities
          );
        } catch (
          caughtError
        ) {
          setRecentActivity(
            []
          );

          setActivityError(
            caughtError instanceof
              Error
              ? caughtError.message
              : "Unable to load recent activity."
          );
        } finally {
          setActivityLoading(
            false
          );
        }
      },
      [
        workspace?.id,
      ]
    );

  useEffect(
    () => {
      void refreshActivity();
    },
    [
      refreshActivity,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | RETRY DASHBOARD DATA
  |--------------------------------------------------------------------------
  */

  const retryDashboardData =
    useCallback(
      async () => {
        if (
          dashboardRetrying
        ) {
          return;
        }

        setDashboardRetrying(
          true
        );

        try {
          /*
           * If projects failed, retry them first.
           *
           * TaskContext watches the project list,
           * so a successful project refresh will
           * trigger the correct task reload.
           */
          if (
            projectsError
          ) {
            await refreshProjects();
          } else if (
            tasksError
          ) {
            await refreshTasks();
          } else {
            await Promise.all([
              refreshProjects(),
              refreshTasks(),
            ]);
          }

          await refreshActivity();
        } finally {
          setDashboardRetrying(
            false
          );
        }
      },
      [
        dashboardRetrying,
        projectsError,
        tasksError,
        refreshProjects,
        refreshTasks,
        refreshActivity,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | MY TASKS
  |--------------------------------------------------------------------------
  |
  */

  const myTasks =
    useMemo(
      () => {
        if (!user) {
          return [];
        }

        return tasks.filter(
          (task) =>
            task.assignee?.id ===
            user.id
        );
      },
      [
        tasks,
        user,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | STATS
  |--------------------------------------------------------------------------
  */

  const stats =
    useMemo(
      () => {
        const now =
          new Date();

        const sevenDays =
          new Date(
            now
          );

        sevenDays.setDate(
          now.getDate() +
            7
        );

        /*
         * All currently open
         * assignments.
         */
        const open =
          myTasks.filter(
            (task) =>
              task.status !==
              "Done"
          ).length;

        /*
         * Currently being worked.
         */
        const inProgress =
          myTasks.filter(
            (task) =>
              task.status ===
              "In Progress"
          ).length;

        /*
         * Finished tasks.
         */
        const completed =
          myTasks.filter(
            (task) =>
              task.status ===
              "Done"
          ).length;

        /*
         * Due within the next
         * seven days.
         *
         * Overdue tasks are not
         * counted as "Due Soon".
         */
        const dueSoon =
          myTasks.filter(
            (task) => {
              if (
                !task.dueDate ||
                task.status ===
                  "Done"
              ) {
                return false;
              }

              const due =
                new Date(
                  `${task.dueDate}T23:59:59`
                );

              return (
                due >=
                  now &&
                due <=
                  sevenDays
              );
            }
          ).length;

        return {
          open,
          inProgress,
          dueSoon,
          completed,
        };
      },
      [
        myTasks,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | CURRENT TASKS
  |--------------------------------------------------------------------------
  |
  | Open assignments ordered by:
  |
  | 1. nearest due date
  | 2. no due date
  | 3. newest created task
  |
  */

  const recentTasks =
    useMemo(
      () => {
        return [
          ...myTasks,
        ]
          .filter(
            (task) =>
              task.status !==
              "Done"
          )
          .sort(
            (
              a,
              b
            ) => {
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
            }
          )
          .slice(
            0,
            5
          );
      },
      [
        myTasks,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | UPCOMING / OVERDUE DEADLINES
  |--------------------------------------------------------------------------
  */

  const upcomingDeadlines =
    useMemo(
      () => {
        return [
          ...myTasks,
        ]
          .filter(
            (task) =>
              Boolean(
                task.dueDate
              ) &&
              task.status !==
                "Done"
          )
          .sort(
            (
              a,
              b
            ) => {
              const aDate =
                a.dueDate
                  ? new Date(
                      `${a.dueDate}T00:00:00`
                    ).getTime()
                  : Number.MAX_SAFE_INTEGER;

              const bDate =
                b.dueDate
                  ? new Date(
                      `${b.dueDate}T00:00:00`
                    ).getTime()
                  : Number.MAX_SAFE_INTEGER;

              return (
                aDate -
                bDate
              );
            }
          )
          .slice(
            0,
            5
          );
      },
      [
        myTasks,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | PROJECT OVERVIEW
  |--------------------------------------------------------------------------
  |
  | Project task counts are already
  | calculated by the backend.
  |
  | Do not recalculate them from the
  | workspace TaskContext.
  |
  */

  const projectOverview =
    useMemo(
      () => {
        return [
          ...projects,
        ]
          .sort(
            (
              a,
              b
            ) =>
              new Date(
                b.createdAt
              ).getTime() -
              new Date(
                a.createdAt
              ).getTime()
          )
          .slice(
            0,
            4
          );
      },
      [
        projects,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  const loading =
    authLoading ||
    !projectsLoaded ||
    projectsLoading ||
    !tasksLoaded ||
    tasksLoading;

  if (loading) {
    return (
      <div className="mx-auto max-w-[1500px] animate-pulse space-y-6">

        <div className="h-16 w-80 rounded-xl bg-kite-line" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {[1, 2, 3, 4].map(
            (item) => (
              <div
                key={
                  item
                }
                className="h-28 rounded-2xl bg-white"
              />
            )
          )}

        </div>

        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">

          <div className="h-96 rounded-2xl bg-white" />

          <div className="h-96 rounded-2xl bg-white" />

        </div>

        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">

          <div className="h-96 rounded-2xl bg-white" />

          <div className="h-96 rounded-2xl bg-white" />

        </div>

      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | GREETING
  |--------------------------------------------------------------------------
  */

  const greeting =
    getGreeting();

  const firstName =
    getFirstName(
      user?.name ??
        ""
    );

  const loadError =
    projectsError ||
    tasksError;

  const hasFatalDataError =
    (
      Boolean(
        projectsError
      ) &&
      projects.length ===
        0
    ) ||
    (
      Boolean(
        tasksError
      ) &&
      projects.length >
        0 &&
      tasks.length ===
        0
    );

  if (
    hasFatalDataError
  ) {
    return (
      <div className="mx-auto max-w-[1500px]">

        <div className="mb-7">

          <p className="text-xs text-kite-muted sm:text-sm">
            {
              workspace?.name
            }
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-kite-ink sm:text-3xl">
            {greeting},{" "}
            {firstName}
          </h1>

          <p className="mt-2 text-sm text-kite-muted">
            Here&apos;s what&apos;s
            happening with your work
            today.
          </p>

        </div>

        <section className="rounded-2xl border border-kite-line bg-white px-6 py-16 text-center">

          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-red-500">

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
              />

              <path d="M12 8v5" />

              <path d="M12 17h.01" />
            </svg>

          </div>

          <h2 className="mt-5 text-xl font-semibold tracking-tight text-kite-ink">
            Couldn&apos;t load your dashboard
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-kite-muted">
            {loadError ||
              "KiteDesk couldn't load the data needed for this dashboard."}
          </p>

          <button
            type="button"
            disabled={
              dashboardRetrying
            }
            onClick={() =>
              void retryDashboardData()
            }
            className="mt-6 rounded-xl bg-kite-blue-deep px-5 py-3 text-sm font-medium text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {dashboardRetrying
              ? "Trying again..."
              : "Try Again"}
          </button>

        </section>

      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px]">

      {/* HEADER */}
      <div className="mb-7">

        <p className="text-sm text-kite-muted">
          {
            workspace?.name
          }
        </p>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-kite-ink">
          {greeting},{" "}
          {firstName}
        </h1>

        <p className="mt-2 text-sm text-kite-muted">
          Here&apos;s what&apos;s
          happening with your work
          today.
        </p>

      </div>

      {/* PARTIAL LOAD ERROR */}
      {loadError && (
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <p className="text-sm font-medium text-amber-800">
              Some dashboard data may be incomplete.
            </p>

            <p className="mt-1 text-xs leading-5 text-amber-700">
              {
                loadError
              }
            </p>

          </div>

          <button
            type="button"
            disabled={
              dashboardRetrying
            }
            onClick={() =>
              void retryDashboardData()
            }
            className="shrink-0 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-medium text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {dashboardRetrying
              ? "Retrying..."
              : "Try Again"}
          </button>

        </div>
      )}

      {/* STATS */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">

        <DashboardStat
          label="My Tasks"
          value={
            stats.open
          }
          helper="Open assignments"
          icon="tasks"
        />

        <DashboardStat
          label="In Progress"
          value={
            stats.inProgress
          }
          helper="Currently working"
          icon="progress"
        />

        <DashboardStat
          label="Due Soon"
          value={
            stats.dueSoon
          }
          helper="Within 7 days"
          icon="due"
        />

        <DashboardStat
          label="Completed"
          value={
            stats.completed
          }
          helper="Your finished tasks"
          icon="done"
        />

      </section>

      {/* MOBILE / TABLET DASHBOARD SWITCHER */}
      <section className="mt-5 xl:hidden">

        <div className="grid grid-cols-4 gap-1 rounded-2xl border border-kite-line bg-white p-1.5">

          {mobileDashboardSections.map(
            (
              section
            ) => {
              const active =
                mobileSection ===
                section.id;

              return (
                <button
                  key={
                    section.id
                  }
                  type="button"
                  aria-pressed={
                    active
                  }
                  onClick={() =>
                    setMobileSection(
                      section.id
                    )
                  }
                  className={`min-w-0 rounded-xl px-1 py-2.5 text-[11px] font-medium transition sm:px-3 sm:text-xs ${
                    active
                      ? "bg-kite-blue-wash text-kite-blue-deep"
                      : "text-kite-muted hover:bg-kite-soft hover:text-kite-ink"
                  }`}
                >
                  <span className="block truncate">
                    {
                      section.label
                    }
                  </span>
                </button>
              );
            }
          )}

        </div>

        <p className="mt-2 px-1 text-[11px] text-kite-faint">
          Choose a section to keep the dashboard compact on smaller screens.
        </p>

      </section>

      {/* DASHBOARD PANELS */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">

        {/* RECENT TASKS */}
        <div
          className={`min-w-0 ${
            mobileSection ===
            "tasks"
              ? "block"
              : "hidden"
          } xl:block`}
        >

          <DashboardCard
          title="Recent Tasks"
          description="Your current assignments."
          actionLabel="View all"
          onAction={() =>
            navigate(
              "/my-tasks"
            )
          }
        >

          {recentTasks.length ===
          0 ? (
            <EmptyMessage
              title="No open tasks"
              text="Tasks assigned to you will appear here."
            />
          ) : (
            <div className="divide-y divide-kite-line">

              {recentTasks.map(
                (
                  task
                ) => {
                  const project =
                    projects.find(
                      (
                        item
                      ) =>
                        item.id ===
                        task.projectId
                    );

                  const overdue =
                    isTaskOverdue(
                      task
                    );

                  return (
                    <button
                      key={
                        task.id
                      }
                      type="button"
                      onClick={() =>
                        navigate(
                          `/projects/${task.projectId}/tasks/${task.id}`
                        )
                      }
                      className="flex w-full items-center gap-4 py-4 text-left transition hover:opacity-75"
                    >

                      <TaskStatusIcon
                        status={
                          task.status
                        }
                      />

                      <div className="min-w-0 flex-1">

                        <div className="flex items-center gap-2">

                          <p className="truncate text-sm font-medium text-kite-ink">
                            {
                              task.title
                            }
                          </p>

                          {overdue && (
                            <span className="shrink-0 rounded-md bg-red-50 px-2 py-0.5 text-[9px] font-medium text-red-600">
                              Overdue
                            </span>
                          )}

                        </div>

                        <p className="mt-1 truncate text-xs text-kite-muted">
                          {project?.name ??
                            "Unknown project"}
                        </p>

                      </div>

                      <div className="shrink-0 text-right">

                        <StatusBadge
                          status={
                            task.status
                          }
                        />

                        {task.dueDate && (
                          <p
                            className={`mt-1.5 text-[11px] ${
                              overdue
                                ? "font-medium text-red-500"
                                : "text-kite-faint"
                            }`}
                          >
                            {formatDate(
                              task.dueDate
                            )}
                          </p>
                        )}

                      </div>

                    </button>
                  );
                }
              )}

            </div>
          )}

          </DashboardCard>

        </div>

        {/* PROJECTS */}
        <div
          className={`min-w-0 ${
            mobileSection ===
            "projects"
              ? "block"
              : "hidden"
          } xl:block`}
        >

          <DashboardCard
          title="Projects Overview"
          description="Progress across your workspace."
          actionLabel="View projects"
          onAction={() =>
            navigate(
              "/projects"
            )
          }
        >

          {projectOverview.length ===
          0 ? (
            <EmptyMessage
              title="No projects yet"
              text={
                workspace?.role ===
                "Member"
                  ? "Projects you can access will appear here."
                  : "Create a project to start organizing work."
              }
            />
          ) : (
            <div className="space-y-5 py-5">

              {projectOverview.map(
                (
                  project
                ) => {
                  /*
                   * Backend-derived
                   * task counts.
                   */
                  const totalTasks =
                    project.totalTasks ??
                    0;

                  const completedTasks =
                    project.completedTasks ??
                    0;

                  const progress =
                    totalTasks ===
                    0
                      ? 0
                      : Math.round(
                          (
                            completedTasks /
                            totalTasks
                          ) *
                            100
                        );

                  return (
                    <button
                      key={
                        project.id
                      }
                      type="button"
                      onClick={() =>
                        navigate(
                          `/projects/${project.id}`
                        )
                      }
                      className="block w-full text-left transition hover:opacity-75"
                    >

                      <div className="flex items-center justify-between gap-4">

                        <div className="min-w-0">

                          <p className="truncate text-sm font-medium text-kite-ink">
                            {
                              project.name
                            }
                          </p>

                          <p className="mt-1 text-xs text-kite-muted">
                            {completedTasks} of{" "}
                            {totalTasks}{" "}
                            {totalTasks ===
                            1
                              ? "task"
                              : "tasks"}{" "}
                            completed
                          </p>

                        </div>

                        <span className="shrink-0 text-sm font-semibold text-kite-ink">
                          {
                            progress
                          }
                          %
                        </span>

                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-kite-soft">

                        <div
                          className="h-full rounded-full bg-kite-blue-deep transition-all duration-500"
                          style={{
                            width:
                              `${progress}%`,
                          }}
                        />

                      </div>

                    </button>
                  );
                }
              )}

            </div>
          )}

          </DashboardCard>

        </div>

        {/* ACTIVITY */}
        <div
          className={`min-w-0 ${
            mobileSection ===
            "activity"
              ? "block"
              : "hidden"
          } xl:block`}
        >

          <DashboardCard
          title="Recent Activity"
          description="Latest updates across your workspace."
        >

          {activityLoading ? (
            <div className="divide-y divide-kite-line">

              {[1, 2, 3].map(
                (item) => (
                  <div
                    key={
                      item
                    }
                    className="flex gap-3 py-4"
                  >

                    <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-kite-line" />

                    <div className="flex-1">

                      <div className="h-4 w-3/4 animate-pulse rounded bg-kite-line" />

                      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-kite-soft" />

                    </div>

                  </div>
                )
              )}

            </div>
          ) : activityError ? (
            <div className="py-8 text-center">

              <p className="text-sm font-medium text-red-600">
                Unable to load recent activity
              </p>

              <p className="mt-1 text-xs text-kite-muted">
                {
                  activityError
                }
              </p>

              <button
                type="button"
                onClick={() =>
                  void refreshActivity()
                }
                className="mt-4 rounded-xl border border-kite-line bg-white px-4 py-2 text-xs font-medium text-kite-blue-deep transition hover:bg-kite-soft"
              >
                Try again
              </button>

            </div>
          ) : recentActivity.length ===
          0 ? (
            <EmptyMessage
              title="No recent activity"
              text="Project and task changes will appear here."
            />
          ) : (
            <div className="divide-y divide-kite-line">

              {recentActivity.map(
                (
                  activity
                ) => {
                  const destination =
                    activity.task
                      ? `/projects/${activity.project.id}/tasks/${activity.task.id}`
                      : `/projects/${activity.project.id}`;

                  return (
                    <button
                      key={
                        activity.id
                      }
                      type="button"
                      onClick={() =>
                        navigate(
                          destination
                        )
                      }
                      className="flex w-full gap-3 py-4 text-left transition hover:opacity-75"
                    >

                      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-kite-blue-wash text-xs text-kite-blue-deep">
                        •
                      </div>

                      <div className="min-w-0 flex-1">

                        <p className="text-sm leading-6 text-kite-ink">
                          {
                            activity.message
                          }
                        </p>

                        <p className="mt-1 truncate text-xs text-kite-muted">

                          {activity.task ? (
                            <>
                              {
                                activity
                                  .task
                                  .title
                              }{" "}
                              ·{" "}
                            </>
                          ) : null}

                          {
                            activity
                              .project
                              .name
                          }{" "}
                          ·{" "}
                          {formatRelativeTime(
                            activity.createdAt
                          )}

                        </p>

                      </div>

                    </button>
                  );
                }
              )}

            </div>
          )}

          </DashboardCard>

        </div>

        {/* DEADLINES */}
        <div
          className={`min-w-0 ${
            mobileSection ===
            "deadlines"
              ? "block"
              : "hidden"
          } xl:block`}
        >

          <DashboardCard
          title="Upcoming Deadlines"
          description="Your nearest task deadlines."
          actionLabel="My Tasks"
          onAction={() =>
            navigate(
              "/my-tasks"
            )
          }
        >

          {upcomingDeadlines.length ===
          0 ? (
            <EmptyMessage
              title="No upcoming deadlines"
              text="You're clear for now."
            />
          ) : (
            <div className="divide-y divide-kite-line">

              {upcomingDeadlines.map(
                (
                  task
                ) => (
                  <button
                    key={
                      task.id
                    }
                    type="button"
                    onClick={() =>
                      navigate(
                        `/projects/${task.projectId}/tasks/${task.id}`
                      )
                    }
                    className="flex w-full items-center gap-4 py-4 text-left transition hover:opacity-75"
                  >

                    <DeadlineDate
                      task={
                        task
                      }
                    />

                    <div className="min-w-0 flex-1">

                      <p className="truncate text-sm font-medium text-kite-ink">
                        {
                          task.title
                        }
                      </p>

                      <p className="mt-1 text-xs text-kite-muted">
                        {
                          task.priority
                        }{" "}
                        priority
                      </p>

                    </div>

                    <StatusBadge
                      status={
                        task.status
                      }
                    />

                  </button>
                )
              )}

            </div>
          )}

          </DashboardCard>

        </div>

      </div>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| DASHBOARD CARD
|--------------------------------------------------------------------------
*/

function DashboardCard({
  title,
  description,
  actionLabel,
  onAction,
  children,
}: {
  title:
    string;

  description:
    string;

  actionLabel?:
    string;

  onAction?:
    () => void;

  children:
    ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-kite-line bg-white">

      <div className="flex items-start justify-between gap-3 border-b border-kite-line px-4 py-4 sm:items-center sm:px-6">

        <div>

          <h2 className="font-semibold text-kite-ink">
            {
              title
            }
          </h2>

          <p className="mt-1 text-sm text-kite-muted">
            {
              description
            }
          </p>

        </div>

        {actionLabel &&
          onAction && (
          <button
            type="button"
            onClick={
              onAction
            }
            className="shrink-0 text-xs font-medium text-kite-blue-deep transition hover:text-kite-ink"
          >
            {
              actionLabel
            }
          </button>
        )}

      </div>

      <div className="px-4 sm:px-6">
        {
          children
        }
      </div>

    </section>
  );
}

/*
|--------------------------------------------------------------------------
| STAT
|--------------------------------------------------------------------------
*/

function DashboardStat({
  label,
  value,
  helper,
  icon,
}: {
  label:
    string;

  value:
    number;

  helper:
    string;

  icon:
    | "tasks"
    | "progress"
    | "due"
    | "done";
}) {
  return (
    <div className="rounded-2xl border border-kite-line bg-white p-4 sm:p-5">

      <div className="flex items-center gap-3 sm:gap-4">

        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-kite-blue-wash text-kite-blue-deep sm:h-11 sm:w-11">

          <StatIcon
            icon={
              icon
            }
          />

        </div>

        <div>

          <p className="text-sm text-kite-muted">
            {
              label
            }
          </p>

          <p className="mt-1 text-xl font-semibold tracking-tight text-kite-ink sm:text-2xl">
            {
              value
            }
          </p>

          <p className="mt-1 hidden text-xs text-kite-faint sm:block">
            {
              helper
            }
          </p>

        </div>

      </div>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| STAT ICON
|--------------------------------------------------------------------------
*/

function StatIcon({
  icon,
}: {
  icon:
    | "tasks"
    | "progress"
    | "due"
    | "done";
}) {
  if (
    icon ===
    "progress"
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        className="h-5 w-5"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
        />

        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (
    icon ===
    "due"
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        className="h-5 w-5"
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
    );
  }

  if (
    icon ===
    "done"
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        className="h-5 w-5"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
        />

        <path d="m8 12 3 3 5-6" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-5 w-5"
    >
      <path d="M8 6h12M8 12h12M8 18h12" />

      <path d="m3 6 1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2" />
    </svg>
  );
}

/*
|--------------------------------------------------------------------------
| TASK STATUS ICON
|--------------------------------------------------------------------------
*/

function TaskStatusIcon({
  status,
}: {
  status:
    TaskStatus;
}) {
  const style =
    status ===
    "Review"
      ? "bg-violet-50 text-violet-600"
      : status ===
          "In Progress"
        ? "bg-kite-blue-wash text-kite-blue-deep"
        : status ===
            "Done"
          ? "bg-emerald-50 text-emerald-600"
          : "bg-kite-soft text-kite-muted";

  return (
    <div
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${style}`}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| STATUS BADGE
|--------------------------------------------------------------------------
*/

function StatusBadge({
  status,
}: {
  status:
    TaskStatus;
}) {
  const style =
    status ===
    "Done"
      ? "bg-emerald-50 text-emerald-700"
      : status ===
          "Review"
        ? "bg-violet-50 text-violet-700"
        : status ===
            "In Progress"
          ? "bg-kite-blue-wash text-kite-blue-deep"
          : "bg-kite-soft text-kite-muted";

  return (
    <span
      className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-medium ${style}`}
    >
      {
        status
      }
    </span>
  );
}

/*
|--------------------------------------------------------------------------
| DEADLINE
|--------------------------------------------------------------------------
*/

function DeadlineDate({
  task,
}: {
  task:
    ProjectTask;
}) {
  if (
    !task.dueDate
  ) {
    return null;
  }

  const due =
    new Date(
      `${task.dueDate}T23:59:59`
    );

  const overdue =
    due <
    new Date();

  return (
    <div
      className={`grid h-11 min-w-[52px] shrink-0 place-items-center rounded-xl px-2 text-center ${
        overdue
          ? "bg-red-50 text-red-600"
          : "bg-kite-soft text-kite-muted"
      }`}
    >

      <div>

        <p className="text-[10px] font-medium uppercase">
          {due.toLocaleDateString(
            "en-US",
            {
              month:
                "short",
            }
          )}
        </p>

        <p className="text-sm font-semibold">
          {
            due.getDate()
          }
        </p>

      </div>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| EMPTY
|--------------------------------------------------------------------------
*/

function EmptyMessage({
  title,
  text,
}: {
  title:
    string;

  text:
    string;
}) {
  return (
    <div className="py-10 text-center">

      <p className="text-sm font-medium text-kite-ink">
        {
          title
        }
      </p>

      <p className="mt-1 text-xs text-kite-muted">
        {
          text
        }
      </p>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function getGreeting() {
  const hour =
    new Date().getHours();

  if (
    hour <
    12
  ) {
    return "Good morning";
  }

  if (
    hour <
    18
  ) {
    return "Good afternoon";
  }

  return "Good evening";
}

function getFirstName(
  name:
    string
) {
  return (
    name
      .trim()
      .split(
        /\s+/
      )[0] ||
    "there"
  );
}

function formatDate(
  date:
    string
) {
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
}

function isTaskOverdue(
  task:
    ProjectTask
) {
  if (
    !task.dueDate ||
    task.status ===
      "Done"
  ) {
    return false;
  }

  return (
    new Date(
      `${task.dueDate}T23:59:59`
    ) <
    new Date()
  );
}

function formatRelativeTime(
  value:
    string
) {
  const date =
    new Date(
      value
    );

  const now =
    new Date();

  const difference =
    now.getTime() -
    date.getTime();

  /*
   * Future timestamps can happen
   * because of small clock
   * differences.
   */
  if (
    difference <
    0
  ) {
    return "Just now";
  }

  const minutes =
    Math.floor(
      difference /
        60000
    );

  const hours =
    Math.floor(
      difference /
        (
          1000 *
          60 *
          60
        )
    );

  const days =
    Math.floor(
      difference /
        (
          1000 *
          60 *
          60 *
          24
        )
    );

  if (
    minutes <
    1
  ) {
    return "Just now";
  }

  if (
    minutes <
    60
  ) {
    return `${minutes}m ago`;
  }

  if (
    hours <
    24
  ) {
    return `${hours}h ago`;
  }

  if (
    days <
    7
  ) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month:
        "short",

      day:
        "numeric",
    }
  );
}

export default DashboardPage;