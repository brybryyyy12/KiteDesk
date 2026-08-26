import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router";

import {
  useProjects,
  type ProjectStatus,
} from "../../context/ProjectContext";

import {
  useWorkspace,
} from "../../context/WorkspaceContext";

import {
  hasPermission,
} from "../../lib/permissions";

import ProjectTasksSection from "./ProjectTasksSection";

import ProjectBoardSection from "./ProjectBoardSection";

import ProjectActivitySection from "../../components/projects/ProjectActivitySection";

import ProjectSettingsSection from "../../components/projects/ProjectSettingsSection";

const tabs = [
  {
    id: "overview",
    label: "Overview",
  },
  {
    id: "board",
    label: "Board",
  },
  {
    id: "tasks",
    label: "Tasks",
  },
  {
    id: "activity",
    label: "Activity",
  },
  {
    id: "settings",
    label: "Settings",
    managementOnly: true,
  },
];

function ProjectDetailsPage() {
  const {
    projectId,
  } = useParams();

  const location =
    useLocation();

  const navigate =
    useNavigate();

  const {
    workspace,
  } =
    useWorkspace();

  const {
    getProject,
    isLoaded,
  } =
    useProjects();

  const role =
    workspace?.role ??
    "Member";

  const canManageProject =
    hasPermission(
      role,
      "manageProject"
    );

  /*
  |--------------------------------------------------------------------------
  | PROJECT
  |--------------------------------------------------------------------------
  */

  const project =
    projectId
      ? getProject(
          projectId
        )
      : undefined;

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-[1500px]">

        <div className="animate-pulse space-y-5">

          <div className="h-4 w-28 rounded bg-kite-line sm:h-5 sm:w-40" />

          <div className="h-8 w-60 max-w-full rounded-xl bg-kite-line sm:h-10 sm:w-80" />

          <div className="h-12 rounded-2xl bg-white sm:h-16" />

          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">

            {[1, 2, 3, 4].map(
              (item) => (
                <div
                  key={
                    item
                  }
                  className="h-24 rounded-2xl bg-white sm:h-28"
                />
              )
            )}

          </div>

          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">

            <div className="h-64 rounded-2xl bg-white" />

            <div className="h-64 rounded-2xl bg-white" />

          </div>

        </div>

      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | PROJECT NOT FOUND
  |--------------------------------------------------------------------------
  */

  if (
    !projectId ||
    !project
  ) {
    return (
      <div className="mx-auto max-w-[1500px]">

        <section className="rounded-2xl border border-kite-line bg-white px-5 py-12 text-center sm:px-6 sm:py-16">

          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-kite-soft text-kite-muted sm:h-16 sm:w-16">

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="h-7 w-7 sm:h-8 sm:w-8"
            >
              <path d="M3 7.5a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />

              <path d="m9 11 6 6M15 11l-6 6" />
            </svg>

          </div>

          <h1 className="mt-5 text-xl font-semibold tracking-tight text-kite-ink sm:text-2xl">
            Project not found
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-kite-muted">
            This project may have been removed or doesn&apos;t belong to the current workspace.
          </p>

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

  /*
  |--------------------------------------------------------------------------
  | PROJECT ROUTING
  |--------------------------------------------------------------------------
  */

  const basePath =
    `/projects/${project.id}`;

  const remainingPath =
    location.pathname
      .replace(
        basePath,
        ""
      )
      .replace(
        /^\/+/,
        ""
      );

  const currentSection =
    remainingPath
      .split("/")[0] ||
    "overview";

  const validSections = [
    "overview",
    "board",
    "tasks",
    "activity",
    "settings",
  ];

  if (
    !validSections.includes(
      currentSection
    )
  ) {
    return (
      <div className="mx-auto max-w-[1500px]">

        <section className="rounded-2xl border border-kite-line bg-white px-5 py-12 text-center sm:px-6 sm:py-16">

          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-kite-soft text-kite-muted sm:h-16 sm:w-16">

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="h-7 w-7 sm:h-8 sm:w-8"
            >
              <path d="M12 8v5M12 17h.01" />

              <circle
                cx="12"
                cy="12"
                r="9"
              />
            </svg>

          </div>

          <h1 className="mt-5 text-xl font-semibold tracking-tight text-kite-ink sm:text-2xl">
            Page not found
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-kite-muted">
            This section doesn&apos;t exist in this project.
          </p>

          <Link
            to={basePath}
            className="mt-6 inline-flex rounded-xl bg-kite-blue-deep px-5 py-3 text-sm font-medium text-white transition hover:brightness-95"
          >
            Back to Project
          </Link>

        </section>

      </div>
    );
  }

  /*
   * Members cannot access
   * Project Settings, even if
   * they manually type the URL.
   */
  if (
    currentSection ===
      "settings" &&
    !canManageProject
  ) {
    return (
      <Navigate
        to={
          basePath
        }
        replace
      />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | PROJECT PROGRESS
  |--------------------------------------------------------------------------
  */

  const progress =
    project.totalTasks ===
    0
      ? 0
      : Math.round(
          (
            project.completedTasks /
            project.totalTasks
          ) *
            100
        );

  /*
  |--------------------------------------------------------------------------
  | FORMATTERS
  |--------------------------------------------------------------------------
  */

  const formatDate = (
    value: string | null
  ) => {
    if (!value) {
      return "No deadline";
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

  const formatShortDate =
    (
      value:
        string | null
    ) => {
      if (!value) {
        return "None";
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
        }
      );
    };

  const formatCreatedDate =
    (
      value: string
    ) => {
      return new Date(
        value
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

  /*
  |--------------------------------------------------------------------------
  | STATUS STYLE
  |--------------------------------------------------------------------------
  */

  const getStatusStyle =
    (
      status:
        ProjectStatus
    ) => {
      switch (
        status
      ) {
        case "Completed":
          return "bg-emerald-50 text-emerald-700";

        case "On Hold":
          return "bg-amber-50 text-amber-700";

        case "In Progress":
          return "bg-kite-blue-wash text-kite-blue-deep";

        default:
          return "bg-kite-soft text-kite-muted";
      }
    };

  const availableTabs =
    tabs.filter(
      (tab) =>
        !tab.managementOnly ||
        canManageProject
    );

  /*
  |--------------------------------------------------------------------------
  | MOBILE SECTION NAVIGATION
  |--------------------------------------------------------------------------
  */

  const handleSectionChange =
    (
      section:
        string
    ) => {
      if (
        section ===
        "overview"
      ) {
        navigate(
          basePath
        );

        return;
      }

      navigate(
        `${basePath}/${section}`
      );
    };

  return (
    <div className="mx-auto min-w-0 max-w-[1500px]">

      {/* BREADCRUMB */}
      <div className="mb-4 flex min-w-0 items-center gap-1.5 text-xs sm:mb-5 sm:gap-2 sm:text-sm">

        <Link
          to="/projects"
          className="shrink-0 text-kite-muted transition hover:text-kite-ink"
        >
          Projects
        </Link>

        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-3.5 w-3.5 shrink-0 text-kite-faint sm:h-4 sm:w-4"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>

        <span className="min-w-0 truncate font-medium text-kite-ink">
          {
            project.name
          }
        </span>

      </div>

      {/* PROJECT HEADER */}
      <div className="mb-5 flex items-start justify-between gap-3 sm:mb-7 sm:gap-5">

        <div className="min-w-0 flex-1">

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">

            <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight text-kite-ink sm:text-3xl">
              {
                project.name
              }
            </h1>

            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium sm:px-3 sm:py-1.5 sm:text-xs ${getStatusStyle(
                project.status
              )}`}
            >
              {
                project.status
              }
            </span>

          </div>

          <p className="mt-2 line-clamp-3 max-w-3xl text-sm leading-6 text-kite-muted sm:mt-3 sm:line-clamp-none">
            {
              project.description ||
              "No project description has been added yet."
            }
          </p>

        </div>

        {/* SETTINGS ACTION */}
        {canManageProject &&
          currentSection !==
            "settings" && (
            <button
              type="button"
              onClick={() =>
                navigate(
                  `${basePath}/settings`
                )
              }
              aria-label="Project Settings"
              title="Project Settings"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-kite-line bg-white text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink sm:flex sm:h-auto sm:w-auto sm:items-center sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm sm:font-medium"
            >

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-4.5 w-4.5 sm:h-4 sm:w-4"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="3"
                />

                <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
              </svg>

              <span className="hidden sm:inline">
                Project Settings
              </span>

            </button>
          )}

      </div>

      {/* MOBILE SECTION SELECTOR */}
      <div className="mb-5 sm:hidden">

        <label
          htmlFor="mobile-project-section"
          className="mb-2 block text-xs font-medium text-kite-muted"
        >
          Project section
        </label>

        <div className="relative">

          <select
            id="mobile-project-section"
            value={
              currentSection
            }
            onChange={(
              event
            ) =>
              handleSectionChange(
                event.target.value
              )
            }
            className="w-full appearance-none rounded-xl border border-kite-line bg-white px-4 py-3 pr-10 text-sm font-medium text-kite-ink outline-none transition focus:border-kite-blue focus:ring-4 focus:ring-kite-blue-wash"
          >

            {availableTabs.map(
              (
                tab
              ) => (
                <option
                  key={
                    tab.id
                  }
                  value={
                    tab.id
                  }
                >
                  {
                    tab.label
                  }
                </option>
              )
            )}

          </select>

          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-kite-faint"
          >
            <path d="m9 10 3 3 3-3" />
          </svg>

        </div>

      </div>

      {/* TABLET / DESKTOP TABS */}
      <div className="mb-6 hidden overflow-x-auto border-b border-kite-line sm:block">

        <nav className="flex min-w-max gap-6 lg:gap-7">

          {availableTabs.map(
            (
              tab
            ) => {
              const active =
                currentSection ===
                tab.id;

              const path =
                tab.id ===
                "overview"
                  ? basePath
                  : `${basePath}/${tab.id}`;

              return (
                <Link
                  key={
                    tab.id
                  }
                  to={
                    path
                  }
                  className={`relative pb-4 text-sm font-medium transition ${
                    active
                      ? "text-kite-ink"
                      : "text-kite-muted hover:text-kite-ink"
                  }`}
                >
                  {
                    tab.label
                  }

                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-kite-blue-deep" />
                  )}

                </Link>
              );
            }
          )}

        </nav>

      </div>

      {/* OVERVIEW */}
      {currentSection ===
        "overview" && (
        <>

          {/* STATS */}
          <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">

            {/* PROGRESS */}
            <div className="rounded-2xl border border-kite-line bg-white p-4 sm:p-5">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">

                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-kite-blue-wash text-kite-blue-deep sm:h-11 sm:w-11">

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="h-4.5 w-4.5 sm:h-5 sm:w-5"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                    />

                    <path d="M12 3a9 9 0 0 1 9 9" />
                  </svg>

                </div>

                <div>

                  <p className="text-xs text-kite-muted sm:text-sm">
                    Progress
                  </p>

                  <p className="mt-1 text-xl font-semibold text-kite-ink sm:text-2xl">
                    {
                      progress
                    }
                    %
                  </p>

                </div>

              </div>

            </div>

            {/* TASKS */}
            <div className="rounded-2xl border border-kite-line bg-white p-4 sm:p-5">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">

                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-kite-blue-wash text-kite-blue-deep sm:h-11 sm:w-11">

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="h-4.5 w-4.5 sm:h-5 sm:w-5"
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

                </div>

                <div>

                  <p className="text-xs text-kite-muted sm:text-sm">
                    Tasks
                  </p>

                  <p className="mt-1 text-xl font-semibold text-kite-ink sm:text-2xl">
                    {
                      project.totalTasks
                    }
                  </p>

                  <p className="mt-1 hidden text-xs text-kite-faint sm:block">
                    {
                      project.completedTasks
                    }{" "}
                    completed
                  </p>

                </div>

              </div>

            </div>

            {/* MEMBERS */}
            <div className="rounded-2xl border border-kite-line bg-white p-4 sm:p-5">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">

                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-kite-blue-wash text-kite-blue-deep sm:h-11 sm:w-11">

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="h-4.5 w-4.5 sm:h-5 sm:w-5"
                  >
                    <circle
                      cx="9"
                      cy="8"
                      r="3"
                    />

                    <circle
                      cx="17"
                      cy="9"
                      r="2.5"
                    />

                    <path d="M3.5 19c.6-3.3 2.5-5 5.5-5s4.9 1.7 5.5 5" />

                    <path d="M14.5 15c2.8-.4 5 .8 6 3.5" />
                  </svg>

                </div>

                <div>

                  <p className="text-xs text-kite-muted sm:text-sm">
                    Members
                  </p>

                  <p className="mt-1 text-xl font-semibold text-kite-ink sm:text-2xl">
                    {
                      project
                        .members
                        .length
                    }
                  </p>

                </div>

              </div>

            </div>

            {/* DEADLINE */}
            <div className="rounded-2xl border border-kite-line bg-white p-4 sm:p-5">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">

                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-kite-blue-wash text-kite-blue-deep sm:h-11 sm:w-11">

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="h-4.5 w-4.5 sm:h-5 sm:w-5"
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

                </div>

                <div className="min-w-0">

                  <p className="text-xs text-kite-muted sm:text-sm">
                    Deadline
                  </p>

                  <p className="mt-1 truncate text-base font-semibold text-kite-ink sm:hidden">
                    {formatShortDate(
                      project.deadline
                    )}
                  </p>

                  <p className="mt-1 hidden truncate text-base font-semibold text-kite-ink sm:block">
                    {formatDate(
                      project.deadline
                    )}
                  </p>

                </div>

              </div>

            </div>

          </section>

          {/* OVERVIEW / TEAM */}
          <div className="mt-4 grid gap-4 sm:mt-5 sm:gap-5 xl:grid-cols-[1.15fr_0.85fr]">

            {/* PROJECT OVERVIEW */}
            <section className="min-w-0 rounded-2xl border border-kite-line bg-white">

              <div className="border-b border-kite-line px-4 py-4 sm:px-6">

                <h2 className="font-semibold text-kite-ink">
                  Project Overview
                </h2>

                <p className="mt-1 text-sm text-kite-muted">
                  General information about this project.
                </p>

              </div>

              <div className="p-4 sm:p-6">

                <div>

                  <p className="text-[11px] font-medium uppercase tracking-wide text-kite-faint sm:text-xs">
                    Description
                  </p>

                  <p className="mt-2 text-sm leading-6 text-kite-muted sm:leading-7">
                    {
                      project.description ||
                      "No description has been added to this project."
                    }
                  </p>

                </div>

                <div className="my-5 h-px bg-kite-line sm:my-6" />

                <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:gap-6">

                  <div className="min-w-0">

                    <p className="text-[10px] font-medium uppercase tracking-wide text-kite-faint sm:text-xs">
                      Status
                    </p>

                    <div className="mt-2">

                      <span
                        className={`inline-flex max-w-full rounded-full px-2.5 py-1 text-[10px] font-medium sm:px-3 sm:py-1.5 sm:text-xs ${getStatusStyle(
                          project.status
                        )}`}
                      >
                        <span className="truncate">
                          {
                            project.status
                          }
                        </span>
                      </span>

                    </div>

                  </div>

                  <div className="min-w-0">

                    <p className="text-[10px] font-medium uppercase tracking-wide text-kite-faint sm:text-xs">
                      Workspace
                    </p>

                    <p className="mt-2 truncate text-sm font-medium text-kite-ink">
                      {
                        workspace?.name ??
                        "Workspace"
                      }
                    </p>

                  </div>

                  <div className="min-w-0">

                    <p className="text-[10px] font-medium uppercase tracking-wide text-kite-faint sm:text-xs">
                      Created
                    </p>

                    <p className="mt-2 text-xs text-kite-muted sm:text-sm">
                      {formatCreatedDate(
                        project.createdAt
                      )}
                    </p>

                  </div>

                  <div className="min-w-0">

                    <p className="text-[10px] font-medium uppercase tracking-wide text-kite-faint sm:text-xs">
                      Deadline
                    </p>

                    <p className="mt-2 truncate text-xs text-kite-muted sm:text-sm">
                      {formatDate(
                        project.deadline
                      )}
                    </p>

                  </div>

                </div>

              </div>

            </section>

            {/* TEAM */}
            <section className="min-w-0 rounded-2xl border border-kite-line bg-white">

              <div className="border-b border-kite-line px-4 py-4 sm:px-5">

                <h2 className="font-semibold text-kite-ink">
                  Project Team
                </h2>

                <p className="mt-1 text-sm text-kite-muted">
                  Members assigned to this project.
                </p>

              </div>

              {project.members.length >
              0 ? (
                <div className="divide-y divide-kite-line px-4 sm:px-5">

                  {project.members.map(
                    (
                      member
                    ) => (
                      <div
                        key={
                          member.id
                        }
                        className="flex min-w-0 items-center gap-3 py-3.5 sm:py-4"
                      >

                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-kite-line bg-kite-soft text-[11px] font-semibold text-kite-ink sm:h-10 sm:w-10 sm:text-xs">
                          {
                            member.initials
                          }
                        </div>

                        <div className="min-w-0 flex-1">

                          <p className="truncate text-sm font-medium text-kite-ink">
                            {
                              member.name
                            }
                          </p>

                          <p className="mt-0.5 truncate text-xs text-kite-muted">
                            {
                              member.email ||
                              member.jobTitle ||
                              "Project member"
                            }
                          </p>

                        </div>

                      </div>
                    )
                  )}

                </div>
              ) : (
                <div className="p-5 text-center sm:p-6">

                  <p className="text-sm text-kite-muted">
                    No members have been assigned yet.
                  </p>

                </div>
              )}

            </section>

          </div>

          {/* PROGRESS / ACTIVITY */}
          <div className="mt-4 grid gap-4 sm:mt-5 sm:gap-5 xl:grid-cols-[1.15fr_0.85fr]">

            {/* TASK PROGRESS */}
            <section className="min-w-0 rounded-2xl border border-kite-line bg-white">

              <div className="flex items-start justify-between gap-4 border-b border-kite-line px-4 py-4 sm:items-center sm:px-6">

                <div>

                  <h2 className="font-semibold text-kite-ink">
                    Task Progress
                  </h2>

                  <p className="mt-1 text-sm text-kite-muted">
                    Overall completion of project tasks.
                  </p>

                </div>

                <span className="shrink-0 text-lg font-semibold text-kite-ink">
                  {
                    progress
                  }
                  %
                </span>

              </div>

              <div className="p-4 sm:p-6">

                <div className="h-2.5 overflow-hidden rounded-full bg-kite-soft">

                  <div
                    className="h-full rounded-full bg-kite-blue-deep transition-all duration-500"
                    style={{
                      width:
                        `${progress}%`,
                    }}
                  />

                </div>

                <div className="mt-4 flex items-center justify-between gap-4 text-xs sm:text-sm">

                  <span className="text-kite-muted">
                    {
                      project.completedTasks
                    }{" "}
                    completed
                  </span>

                  <span className="text-right text-kite-muted">
                    {Math.max(
                      project.totalTasks -
                        project.completedTasks,
                      0
                    )}{" "}
                    remaining
                  </span>

                </div>

                {project.totalTasks ===
                  0 && (
                  <div className="mt-5 rounded-xl border border-kite-line bg-kite-soft p-4 sm:mt-6">

                    <p className="text-sm font-medium text-kite-ink">
                      No tasks yet
                    </p>

                    <p className="mt-1 text-xs leading-5 text-kite-muted">
                      Tasks created for this project will automatically update project progress.
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `${basePath}/tasks`
                        )
                      }
                      className="mt-4 text-sm font-medium text-kite-blue-deep transition hover:text-kite-ink"
                    >
                      Go to Tasks →
                    </button>

                  </div>
                )}

              </div>

            </section>

            {/* RECENT ACTIVITY */}
            <section className="min-w-0 rounded-2xl border border-kite-line bg-white">

              <div className="flex items-start justify-between gap-3 border-b border-kite-line px-4 py-4 sm:items-center sm:px-5">

                <div className="min-w-0">

                  <h2 className="font-semibold text-kite-ink">
                    Recent Activity
                  </h2>

                  <p className="mt-1 text-sm text-kite-muted">
                    Latest changes in this project.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `${basePath}/activity`
                    )
                  }
                  className="shrink-0 text-xs font-medium text-kite-blue-deep transition hover:text-kite-ink"
                >
                  View all
                </button>

              </div>

              <div className="p-4 sm:p-6">

                <div className="flex gap-3">

                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-kite-blue-wash text-kite-blue-deep">

                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-4 w-4"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>

                  </div>

                  <div className="min-w-0">

                    <p className="text-sm leading-6 text-kite-ink">
                      Project{" "}
                      <span className="font-medium">
                        {
                          project.name
                        }
                      </span>{" "}
                      was created.
                    </p>

                    <p className="mt-1 text-xs text-kite-muted">
                      {formatCreatedDate(
                        project.createdAt
                      )}
                    </p>

                  </div>

                </div>

              </div>

            </section>

          </div>

        </>
      )}

      {/* BOARD */}
      {currentSection ===
        "board" && (
        <ProjectBoardSection
          project={
            project
          }
        />
      )}

      {/* TASKS */}
      {currentSection ===
        "tasks" && (
        <ProjectTasksSection
          project={
            project
          }
        />
      )}

      {/* ACTIVITY */}
      {currentSection ===
        "activity" && (
        <ProjectActivitySection
          project={
            project
          }
        />
      )}

      {/* SETTINGS */}
      {currentSection ===
        "settings" &&
        canManageProject && (
          <ProjectSettingsSection
            project={
              project
            }
          />
        )}

    </div>
  );
}

export default ProjectDetailsPage;