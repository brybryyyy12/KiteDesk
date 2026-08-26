import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  useNavigate,
} from "react-router";

import {
  useProjects,
  type Project,
  type ProjectStatus,
} from "../../context/ProjectContext";

import {
  useWorkspace,
} from "../../context/WorkspaceContext";

import {
  hasPermission,
} from "../../lib/permissions";

import {
  ApiError,
} from "../../lib/api";

import {
  projectMemberService,
  type WorkspaceProjectMember,
} from "../../services/project-member.service";

type ProjectSettingsSectionProps = {
  project: Project;
};

const projectStatuses: ProjectStatus[] = [
  "Planning",
  "In Progress",
  "On Hold",
  "Completed",
];

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

  return "Something went wrong.";
}

function ProjectSettingsSection({
  project,
}: ProjectSettingsSectionProps) {
  const navigate =
    useNavigate();

  const {
    workspace,
  } =
    useWorkspace();

  const {
    updateProject,
    deleteProject,
    refreshProjects,
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

  const canDeleteProject =
    hasPermission(
      role,
      "deleteProject"
    );

  /*
  |--------------------------------------------------------------------------
  | FORM
  |--------------------------------------------------------------------------
  */

  const [
    name,
    setName,
  ] =
    useState(
      project.name
    );

  const [
    description,
    setDescription,
  ] =
    useState(
      project.description
    );

  const [
    status,
    setStatus,
  ] =
    useState<ProjectStatus>(
      project.status
    );

  const [
    deadline,
    setDeadline,
  ] =
    useState(
      project.deadline ??
      ""
    );

  /*
  |--------------------------------------------------------------------------
  | WORKSPACE MEMBERS
  |--------------------------------------------------------------------------
  */

  const [
    workspaceMembers,
    setWorkspaceMembers,
  ] =
    useState<
      WorkspaceProjectMember[]
    >([]);

  const [
    membersLoading,
    setMembersLoading,
  ] =
    useState(false);

  const [
    membersError,
    setMembersError,
  ] =
    useState("");

  const [
    selectedMemberIds,
    setSelectedMemberIds,
  ] =
    useState<string[]>(
      () =>
        project.members.map(
          (member) =>
            member.id
        )
    );

  /*
  |--------------------------------------------------------------------------
  | UI STATE
  |--------------------------------------------------------------------------
  */

  const [
    errors,
    setErrors,
  ] =
    useState<{
      name?: string;
    }>({});

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const [
    saveSuccess,
    setSaveSuccess,
  ] =
    useState(false);

  const [
    saveError,
    setSaveError,
  ] =
    useState("");

  const [
    deleteConfirmOpen,
    setDeleteConfirmOpen,
  ] =
    useState(false);

  const [
    deleteConfirmation,
    setDeleteConfirmation,
  ] =
    useState("");

  const [
    isDeleting,
    setIsDeleting,
  ] =
    useState(false);

  const [
    deleteError,
    setDeleteError,
  ] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | LOAD REAL WORKSPACE MEMBERS
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      const workspaceId =
        workspace?.id;

      if (
        !workspaceId ||
        !canManageProject
      ) {
        setWorkspaceMembers(
          []
        );

        return;
      }

      let cancelled =
        false;

      const loadMembers =
        async () => {
          setMembersLoading(
            true
          );

          setMembersError(
            ""
          );

          try {
            const members =
              await projectMemberService.getWorkspaceMembers(
                workspaceId
              );

            if (
              cancelled
            ) {
              return;
            }

            setWorkspaceMembers(
              members
            );
          } catch (error) {
            if (
              cancelled
            ) {
              return;
            }

            console.error(
              "Failed to load workspace members:",
              error
            );

            setWorkspaceMembers(
              []
            );

            setMembersError(
              getErrorMessage(
                error
              )
            );
          } finally {
            if (
              !cancelled
            ) {
              setMembersLoading(
                false
              );
            }
          }
        };

      void loadMembers();

      return () => {
        cancelled =
          true;
      };
    },
    [
      workspace?.id,
      canManageProject,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | SYNCHRONIZE PROJECT
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      setName(
        project.name
      );

      setDescription(
        project.description
      );

      setStatus(
        project.status
      );

      setDeadline(
        project.deadline ??
        ""
      );

      setSelectedMemberIds(
        project.members.map(
          (member) =>
            member.id
        )
      );
    },
    [
      project,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | MEMBER CALCULATIONS
  |--------------------------------------------------------------------------
  */

  const originalMemberIds =
    useMemo(
      () =>
        project.members.map(
          (member) =>
            member.id
        ),
      [
        project.members,
      ]
    );

  // const selectedMembers =
  //   useMemo(
  //     () =>
  //       workspaceMembers.filter(
  //         (member) =>
  //           selectedMemberIds.includes(
  //             member.userId
  //           )
  //       ),
  //     [
  //       workspaceMembers,
  //       selectedMemberIds,
  //     ]
  //   );

  const membersToAdd =
    useMemo(
      () =>
        selectedMemberIds.filter(
          (userId) =>
            !originalMemberIds.includes(
              userId
            )
        ),
      [
        selectedMemberIds,
        originalMemberIds,
      ]
    );

  const membersToRemove =
    useMemo(
      () =>
        originalMemberIds.filter(
          (userId) =>
            !selectedMemberIds.includes(
              userId
            )
        ),
      [
        originalMemberIds,
        selectedMemberIds,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | CHANGE DETECTION
  |--------------------------------------------------------------------------
  */

  const metadataChanged =
    useMemo(
      () =>
        name.trim() !==
          project.name ||
        description.trim() !==
          project.description ||
        status !==
          project.status ||
        (
          deadline ||
          null
        ) !==
          project.deadline,
      [
        name,
        description,
        status,
        deadline,
        project,
      ]
    );

  const membersChanged =
    membersToAdd.length >
      0 ||
    membersToRemove.length >
      0;

  const hasChanges =
    metadataChanged ||
    membersChanged;

  /*
  |--------------------------------------------------------------------------
  | PERMISSION
  |--------------------------------------------------------------------------
  */

  if (
    !canManageProject
  ) {
    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | TOGGLE MEMBER
  |--------------------------------------------------------------------------
  */

  const toggleMember = (
    memberId: string
  ) => {
    setSelectedMemberIds(
      (current) => {
        if (
          current.includes(
            memberId
          )
        ) {
          return current.filter(
            (id) =>
              id !==
              memberId
          );
        }

        return [
          ...current,
          memberId,
        ];
      }
    );

    setSaveSuccess(
      false
    );

    setSaveError(
      ""
    );
  };

  /*
  |--------------------------------------------------------------------------
  | SAVE
  |--------------------------------------------------------------------------
  */

  const handleSubmit =
    async (
      event: FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      if (
        !workspace
      ) {
        return;
      }

      const nextErrors: {
        name?: string;
      } = {};

      if (
        name.trim().length <
        2
      ) {
        nextErrors.name =
          "Project name must contain at least 2 characters.";
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

      setIsSaving(
        true
      );

      setSaveSuccess(
        false
      );

      setSaveError(
        ""
      );

      try {
        /*
         * Update basic project fields.
         *
         * Project PATCH does not manage
         * ProjectMember records.
         */
        if (
          metadataChanged
        ) {
          await updateProject(
            project.id,
            {
              name,

              description,

              status,

              deadline:
                deadline ||
                null,
            }
          );
        }

        /*
         * Add newly selected members.
         *
         * Backend accepts an array of
         * actual USER UUIDs.
         */
        if (
          membersToAdd.length >
          0
        ) {
          await projectMemberService.addMembers(
            workspace.id,
            project.id,
            membersToAdd
          );
        }

        /*
         * Remove unchecked members.
         *
         * Backend also unassigns their
         * tasks in this project.
         */
        if (
          membersToRemove.length >
          0
        ) {
          for (
            const userId of
            membersToRemove
          ) {
            await projectMemberService.removeMember(
              workspace.id,
              project.id,
              userId
            );
          }
        }

        /*
         * Refresh from PostgreSQL so
         * ProjectContext receives the
         * authoritative member list.
         */
        await refreshProjects();

        setSaveSuccess(
          true
        );

        window.setTimeout(
          () => {
            setSaveSuccess(
              false
            );
          },
          2500
        );
      } catch (error) {
        console.error(
          "Failed to save project settings:",
          error
        );

        /*
         * Refresh because one request
         * may have succeeded before a
         * later request failed.
         */
        try {
          await refreshProjects();
        } catch {
          // Ignore refresh failure here.
        }

        setSaveError(
          getErrorMessage(
            error
          )
        );
      } finally {
        setIsSaving(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | RESET
  |--------------------------------------------------------------------------
  */

  const resetChanges =
    () => {
      setName(
        project.name
      );

      setDescription(
        project.description
      );

      setStatus(
        project.status
      );

      setDeadline(
        project.deadline ??
        ""
      );

      setSelectedMemberIds(
        project.members.map(
          (member) =>
            member.id
        )
      );

      setErrors(
        {}
      );

      setSaveSuccess(
        false
      );

      setSaveError(
        ""
      );
    };

  /*
  |--------------------------------------------------------------------------
  | DELETE
  |--------------------------------------------------------------------------
  */

  const handleDeleteProject =
    async () => {
      if (
        !canDeleteProject
      ) {
        return;
      }

      if (
        deleteConfirmation
          .trim() !==
        project.name
      ) {
        return;
      }

      setIsDeleting(
        true
      );

      setDeleteError(
        ""
      );

      try {
        await deleteProject(
          project.id
        );

        navigate(
          "/projects",
          {
            replace: true,
          }
        );
      } catch (error) {
        console.error(
          "Failed to delete project:",
          error
        );

        setDeleteError(
          getErrorMessage(
            error
          )
        );
      } finally {
        setIsDeleting(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | STATUS STYLE
  |--------------------------------------------------------------------------
  */

  const getStatusStyle = (
    value: ProjectStatus
  ) => {
    switch (value) {
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

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">

        {/* LEFT */}
        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-5"
        >

          {/* GENERAL SETTINGS */}
          <section className="rounded-2xl border border-kite-line bg-white">

            <div className="border-b border-kite-line px-5 py-4 sm:px-6">

              <h2 className="font-semibold text-kite-ink">
                General Settings
              </h2>

              <p className="mt-1 text-sm text-kite-muted">
                Update the basic
                information for this
                project.
              </p>

            </div>

            <div className="space-y-5 p-5 sm:p-6">

              {/* NAME */}
              <div>

                <label
                  htmlFor="project-settings-name"
                  className="mb-2 block text-sm font-medium text-kite-muted"
                >
                  Project name
                </label>

                <input
                  id="project-settings-name"
                  type="text"
                  value={
                    name
                  }
                  disabled={
                    isSaving
                  }
                  onChange={(
                    event
                  ) => {
                    setName(
                      event.target
                        .value
                    );

                    setErrors(
                      (current) => ({
                        ...current,

                        name:
                          undefined,
                      })
                    );

                    setSaveSuccess(
                      false
                    );

                    setSaveError(
                      ""
                    );
                  }}
                  className={`w-full rounded-xl border bg-kite-soft px-4 py-3.5 text-sm text-kite-ink outline-none transition focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
                    errors.name
                      ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                      : "border-kite-line focus:border-kite-blue focus:ring-kite-blue-wash"
                  }`}
                />

                {errors.name && (
                  <p className="mt-2 text-sm text-red-500">
                    {
                      errors.name
                    }
                  </p>
                )}

              </div>

              {/* DESCRIPTION */}
              <div>

                <label
                  htmlFor="project-settings-description"
                  className="mb-2 block text-sm font-medium text-kite-muted"
                >
                  Description
                </label>

                <textarea
                  id="project-settings-description"
                  rows={5}
                  value={
                    description
                  }
                  disabled={
                    isSaving
                  }
                  onChange={(
                    event
                  ) => {
                    setDescription(
                      event.target
                        .value
                    );

                    setSaveSuccess(
                      false
                    );

                    setSaveError(
                      ""
                    );
                  }}
                  placeholder="Describe this project..."
                  className="w-full resize-none rounded-xl border border-kite-line bg-kite-soft px-4 py-3.5 text-sm leading-6 text-kite-ink outline-none transition placeholder:text-kite-faint focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash disabled:cursor-not-allowed disabled:opacity-60"
                />

                <div className="mt-2 flex justify-end">

                  <span className="text-xs text-kite-faint">
                    {
                      description.length
                    }{" "}
                    characters
                  </span>

                </div>

              </div>

              {/* STATUS + DEADLINE */}
              <div className="grid gap-5 sm:grid-cols-2">

                <div>

                  <label
                    htmlFor="project-settings-status"
                    className="mb-2 block text-sm font-medium text-kite-muted"
                  >
                    Project status
                  </label>

                  <select
                    id="project-settings-status"
                    value={
                      status
                    }
                    disabled={
                      isSaving
                    }
                    onChange={(
                      event
                    ) => {
                      setStatus(
                        event.target
                          .value as ProjectStatus
                      );

                      setSaveSuccess(
                        false
                      );

                      setSaveError(
                        ""
                      );
                    }}
                    className="w-full rounded-xl border border-kite-line bg-kite-soft px-4 py-3.5 text-sm text-kite-ink outline-none transition focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash disabled:cursor-not-allowed disabled:opacity-60"
                  >

                    {projectStatuses.map(
                      (
                        projectStatus
                      ) => (
                        <option
                          key={
                            projectStatus
                          }
                          value={
                            projectStatus
                          }
                        >
                          {
                            projectStatus
                          }
                        </option>
                      )
                    )}

                  </select>

                </div>

                <div>

                  <label
                    htmlFor="project-settings-deadline"
                    className="mb-2 block text-sm font-medium text-kite-muted"
                  >
                    Deadline
                  </label>

                  <input
                    id="project-settings-deadline"
                    type="date"
                    value={
                      deadline
                    }
                    disabled={
                      isSaving
                    }
                    onChange={(
                      event
                    ) => {
                      setDeadline(
                        event.target
                          .value
                      );

                      setSaveSuccess(
                        false
                      );

                      setSaveError(
                        ""
                      );
                    }}
                    className="w-full rounded-xl border border-kite-line bg-kite-soft px-4 py-3.5 text-sm text-kite-ink outline-none transition focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  {deadline && (
                    <button
                      type="button"
                      disabled={
                        isSaving
                      }
                      onClick={() => {
                        setDeadline(
                          ""
                        );

                        setSaveSuccess(
                          false
                        );

                        setSaveError(
                          ""
                        );
                      }}
                      className="mt-2 text-xs font-medium text-kite-muted transition hover:text-kite-ink disabled:opacity-50"
                    >
                      Remove deadline
                    </button>
                  )}

                </div>

              </div>

            </div>

          </section>

          {/* PROJECT MEMBERS */}
          <section className="rounded-2xl border border-kite-line bg-white">

            <div className="border-b border-kite-line px-5 py-4 sm:px-6">

              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

                <div>

                  <h2 className="font-semibold text-kite-ink">
                    Project Members
                  </h2>

                  <p className="mt-1 text-sm text-kite-muted">
                    Choose which
                    workspace members
                    participate in this
                    project.
                  </p>

                </div>

                <span className="w-fit rounded-lg bg-kite-soft px-2.5 py-1.5 text-xs font-medium text-kite-muted">
                  {
                    selectedMemberIds.length
                  }{" "}
                  selected
                </span>

              </div>

            </div>

            <div className="p-5 sm:p-6">

              {membersLoading && (
                <div className="rounded-xl border border-kite-line bg-kite-soft px-4 py-4">
                  <p className="text-sm text-kite-muted">
                    Loading workspace
                    members...
                  </p>
                </div>
              )}

              {!membersLoading &&
                membersError && (
                  <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                    <p className="text-sm text-red-600">
                      {
                        membersError
                      }
                    </p>
                  </div>
                )}

              {!membersLoading &&
                !membersError &&
                workspaceMembers.length ===
                  0 && (
                  <div className="rounded-xl border border-kite-line bg-kite-soft px-4 py-4">

                    <p className="text-sm text-kite-muted">
                      No workspace
                      members are
                      available.
                    </p>

                  </div>
                )}

              {!membersLoading &&
                !membersError &&
                workspaceMembers.length >
                  0 && (
                  <div className="grid gap-3 sm:grid-cols-2">

                    {workspaceMembers.map(
                      (member) => {
                        const selected =
                          selectedMemberIds.includes(
                            member.userId
                          );

                        return (
                          <button
                            key={
                              member.userId
                            }
                            type="button"
                            disabled={
                              isSaving
                            }
                            onClick={() =>
                              toggleMember(
                                member.userId
                              )
                            }
                            className={`flex items-center gap-3 rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              selected
                                ? "border-kite-blue bg-kite-blue-wash/60"
                                : "border-kite-line bg-kite-soft hover:bg-white"
                            }`}
                          >

                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-kite-line bg-white text-xs font-semibold text-kite-ink">
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
                                  "Workspace member"
                                }
                              </p>

                            </div>

                            <div
                              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] transition ${
                                selected
                                  ? "border-kite-blue-deep bg-kite-blue-deep text-white"
                                  : "border-kite-faint text-transparent"
                              }`}
                            >
                              ✓
                            </div>

                          </button>
                        );
                      }
                    )}

                  </div>
                )}

              {selectedMemberIds.length ===
                0 && (
                <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">

                  <p className="text-xs leading-5 text-amber-700">
                    This project will
                    have no assigned
                    project members.
                    Workspace owners
                    and managers can
                    still manage it.
                  </p>

                </div>
              )}

            </div>

          </section>

          {/* SAVE BAR */}
          <section className="sticky bottom-4 z-20 rounded-2xl border border-kite-line bg-white/95 p-4 shadow-[0_16px_45px_-28px_rgba(46,51,56,0.4)] backdrop-blur">

            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

              <div>

                {saveSuccess ? (
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">

                    <div className="grid h-6 w-6 place-items-center rounded-full bg-emerald-50">
                      ✓
                    </div>

                    Project settings
                    saved.

                  </div>
                ) : saveError ? (
                  <p className="text-sm text-red-500">
                    {
                      saveError
                    }
                  </p>
                ) : hasChanges ? (
                  <p className="text-sm text-kite-muted">
                    You have unsaved
                    changes.
                  </p>
                ) : (
                  <p className="text-sm text-kite-faint">
                    No unsaved
                    changes.
                  </p>
                )}

              </div>

              <div className="flex justify-end gap-3">

                <button
                  type="button"
                  disabled={
                    !hasChanges ||
                    isSaving
                  }
                  onClick={
                    resetChanges
                  }
                  className="rounded-xl border border-kite-line bg-white px-4 py-2.5 text-sm font-medium text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Reset
                </button>

                <button
                  type="submit"
                  disabled={
                    !hasChanges ||
                    isSaving ||
                    membersLoading
                  }
                  className="rounded-xl bg-kite-blue-deep px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving
                    ? "Saving..."
                    : "Save Changes"}
                </button>

              </div>

            </div>

          </section>

        </form>

        {/* RIGHT SIDEBAR */}
        <aside className="space-y-5">

          {/* CURRENT PROJECT */}
          <section className="rounded-2xl border border-kite-line bg-white">

            <div className="border-b border-kite-line px-5 py-4">

              <h3 className="font-semibold text-kite-ink">
                Current Project
              </h3>

            </div>

            <div className="p-5">

              <div className="flex items-start justify-between gap-3">

                <div className="min-w-0">

                  <p className="truncate font-medium text-kite-ink">
                    {
                      project.name
                    }
                  </p>

                  <p className="mt-1 text-xs text-kite-muted">
                    {
                      workspace?.name
                    }
                  </p>

                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${getStatusStyle(
                    project.status
                  )}`}
                >
                  {
                    project.status
                  }
                </span>

              </div>

              <div className="my-5 h-px bg-kite-line" />

              <div className="space-y-4">

                <div className="flex items-center justify-between gap-3">

                  <span className="text-sm text-kite-muted">
                    Tasks
                  </span>

                  <span className="text-sm font-medium text-kite-ink">
                    {
                      project.totalTasks
                    }
                  </span>

                </div>

                <div className="flex items-center justify-between gap-3">

                  <span className="text-sm text-kite-muted">
                    Completed
                  </span>

                  <span className="text-sm font-medium text-kite-ink">
                    {
                      project.completedTasks
                    }
                  </span>

                </div>

                <div className="flex items-center justify-between gap-3">

                  <span className="text-sm text-kite-muted">
                    Members
                  </span>

                  <span className="text-sm font-medium text-kite-ink">
                    {
                      project.members.length
                    }
                  </span>

                </div>

              </div>

            </div>

          </section>

          {/* ACCESS */}
          <section className="rounded-2xl border border-kite-line bg-white p-5">

            <p className="text-xs font-medium uppercase tracking-wide text-kite-faint">
              Your access
            </p>

            <div className="mt-3">

              <p className="font-medium text-kite-ink">
                {
                  role
                }
              </p>

              <p className="mt-1 text-xs leading-5 text-kite-muted">
                {role ===
                "Owner"
                  ? "Full project and workspace control."
                  : "Can manage projects, tasks, members, and reviews."}
              </p>

            </div>

          </section>

          {/* DANGER ZONE */}
          {canDeleteProject && (
            <section className="rounded-2xl border border-red-100 bg-white">

              <div className="border-b border-red-100 px-5 py-4">

                <h3 className="font-semibold text-red-600">
                  Danger Zone
                </h3>

                <p className="mt-1 text-xs leading-5 text-kite-muted">
                  Destructive actions
                  cannot be easily
                  undone.
                </p>

              </div>

              <div className="p-5">

                <h4 className="text-sm font-medium text-kite-ink">
                  Delete project
                </h4>

                <p className="mt-2 text-xs leading-5 text-kite-muted">
                  Permanently remove
                  this project and its
                  project data.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmation(
                      ""
                    );

                    setDeleteError(
                      ""
                    );

                    setDeleteConfirmOpen(
                      true
                    );
                  }}
                  className="mt-4 w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  Delete Project
                </button>

              </div>

            </section>
          )}

        </aside>

      </div>

      {/* DELETE CONFIRMATION */}
      {deleteConfirmOpen &&
        canDeleteProject && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">

          <button
            type="button"
            aria-label="Close delete confirmation"
            disabled={
              isDeleting
            }
            onClick={() =>
              setDeleteConfirmOpen(
                false
              )
            }
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          />

          <div className="relative z-10 w-full max-w-[480px] rounded-[24px] border border-red-100 bg-white shadow-[0_25px_80px_-30px_rgba(46,51,56,0.5)]">

            <div className="p-6">

              <div className="grid h-12 w-12 place-items-center rounded-xl bg-red-50 text-red-500">

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-6 w-6"
                >
                  <path d="M12 8v5M12 17h.01" />

                  <path d="M10.3 4.4 2.8 18a2 2 0 0 0 1.8 3h14.8a2 2 0 0 0 1.8-3L13.7 4.4a2 2 0 0 0-3.4 0Z" />
                </svg>

              </div>

              <h2 className="mt-5 text-xl font-semibold tracking-tight text-kite-ink">
                Delete project?
              </h2>

              <p className="mt-2 text-sm leading-6 text-kite-muted">
                You are about to
                delete{" "}
                <span className="font-medium text-kite-ink">
                  {
                    project.name
                  }
                </span>
                . This action cannot
                be undone.
              </p>

              <div className="mt-5 rounded-xl border border-red-100 bg-red-50/50 p-4">

                <p className="text-xs leading-5 text-red-700">
                  Tasks, project
                  members, comments,
                  attachments, and
                  activity associated
                  with this project
                  will also be
                  removed.
                </p>

              </div>

              {deleteError && (
                <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3">

                  <p className="text-sm text-red-600">
                    {
                      deleteError
                    }
                  </p>

                </div>
              )}

              <div className="mt-5">

                <label
                  htmlFor="delete-project-confirmation"
                  className="mb-2 block text-sm font-medium text-kite-muted"
                >
                  Type{" "}
                  <span className="font-semibold text-kite-ink">
                    {
                      project.name
                    }
                  </span>{" "}
                  to confirm
                </label>

                <input
                  id="delete-project-confirmation"
                  value={
                    deleteConfirmation
                  }
                  disabled={
                    isDeleting
                  }
                  onChange={(
                    event
                  ) =>
                    setDeleteConfirmation(
                      event.target
                        .value
                    )
                  }
                  autoFocus
                  className="w-full rounded-xl border border-red-200 bg-white px-4 py-3.5 text-sm text-kite-ink outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50 disabled:opacity-60"
                />

              </div>

            </div>

            <div className="flex justify-end gap-3 border-t border-kite-line bg-kite-soft/70 px-6 py-4">

              <button
                type="button"
                disabled={
                  isDeleting
                }
                onClick={() =>
                  setDeleteConfirmOpen(
                    false
                  )
                }
                className="rounded-xl border border-kite-line bg-white px-4 py-2.5 text-sm font-medium text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  isDeleting ||
                  deleteConfirmation
                    .trim() !==
                    project.name
                }
                onClick={
                  handleDeleteProject
                }
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isDeleting
                  ? "Deleting..."
                  : "Delete Project"}
              </button>

            </div>

          </div>

        </div>
      )}

    </>
  );
}

export default ProjectSettingsSection;