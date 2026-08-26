import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { useNavigate } from "react-router";

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

import {
  toast,
} from "../../context/ToastContext";

const statuses: ProjectStatus[] = [
  "Planning",
  "In Progress",
  "On Hold",
  "Completed",
];

function ProjectsPage() {
  const navigate = useNavigate();

  const { workspace } =
    useWorkspace();

  const {
    projects,
    isLoaded,
    isLoading,
    error,
    refreshProjects,
    createProject,
  } = useProjects();

  const role =
    workspace?.role ?? "Member";

  const canManageProject =
    hasPermission(
      role,
      "manageProject"
    );

  const [
    createModalOpen,
    setCreateModalOpen,
  ] = useState(false);

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    "All" | ProjectStatus
  >("All");

  const [
    projectName,
    setProjectName,
  ] = useState("");

  const [
    projectDescription,
    setProjectDescription,
  ] = useState("");

  const [
    projectStatus,
    setProjectStatus,
  ] = useState<ProjectStatus>(
    "Planning"
  );

  const [deadline, setDeadline] =
    useState("");

  const [errors, setErrors] =
    useState<{
      name?: string;
      deadline?: string;
    }>({});

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    submitError,
    setSubmitError,
  ] = useState("");

  /*
  |--------------------------------------------------------------------------
  | FILTERS
  |--------------------------------------------------------------------------
  */

  const filteredProjects =
    useMemo(() => {
      const cleanSearch =
        search
          .trim()
          .toLowerCase();

      return projects.filter(
        (project) => {
          const matchesSearch =
            !cleanSearch ||
            project.name
              .toLowerCase()
              .includes(
                cleanSearch
              ) ||
            project.description
              .toLowerCase()
              .includes(
                cleanSearch
              );

          const matchesStatus =
            statusFilter === "All" ||
            project.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      projects,
      search,
      statusFilter,
    ]);

  const filtersActive =
    Boolean(search.trim()) ||
    statusFilter !== "All";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
  };

  /*
  |--------------------------------------------------------------------------
  | CREATE PROJECT
  |--------------------------------------------------------------------------
  */

  const resetForm = () => {
    setProjectName("");
    setProjectDescription("");
    setProjectStatus(
      "Planning"
    );
    setDeadline("");
    setErrors({});
    setSubmitError("");
  };

  const closeModal = () => {
    if (isSubmitting) {
      return;
    }

    setCreateModalOpen(false);
    resetForm();
  };

  const openCreateModal = () => {
    if (!canManageProject) {
      return;
    }

    resetForm();
    setCreateModalOpen(true);
  };

  useEffect(() => {
    if (!createModalOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (
        event.key === "Escape" &&
        !isSubmitting
      ) {
        setCreateModalOpen(false);
        resetForm();
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
  }, [
    createModalOpen,
    isSubmitting,
  ]);

  const handleCreateProject =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      if (!canManageProject) {
        return;
      }

      const nextErrors: {
        name?: string;
        deadline?: string;
      } = {};

      if (
        projectName
          .trim()
          .length < 2
      ) {
        nextErrors.name =
          "Project name must contain at least 2 characters.";
      }

      if (deadline) {
        const selectedDate =
          new Date(
            `${deadline}T23:59:59`
          );

        if (
          selectedDate <
          new Date()
        ) {
          nextErrors.deadline =
            "Deadline cannot be in the past.";
        }
      }

      if (
        Object.keys(
          nextErrors
        ).length > 0
      ) {
        setErrors(
          nextErrors
        );

        return;
      }

      setErrors({});
      setSubmitError("");
      setIsSubmitting(true);

      try {
        const createdProject =
          await createProject({
            name:
              projectName.trim(),

            description:
              projectDescription.trim(),

            status:
              projectStatus,

            deadline:
              deadline || null,

            members: [],
          });

        toast.success(
          `"${createdProject.name}" was created successfully.`,
          {
            title:
              "Project created",
          }
        );

        closeModal();

 

        resetForm();
      } catch (caughtError) {
        setSubmitError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to create the project."
        );
      } finally {
        setIsSubmitting(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | HELPERS
  |--------------------------------------------------------------------------
  */

  const formatDeadline = (
    date: string | null
  ) => {
    if (!date) {
      return "No deadline";
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

  const getStatusStyle = (
    status: ProjectStatus
  ) => {
    switch (status) {
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

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOADING
  |--------------------------------------------------------------------------
  */

  if (
    !isLoaded &&
    projects.length === 0
  ) {
    return (
      <div className="mx-auto max-w-[1500px] animate-pulse">
        <div className="mb-6 sm:mb-8">
          <div className="h-4 w-24 rounded bg-kite-line" />

          <div className="mt-3 h-8 w-40 rounded-xl bg-kite-line sm:h-9" />

          <div className="mt-3 h-4 w-64 max-w-full rounded bg-kite-line" />
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
          <div className="h-12 rounded-xl bg-white" />

          <div className="h-12 rounded-xl bg-white" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map(
            (item) => (
              <div
                key={item}
                className="h-52 rounded-2xl bg-white sm:h-[260px]"
              />
            )
          )}
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | FATAL ERROR
  |--------------------------------------------------------------------------
  */

  if (
    error &&
    projects.length === 0
  ) {
    return (
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-6 sm:mb-8">
          <p className="mb-1 text-sm text-kite-muted">
            Workspace
          </p>

          <h1 className="text-2xl font-semibold tracking-tight text-kite-ink sm:text-3xl">
            Projects
          </h1>

          <p className="mt-2 text-sm leading-6 text-kite-muted">
            Manage projects in{" "}
            <span className="font-medium text-kite-ink">
              {workspace?.name ??
                "your workspace"}
            </span>
            .
          </p>
        </div>

        <section className="rounded-2xl border border-kite-line bg-white px-5 py-12 text-center sm:px-6 sm:py-16">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-500 sm:h-16 sm:w-16">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7 sm:h-8 sm:w-8"
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

          <h2 className="mt-5 text-lg font-semibold tracking-tight text-kite-ink sm:text-xl">
            Couldn&apos;t load projects
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-kite-muted">
            {error}
          </p>

          <button
            type="button"
            disabled={isLoading}
            onClick={() =>
              void refreshProjects()
            }
            className="mt-6 rounded-xl bg-kite-blue-deep px-5 py-3 text-sm font-medium text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading
              ? "Trying again..."
              : "Try Again"}
          </button>
        </section>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-[1500px]">

        {/* HEADER */}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-8 sm:flex-row sm:items-end sm:gap-5">

          <div className="min-w-0">
            <p className="mb-1 text-xs text-kite-muted sm:text-sm">
              Workspace
            </p>

            <h1 className="text-2xl font-semibold tracking-tight text-kite-ink sm:text-3xl">
              Projects
            </h1>

            <p className="mt-2 text-sm leading-6 text-kite-muted">
              Manage projects in{" "}
              <span className="font-medium text-kite-ink">
                {workspace?.name ??
                  "your workspace"}
              </span>
              .
            </p>
          </div>

          {canManageProject && (
            <button
              type="button"
              onClick={
                openCreateModal
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-kite-blue-deep px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:brightness-95 sm:w-fit sm:justify-start sm:hover:-translate-y-[1px]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>

              New Project
            </button>
          )}
        </div>

        {/* PARTIAL ERROR */}
        {error &&
          projects.length > 0 && (
            <div className="mb-5 flex flex-col gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Some project data may be outdated.
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-700">
                  {error}
                </p>
              </div>

              <button
                type="button"
                disabled={isLoading}
                onClick={() =>
                  void refreshProjects()
                }
                className="shrink-0 self-start rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-medium text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
              >
                {isLoading
                  ? "Retrying..."
                  : "Try Again"}
              </button>
            </div>
          )}

        {/* TOOLBAR */}
        <section className="mb-4 rounded-2xl border border-kite-line bg-white p-3 sm:mb-5 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">

            {/* SEARCH */}
            <div className="relative min-w-0">
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
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search projects..."
                className="w-full rounded-xl border border-kite-line bg-kite-soft py-3 pl-12 pr-4 text-sm text-kite-ink outline-none transition placeholder:text-kite-faint focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash"
              />
            </div>

            {/* FILTER */}
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | "All"
                    | ProjectStatus
                )
              }
              className="w-full rounded-xl border border-kite-line bg-kite-soft px-4 py-3 text-sm text-kite-ink outline-none transition focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash"
            >
              <option value="All">
                All statuses
              </option>

              {statuses.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                )
              )}
            </select>
          </div>
        </section>

        {/* RESULTS */}
        <div className="mb-4 flex min-h-6 items-center justify-between gap-4">
          <p className="text-sm text-kite-muted">
            <span className="font-medium text-kite-ink">
              {filteredProjects.length}
            </span>{" "}
            {filteredProjects.length ===
            1
              ? "project"
              : "projects"}

            {isLoading &&
              projects.length > 0 && (
                <span className="ml-2 text-xs text-kite-faint">
                  Refreshing...
                </span>
              )}
          </p>

          {filtersActive && (
            <button
              type="button"
              onClick={
                clearFilters
              }
              className="shrink-0 text-sm font-medium text-kite-blue-deep transition hover:text-kite-ink"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* EMPTY */}
        {projects.length === 0 && (
          <section className="rounded-2xl border border-kite-line bg-white px-5 py-12 text-center sm:px-6 sm:py-16">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-kite-blue-wash text-kite-blue-deep sm:h-16 sm:w-16">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="h-7 w-7 sm:h-8 sm:w-8"
              >
                <path d="M3 7.5a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
              </svg>
            </div>

            <h2 className="mt-5 text-lg font-semibold tracking-tight text-kite-ink sm:text-xl">
              No projects yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-kite-muted">
              {canManageProject
                ? "Create your first project to start organizing tasks, assigning work, and tracking progress."
                : "Projects you can access in this workspace will appear here."}
            </p>

            {canManageProject && (
              <button
                type="button"
                onClick={
                  openCreateModal
                }
                className="mt-6 w-full rounded-xl bg-kite-blue-deep px-5 py-3 text-sm font-medium text-white transition hover:brightness-95 sm:w-auto"
              >
                Create your first project
              </button>
            )}
          </section>
        )}

        {/* FILTER EMPTY */}
        {projects.length > 0 &&
          filteredProjects.length ===
            0 && (
            <section className="rounded-2xl border border-kite-line bg-white px-5 py-12 text-center sm:px-6 sm:py-14">
              <h2 className="text-lg font-semibold text-kite-ink">
                No matching projects
              </h2>

              <p className="mt-2 text-sm text-kite-muted">
                Try changing your search or status filter.
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

        {/* PROJECT GRID */}
        {filteredProjects.length >
          0 && (
          <section className="grid gap-4 lg:grid-cols-2 lg:gap-5">
            {filteredProjects.map(
              (project) => {
                const progress =
                  project.totalTasks ===
                  0
                    ? 0
                    : Math.round(
                        (project.completedTasks /
                          project.totalTasks) *
                          100
                      );

                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() =>
                      navigate(
                        `/projects/${project.id}`
                      )
                    }
                    className="group flex min-h-0 min-w-0 flex-col rounded-2xl border border-kite-line bg-white p-4 text-left transition duration-200 active:scale-[0.995] sm:min-h-[260px] sm:p-6 sm:hover:-translate-y-[2px] sm:hover:border-kite-blue sm:hover:shadow-[0_16px_40px_-30px_rgba(46,51,56,0.35)]"
                  >
                    {/* TOP */}
                    <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-base font-semibold tracking-tight text-kite-ink transition group-hover:text-kite-blue-deep sm:text-lg">
                          {project.name}
                        </h2>

                        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-kite-muted sm:mt-2 sm:min-h-[40px]">
                          {project.description ||
                            "No description provided."}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium sm:px-3 sm:py-1.5 sm:text-xs ${getStatusStyle(
                          project.status
                        )}`}
                      >
                        {project.status}
                      </span>
                    </div>

                    {/* PROGRESS */}
                    <div className="mt-5 sm:mt-7">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-xs text-kite-muted">
                          {project.completedTasks}{" "}
                          of{" "}
                          {project.totalTasks}{" "}
                          tasks
                        </p>

                        <span className="shrink-0 text-xs font-medium text-kite-muted">
                          {progress}%
                        </span>
                      </div>

                      <div className="h-1.5 overflow-hidden rounded-full bg-kite-soft">
                        <div
                          className="h-full rounded-full bg-kite-blue-deep transition-all duration-500"
                          style={{
                            width:
                              `${progress}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* BOTTOM */}
                    <div className="mt-6 grid grid-cols-2 items-end gap-4 border-t border-kite-line pt-4 sm:mt-auto sm:border-t-0 sm:pt-8">

                      {/* TEAM */}
                      <div className="min-w-0">
                        <p className="mb-2 text-[10px] uppercase tracking-wide text-kite-faint sm:text-[11px]">
                          Team
                        </p>

                        {project.members
                          .length > 0 ? (
                          <div className="flex -space-x-2">
                            {project.members
                              .slice(0, 4)
                              .map(
                                (member) => (
                                  <div
                                    key={
                                      member.id
                                    }
                                    title={
                                      member.name
                                    }
                                    className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-kite-soft text-[10px] font-semibold text-kite-ink sm:h-9 sm:w-9 sm:text-[11px]"
                                  >
                                    {
                                      member.initials
                                    }
                                  </div>
                                )
                              )}

                            {project.members
                              .length >
                              4 && (
                              <div className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-kite-blue-wash text-[10px] font-medium text-kite-blue-deep sm:h-9 sm:w-9 sm:text-[11px]">
                                +
                                {project
                                  .members
                                  .length -
                                  4}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-kite-muted">
                            No members
                          </p>
                        )}
                      </div>

                      {/* DEADLINE */}
                      <div className="min-w-0 text-right">
                        <p className="mb-2 text-[10px] uppercase tracking-wide text-kite-faint sm:text-[11px]">
                          Deadline
                        </p>

                        <p className="truncate text-xs font-medium text-kite-muted sm:text-sm">
                          {formatDeadline(
                            project.deadline
                          )}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              }
            )}
          </section>
        )}
      </div>

      {/* CREATE PROJECT MODAL */}
      {createModalOpen &&
        canManageProject && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">

          {/* BACKDROP */}
          <button
            type="button"
            aria-label="Close create project modal"
            onClick={
              closeModal
            }
            disabled={
              isSubmitting
            }
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          />

          {/* MODAL */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-project-title"
            className="relative z-10 max-h-[94dvh] w-full overflow-y-auto rounded-t-[24px] border border-kite-line bg-white shadow-[0_25px_80px_-30px_rgba(46,51,56,0.45)] sm:max-h-[92vh] sm:max-w-[620px] sm:rounded-[24px]"
          >

            {/* MOBILE HANDLE */}
            <div className="flex justify-center pt-2 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-kite-line" />
            </div>

            {/* MODAL HEADER */}
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-kite-line bg-white px-4 py-4 sm:px-6 sm:py-5">
              <div className="min-w-0">
                <h2
                  id="create-project-title"
                  className="text-lg font-semibold tracking-tight text-kite-ink sm:text-xl"
                >
                  Create project
                </h2>

                <p className="mt-1 truncate text-sm text-kite-muted">
                  Add a new project to{" "}
                  {workspace?.name ??
                    "your workspace"}.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={
                  isSubmitting
                }
                aria-label="Close"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xl text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                handleCreateProject
              }
            >
              <div className="space-y-5 p-4 sm:p-6">

                {/* PROJECT NAME */}
                <div>
                  <label
                    htmlFor="project-name"
                    className="mb-2 block text-sm font-medium text-kite-muted"
                  >
                    Project name
                  </label>

                  <input
                    id="project-name"
                    value={projectName}
                    onChange={(event) => {
                      setProjectName(
                        event.target.value
                      );

                      setErrors(
                        (current) => ({
                          ...current,
                          name:
                            undefined,
                        })
                      );
                    }}
                    placeholder="e.g. Website Redesign"
                    autoFocus
                    className={`w-full rounded-xl border bg-kite-soft px-4 py-3.5 text-sm text-kite-ink outline-none transition placeholder:text-kite-faint focus:bg-white focus:ring-4 ${
                      errors.name
                        ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                        : "border-kite-line focus:border-kite-blue focus:ring-kite-blue-wash"
                    }`}
                  />

                  {errors.name && (
                    <p className="mt-2 text-sm text-red-500">
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* DESCRIPTION */}
                <div>
                  <label
                    htmlFor="project-description"
                    className="mb-2 block text-sm font-medium text-kite-muted"
                  >
                    Description{" "}
                    <span className="font-normal text-kite-faint">
                      (optional)
                    </span>
                  </label>

                  <textarea
                    id="project-description"
                    rows={4}
                    value={
                      projectDescription
                    }
                    onChange={(event) =>
                      setProjectDescription(
                        event.target.value
                      )
                    }
                    placeholder="What is this project about?"
                    className="w-full resize-none rounded-xl border border-kite-line bg-kite-soft px-4 py-3.5 text-sm text-kite-ink outline-none transition placeholder:text-kite-faint focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash"
                  />
                </div>

                {/* STATUS + DEADLINE */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="project-status"
                      className="mb-2 block text-sm font-medium text-kite-muted"
                    >
                      Status
                    </label>

                    <select
                      id="project-status"
                      value={
                        projectStatus
                      }
                      onChange={(
                        event
                      ) =>
                        setProjectStatus(
                          event.target
                            .value as
                            ProjectStatus
                        )
                      }
                      className="w-full rounded-xl border border-kite-line bg-kite-soft px-4 py-3.5 text-sm text-kite-ink outline-none transition focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash"
                    >
                      {statuses.map(
                        (status) => (
                          <option
                            key={status}
                            value={status}
                          >
                            {status}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="project-deadline"
                      className="mb-2 block text-sm font-medium text-kite-muted"
                    >
                      Deadline{" "}
                      <span className="font-normal text-kite-faint">
                        (optional)
                      </span>
                    </label>

                    <input
                      id="project-deadline"
                      type="date"
                      value={deadline}
                      onChange={(event) => {
                        setDeadline(
                          event.target.value
                        );

                        setErrors(
                          (current) => ({
                            ...current,
                            deadline:
                              undefined,
                          })
                        );
                      }}
                      className={`w-full rounded-xl border bg-kite-soft px-4 py-3.5 text-sm text-kite-ink outline-none transition focus:bg-white focus:ring-4 ${
                        errors.deadline
                          ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                          : "border-kite-line focus:border-kite-blue focus:ring-kite-blue-wash"
                      }`}
                    />

                    {errors.deadline && (
                      <p className="mt-2 text-sm text-red-500">
                        {
                          errors.deadline
                        }
                      </p>
                    )}
                  </div>
                </div>

                {/* MEMBERSHIP INFO */}
                <div className="rounded-xl border border-kite-line bg-kite-soft p-4">
                  <div className="flex gap-3">
                    <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-sm font-medium text-kite-blue-deep">
                      i
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-medium text-kite-ink">
                        Project membership
                      </p>

                      <p className="mt-1 text-xs leading-5 text-kite-muted">
                        You will be added to the project automatically. Add other workspace members from Project Settings after the project is created.
                      </p>
                    </div>
                  </div>
                </div>

                {submitError && (
                  <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                    <p className="text-sm text-red-600">
                      {submitError}
                    </p>
                  </div>
                )}
              </div>

              {/* ACTIONS */}
              <div className="sticky bottom-0 grid grid-cols-2 gap-3 border-t border-kite-line bg-white/95 px-4 py-4 backdrop-blur sm:flex sm:justify-end sm:px-6">

                <button
                  type="button"
                  disabled={
                    isSubmitting
                  }
                  onClick={
                    closeModal
                  }
                  className="rounded-xl border border-kite-line bg-white px-4 py-2.5 text-sm font-medium text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    isSubmitting
                  }
                  className="rounded-xl bg-kite-blue-deep px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 sm:px-5"
                >
                  {isSubmitting
                    ? "Creating..."
                    : "Create Project"}
                </button>

              </div>
            </form>

          </div>
        </div>
      )}
    </>
  );
}

export default ProjectsPage;