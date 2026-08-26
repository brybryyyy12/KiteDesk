import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { useAuth } from "../../context/AuthContext";
import {
  useWorkspace,
  type WorkspaceRole,
} from "../../context/WorkspaceContext";

import {
  workspaceMemberService,
  type ApiWorkspaceInvitation,
  type ApiWorkspaceMember,
  type ApiWorkspaceRole,
} from "../../services/workspace-member.service";

import { ApiError } from "../../lib/api";

type TeamRow =
  | {
      kind: "member";
      id: string;
      membershipId: string;
      userId: string;
      name: string;
      email: string;
      role: WorkspaceRole;
      status: "Active";
      initials: string;
      joinedAt: string;
    }
  | {
      kind: "invitation";
      id: string;
      invitationId: string;
      name: string;
      email: string;
      role: WorkspaceRole;
      status: "Pending";
      initials: string;
      expiresAt: string;
    };

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function mapRole(
  role: ApiWorkspaceRole
): WorkspaceRole {
  switch (role) {
    case "OWNER":
      return "Owner";

    case "MANAGER":
      return "Manager";

    case "MEMBER":
      return "Member";
  }
}

function toApiRole(
  role: WorkspaceRole
): ApiWorkspaceRole {
  switch (role) {
    case "Owner":
      return "OWNER";

    case "Manager":
      return "MANAGER";

    case "Member":
      return "MEMBER";
  }
}

function getInitials(
  name: string
) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (part) =>
        part[0]
    )
    .join("")
    .slice(
      0,
      2
    )
    .toUpperCase();

  return initials || "U";
}

function nameFromEmail(
  email: string
) {
  return email
    .split("@")[0]
    .replace(
      /[._-]/g,
      " "
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function formatCreatedDate(
  value?: string
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      month:
        "long",

      year:
        "numeric",
    }
  ).format(date);
}

function WorkspacePage() {
  const {
    user,
  } =
    useAuth();

  const {
    workspace,

    isLoading:
      workspaceLoading,

    error:
      workspaceError,

    refreshWorkspaces,
  } =
    useWorkspace();

  /*
  |--------------------------------------------------------------------------
  | DATA
  |--------------------------------------------------------------------------
  */

  const [
    members,
    setMembers,
  ] =
    useState<
      ApiWorkspaceMember[]
    >([]);

  const [
    invitations,
    setInvitations,
  ] =
    useState<
      ApiWorkspaceInvitation[]
    >([]);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    loadError,
    setLoadError,
  ] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | SEARCH
  |--------------------------------------------------------------------------
  */

  const [
    search,
    setSearch,
  ] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | INVITE
  |--------------------------------------------------------------------------
  */

  const [
    inviteOpen,
    setInviteOpen,
  ] =
    useState(false);

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    role,
    setRole,
  ] =
    useState<
      WorkspaceRole
    >("Member");

  const [
    emailError,
    setEmailError,
  ] =
    useState("");

  const [
    isInviting,
    setIsInviting,
  ] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | MEMBER ACTIONS
  |--------------------------------------------------------------------------
  */

  const [
    openMenuId,
    setOpenMenuId,
  ] =
    useState<
      string | null
    >(null);

  const [
    isActionLoading,
    setIsActionLoading,
  ] =
    useState<
      string | null
    >(null);

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  const [
    actionError,
    setActionError,
  ] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | PERMISSIONS
  |--------------------------------------------------------------------------
  */

  const isOwner =
    workspace?.role ===
    "Owner";

  const isManager =
    workspace?.role ===
    "Manager";

  const canInvite =
    isOwner ||
    isManager;

  /*
  |--------------------------------------------------------------------------
  | LOAD MEMBERS + INVITATIONS
  |--------------------------------------------------------------------------
  */

  const loadWorkspacePeople =
    useCallback(
      async () => {
        if (
          !workspace
        ) {
          return;
        }

        setIsLoading(
          true
        );

        setLoadError(
          ""
        );

        try {
          const membersResponse =
            await workspaceMemberService.getMembers(
              workspace.id
            );

          setMembers(
            membersResponse
              .data
              .members
          );

          /*
           * Invitations are management
           * data. Regular Members don't
           * request this endpoint.
           */
          if (
            canInvite
          ) {
            const invitationsResponse =
              await workspaceMemberService.getInvitations(
                workspace.id
              );

            setInvitations(
              invitationsResponse
                .data
                .invitations
            );
          } else {
            setInvitations(
              []
            );
          }
        } catch (
          error
        ) {
          console.error(
            "Failed to load workspace members:",
            error
          );

          setLoadError(
            error instanceof
              ApiError
              ? error.message
              : "Unable to load workspace members."
          );
        } finally {
          setIsLoading(
            false
          );
        }
      },
      [
        workspace,
        canInvite,
      ]
    );

  useEffect(
    () => {
      void loadWorkspacePeople();
    },
    [
      loadWorkspacePeople,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | TEAM ROWS
  |--------------------------------------------------------------------------
  */

  const teamRows =
    useMemo<
      TeamRow[]
    >(
      () => {
        const activeRows:
          TeamRow[] =
          members.map(
            (
              member
            ) => ({
              kind:
                "member",

              id:
                `member-${member.id}`,

              membershipId:
                member.id,

              userId:
                member.user.id,

              name:
                member.user.name,

              email:
                member.user.email,

              role:
                mapRole(
                  member.role
                ),

              status:
                "Active",

              initials:
                getInitials(
                  member.user.name
                ),

              joinedAt:
                member.joinedAt,
            })
          );

        const pendingRows:
          TeamRow[] =
          invitations
            .filter(
              (
                invitation
              ) =>
                invitation.status ===
                "PENDING"
            )
            .map(
              (
                invitation
              ) => {
                const derivedName =
                  nameFromEmail(
                    invitation.email
                  );

                return {
                  kind:
                    "invitation",

                  id:
                    `invite-${invitation.id}`,

                  invitationId:
                    invitation.id,

                  name:
                    derivedName,

                  email:
                    invitation.email,

                  role:
                    mapRole(
                      invitation.role
                    ),

                  status:
                    "Pending",

                  initials:
                    getInitials(
                      derivedName
                    ),

                  expiresAt:
                    invitation.expiresAt,
                };
              }
            );

        return [
          ...activeRows,
          ...pendingRows,
        ];
      },
      [
        members,
        invitations,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | FILTER
  |--------------------------------------------------------------------------
  */

  const visibleRows =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        if (!query) {
          return teamRows;
        }

        return teamRows.filter(
          (
            row
          ) =>
            row.name
              .toLowerCase()
              .includes(
                query
              ) ||
            row.email
              .toLowerCase()
              .includes(
                query
              ) ||
            row.role
              .toLowerCase()
              .includes(
                query
              )
        );
      },
      [
        teamRows,
        search,
      ]
    );

  const activeMembers =
    members.length;

  const pendingInvites =
    invitations.filter(
      (
        invitation
      ) =>
        invitation.status ===
        "PENDING"
    ).length;

  /*
  |--------------------------------------------------------------------------
  | INVITE MODAL
  |--------------------------------------------------------------------------
  */

  const resetInviteForm =
    () => {
      setEmail(
        ""
      );

      setRole(
        "Member"
      );

      setEmailError(
        ""
      );
    };

  const closeInviteModal =
    () => {
      if (
        isInviting
      ) {
        return;
      }

      setInviteOpen(
        false
      );

      resetInviteForm();
    };

  const openInviteModal =
    () => {
      resetInviteForm();

      setActionError(
        ""
      );

      setInviteOpen(
        true
      );
    };

  /*
  |--------------------------------------------------------------------------
  | MOBILE MODAL BEHAVIOR
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      if (
        !inviteOpen
      ) {
        return;
      }

      const previousOverflow =
        document.body.style.overflow;

      document.body.style.overflow =
        "hidden";

      const handleKeyDown =
        (
          event:
            KeyboardEvent
        ) => {
          if (
            event.key !==
              "Escape" ||
            isInviting
          ) {
            return;
          }

          setInviteOpen(
            false
          );

          setEmail(
            ""
          );

          setRole(
            "Member"
          );

          setEmailError(
            ""
          );
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
      inviteOpen,
      isInviting,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | INVITE MEMBER
  |--------------------------------------------------------------------------
  */

  const handleInvite =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      if (
        !workspace
      ) {
        return;
      }

      setEmailError(
        ""
      );

      setSuccessMessage(
        ""
      );

      setActionError(
        ""
      );

      const cleanEmail =
        email
          .trim()
          .toLowerCase();

      if (
        !cleanEmail
      ) {
        setEmailError(
          "Please enter an email address."
        );

        return;
      }

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          cleanEmail
        )
      ) {
        setEmailError(
          "Please enter a valid email address."
        );

        return;
      }

      const alreadyActive =
        members.some(
          (
            member
          ) =>
            member.user.email
              .toLowerCase() ===
            cleanEmail
        );

      const alreadyPending =
        invitations.some(
          (
            invitation
          ) =>
            invitation.email
              .toLowerCase() ===
              cleanEmail &&
            invitation.status ===
              "PENDING"
        );

      if (
        alreadyActive
      ) {
        setEmailError(
          "This person is already a workspace member."
        );

        return;
      }

      if (
        alreadyPending
      ) {
        setEmailError(
          "This person already has a pending invitation."
        );

        return;
      }

      setIsInviting(
        true
      );

      try {
        await workspaceMemberService.invite(
          workspace.id,
          {
            email:
              cleanEmail,

            role:
              toApiRole(
                role
              ),
          }
        );

        await loadWorkspacePeople();

        setSuccessMessage(
          `Invitation created for ${cleanEmail}.`
        );

        setInviteOpen(
          false
        );

        resetInviteForm();
      } catch (
        error
      ) {
        console.error(
          "Failed to invite workspace member:",
          error
        );

        setEmailError(
          error instanceof
            ApiError
            ? error.message
            : "Unable to send the invitation."
        );
      } finally {
        setIsInviting(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | CHANGE ROLE
  |--------------------------------------------------------------------------
  */

  const handleRoleChange =
    async (
      row:
        TeamRow,

      nextRole:
        WorkspaceRole
    ) => {
      if (
        !workspace ||
        row.kind !==
          "member"
      ) {
        return;
      }

      if (
        row.role ===
        nextRole
      ) {
        setOpenMenuId(
          null
        );

        return;
      }

      setIsActionLoading(
        row.id
      );

      setSuccessMessage(
        ""
      );

      setActionError(
        ""
      );

      try {
        await workspaceMemberService.updateMemberRole(
          workspace.id,
          row.membershipId,
          toApiRole(
            nextRole
          )
        );

        await loadWorkspacePeople();

        setSuccessMessage(
          `${row.name}'s role was changed to ${nextRole}.`
        );

        setOpenMenuId(
          null
        );
      } catch (
        error
      ) {
        console.error(
          "Failed to change member role:",
          error
        );

        setActionError(
          error instanceof
            ApiError
            ? error.message
            : "Unable to change the member's role."
        );
      } finally {
        setIsActionLoading(
          null
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | REMOVE MEMBER
  |--------------------------------------------------------------------------
  */

  const handleRemoveMember =
    async (
      row:
        TeamRow
    ) => {
      if (
        !workspace ||
        row.kind !==
          "member"
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `Remove ${row.name} from ${workspace.name}?`
        );

      if (
        !confirmed
      ) {
        return;
      }

      setIsActionLoading(
        row.id
      );

      setSuccessMessage(
        ""
      );

      setActionError(
        ""
      );

      try {
        await workspaceMemberService.removeMember(
          workspace.id,
          row.membershipId
        );

        await loadWorkspacePeople();

        setSuccessMessage(
          `${row.name} was removed from the workspace.`
        );

        setOpenMenuId(
          null
        );
      } catch (
        error
      ) {
        console.error(
          "Failed to remove member:",
          error
        );

        setActionError(
          error instanceof
            ApiError
            ? error.message
            : "Unable to remove this workspace member."
        );
      } finally {
        setIsActionLoading(
          null
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | REVOKE INVITATION
  |--------------------------------------------------------------------------
  */

  const handleRevokeInvitation =
    async (
      row:
        TeamRow
    ) => {
      if (
        !workspace ||
        row.kind !==
          "invitation"
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `Revoke the invitation for ${row.email}?`
        );

      if (
        !confirmed
      ) {
        return;
      }

      setIsActionLoading(
        row.id
      );

      setSuccessMessage(
        ""
      );

      setActionError(
        ""
      );

      try {
        await workspaceMemberService.revokeInvitation(
          workspace.id,
          row.invitationId
        );

        await loadWorkspacePeople();

        setSuccessMessage(
          `Invitation for ${row.email} was revoked.`
        );

        setOpenMenuId(
          null
        );
      } catch (
        error
      ) {
        console.error(
          "Failed to revoke invitation:",
          error
        );

        setActionError(
          error instanceof
            ApiError
            ? error.message
            : "Unable to revoke this invitation."
        );
      } finally {
        setIsActionLoading(
          null
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | ROW PERMISSIONS
  |--------------------------------------------------------------------------
  */

  const canManageRow =
    (
      row:
        TeamRow
    ) => {
      /*
       * User cannot manage their
       * own membership here.
       */
      if (
        row.kind ===
          "member" &&
        row.userId ===
          user?.id
      ) {
        return false;
      }

      if (
        isOwner
      ) {
        return true;
      }

      /*
       * Managers only manage Members.
       */
      if (
        isManager
      ) {
        return (
          row.role ===
          "Member"
        );
      }

      return false;
    };

  /*
  |--------------------------------------------------------------------------
  | ROW MENU
  |--------------------------------------------------------------------------
  */

  const renderRowMenu =
    (
      row:
        TeamRow
    ) => {
      if (
        !canManageRow(
          row
        ) ||
        openMenuId !==
          row.id
      ) {
        return null;
      }

      return (
        <div className="absolute right-0 top-11 z-40 w-52 rounded-xl border border-kite-line bg-white p-1.5 shadow-[0_18px_55px_-25px_rgba(46,51,56,0.45)]">

          {row.kind ===
            "member" &&
            isOwner && (
            <>

              {row.role !==
                "Member" && (
                <button
                  type="button"
                  onClick={() =>
                    void handleRoleChange(
                      row,
                      "Member"
                    )
                  }
                  className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-kite-ink transition hover:bg-kite-soft"
                >
                  Make Member
                </button>
              )}

              {row.role !==
                "Manager" && (
                <button
                  type="button"
                  onClick={() =>
                    void handleRoleChange(
                      row,
                      "Manager"
                    )
                  }
                  className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-kite-ink transition hover:bg-kite-soft"
                >
                  Make Manager
                </button>
              )}

              {row.role !==
                "Owner" && (
                <button
                  type="button"
                  onClick={() =>
                    void handleRoleChange(
                      row,
                      "Owner"
                    )
                  }
                  className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-kite-ink transition hover:bg-kite-soft"
                >
                  Make Owner
                </button>
              )}

              <div className="my-1 h-px bg-kite-line" />

            </>
          )}

          {row.kind ===
          "member" ? (
            <button
              type="button"
              onClick={() =>
                void handleRemoveMember(
                  row
                )
              }
              className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-red-500 transition hover:bg-red-50"
            >
              Remove member
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                void handleRevokeInvitation(
                  row
                )
              }
              className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-red-500 transition hover:bg-red-50"
            >
              Revoke invitation
            </button>
          )}

        </div>
      );
    };

  /*
  |--------------------------------------------------------------------------
  | PAGE STATES
  |--------------------------------------------------------------------------
  */

  if (
    workspaceLoading
  ) {
    return (
      <WorkspacePageSkeleton />
    );
  }

  if (
    workspaceError
  ) {
    return (
      <WorkspacePageError
        message={
          workspaceError
        }
        onRetry={() =>
          void refreshWorkspaces()
        }
      />
    );
  }

  if (
    !workspace
  ) {
    return (
      <WorkspacePageError
        message="No active workspace is available."
        onRetry={() =>
          void refreshWorkspaces()
        }
      />
    );
  }

  return (
    <>
      <div className="mx-auto min-w-0 max-w-[1500px]">

        {/* PAGE HEADER */}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-8 sm:flex-row sm:items-end sm:gap-5">

          <div className="min-w-0">

            <p className="mb-1 text-xs text-kite-muted sm:text-sm">
              Workspace
            </p>

            <h1 className="break-words text-2xl font-semibold tracking-tight text-kite-ink sm:text-3xl">
              {
                workspace.name
              }
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-kite-muted">
              Manage your workspace, members, and team access.
            </p>

          </div>

          {canInvite && (
            <button
              type="button"
              onClick={
                openInviteModal
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-kite-blue-deep px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:brightness-95 sm:w-fit sm:hover:-translate-y-[1px]"
            >

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>

              Invite Member

            </button>
          )}

        </div>

        {/* SUCCESS */}
        {successMessage && (
          <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-kite-line bg-kite-blue-wash px-4 py-3 sm:items-center">

            <div className="flex min-w-0 items-start gap-3 sm:items-center">

              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-kite-blue-deep">
                ✓
              </div>

              <p className="min-w-0 break-words text-sm leading-6 text-kite-ink">
                {
                  successMessage
                }
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                setSuccessMessage(
                  ""
                )
              }
              aria-label="Dismiss success message"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-kite-muted transition hover:bg-white/70 hover:text-kite-ink"
            >
              ×
            </button>

          </div>
        )}

        {/* ACTION ERROR */}
        {actionError && (
          <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 sm:items-center">

            <p className="min-w-0 break-words text-sm leading-6 text-red-600">
              {
                actionError
              }
            </p>

            <button
              type="button"
              onClick={() =>
                setActionError(
                  ""
                )
              }
              aria-label="Dismiss error"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-red-400 transition hover:bg-white/70 hover:text-red-600"
            >
              ×
            </button>

          </div>
        )}

        {/* WORKSPACE OVERVIEW */}
        <section className="overflow-hidden rounded-2xl border border-kite-line bg-white">

          <div className="border-b border-kite-line px-4 py-4 sm:px-6">

            <h2 className="font-semibold text-kite-ink">
              Workspace Overview
            </h2>

            <p className="mt-1 text-sm text-kite-muted">
              General information about your team workspace.
            </p>

          </div>

          <div className="grid lg:grid-cols-[1.3fr_1fr]">

            {/* WORKSPACE INFO */}
            <div className="border-b border-kite-line p-4 sm:p-6 lg:border-b-0 lg:border-r">

              <div className="flex items-start gap-3 sm:gap-4">

                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-kite-blue-wash text-lg font-semibold text-kite-blue-deep sm:h-14 sm:w-14 sm:text-xl">
                  {workspace.name
                    .charAt(
                      0
                    )
                    .toUpperCase()}
                </div>

                <div className="min-w-0">

                  <div className="flex flex-wrap items-center gap-2">

                    <h3 className="break-words text-base font-semibold text-kite-ink sm:text-lg">
                      {
                        workspace.name
                      }
                    </h3>

                    <span className="rounded-full bg-kite-soft px-2.5 py-1 text-[10px] font-medium text-kite-muted sm:text-xs">
                      {
                        workspace.role
                      }
                    </span>

                  </div>

                  <p className="mt-2 line-clamp-3 max-w-lg text-sm leading-6 text-kite-muted sm:line-clamp-none">
                    {workspace.description ||
                      "A collaborative workspace for planning projects, managing tasks, and keeping the team aligned."}
                  </p>

                  <p className="mt-3 text-[11px] text-kite-faint sm:mt-4 sm:text-xs">
                    Created{" "}
                    {formatCreatedDate(
                      workspace.createdAt
                    )}
                  </p>

                </div>

              </div>

            </div>

            {/* STATS */}
            <div className="grid grid-cols-3 divide-x divide-kite-line">

              <WorkspaceStat
                value={
                  isLoading
                    ? "—"
                    : activeMembers
                }
                label="Members"
              />

              <WorkspaceStat
                value={
                  workspace.projectCount
                }
                label="Projects"
              />

              {canInvite ? (
                <WorkspaceStat
                  value={
                    isLoading
                      ? "—"
                      : pendingInvites
                  }
                  label="Pending"
                />
              ) : (
                <WorkspaceStat
                  value={
                    workspace.role
                  }
                  label="Your role"
                  compact
                />
              )}

            </div>

          </div>

        </section>

        {/* TEAM MEMBERS */}
        <section className="mt-4 overflow-visible rounded-2xl border border-kite-line bg-white sm:mt-5">

          {/* TEAM HEADER */}
          <div className="border-b border-kite-line px-4 py-4 sm:px-6">

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <h2 className="font-semibold text-kite-ink">
                  Team Members
                </h2>

                <p className="mt-1 text-sm leading-6 text-kite-muted">
                  {canInvite
                    ? "People who have access or a pending invitation to this workspace."
                    : "People who currently have access to this workspace."}
                </p>

              </div>

              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:flex lg:items-center lg:gap-3">

                {/* SEARCH */}
                <div className="relative min-w-0">

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-kite-faint"
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
                    value={
                      search
                    }
                    onChange={(
                      event
                    ) => {
                      setSearch(
                        event.target
                          .value
                      );

                      setOpenMenuId(
                        null
                      );
                    }}
                    placeholder="Search members..."
                    className="w-full rounded-xl border border-kite-line bg-kite-soft py-2.5 pl-10 pr-3 text-sm text-kite-ink outline-none transition placeholder:text-kite-faint focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash lg:w-[220px]"
                  />

                </div>

                {canInvite && (
                  <button
                    type="button"
                    onClick={
                      openInviteModal
                    }
                    className="rounded-xl border border-kite-line bg-white px-4 py-2.5 text-sm font-medium text-kite-ink transition hover:bg-kite-soft"
                  >
                    + Invite
                  </button>
                )}

              </div>

            </div>

          </div>

          {/* LOADING */}
          {isLoading && (
            <div className="divide-y divide-kite-line">

              {[1, 2, 3].map(
                (
                  item
                ) => (
                  <div
                    key={
                      item
                    }
                    className="animate-pulse px-4 py-4 sm:px-6"
                  >

                    <div className="flex items-center gap-3">

                      <div className="h-10 w-10 shrink-0 rounded-full bg-kite-line" />

                      <div className="min-w-0 flex-1">

                        <div className="h-4 w-36 rounded bg-kite-line" />

                        <div className="mt-2 h-3 w-52 max-w-full rounded bg-kite-line" />

                      </div>

                      <div className="hidden h-7 w-20 rounded-lg bg-kite-line md:block" />

                    </div>

                  </div>
                )
              )}

            </div>
          )}

          {/* LOAD ERROR */}
          {!isLoading &&
            loadError && (
            <div className="px-5 py-12 text-center sm:px-6 sm:py-14">

              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-500">

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-6 w-6"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                  />

                  <path d="M12 8v5M12 17h.01" />
                </svg>

              </div>

              <h3 className="mt-4 font-semibold text-kite-ink">
                Couldn&apos;t load team members
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-red-500">
                {
                  loadError
                }
              </p>

              <button
                type="button"
                onClick={() =>
                  void loadWorkspacePeople()
                }
                className="mt-5 rounded-xl border border-kite-line bg-white px-4 py-2.5 text-sm font-medium text-kite-ink transition hover:bg-kite-soft"
              >
                Try Again
              </button>

            </div>
          )}

          {/* EMPTY */}
          {!isLoading &&
            !loadError &&
            visibleRows.length ===
              0 && (
            <div className="px-5 py-12 text-center sm:px-6">

              <h3 className="font-semibold text-kite-ink">
                {search
                  ? "No matching members"
                  : "No members found"}
              </h3>

              <p className="mt-2 text-sm text-kite-muted">
                {search
                  ? "Try a different name, email, or role."
                  : "Workspace members will appear here."}
              </p>

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch(
                      ""
                    )
                  }
                  className="mt-4 text-sm font-medium text-kite-blue-deep transition hover:text-kite-ink"
                >
                  Clear search
                </button>
              )}

            </div>
          )}

          {/* DESKTOP TABLE */}
          {!isLoading &&
            !loadError &&
            visibleRows.length >
              0 && (
            <div className="hidden md:block">

              <div className="grid grid-cols-[1.5fr_1fr_0.7fr_0.7fr_60px] border-b border-kite-line bg-kite-soft/60 px-6 py-3 text-xs font-medium uppercase tracking-wide text-kite-faint">

                <span>
                  Member
                </span>

                <span>
                  Email
                </span>

                <span>
                  Role
                </span>

                <span>
                  Status
                </span>

                <span />

              </div>

              <div className="divide-y divide-kite-line">

                {visibleRows.map(
                  (
                    row
                  ) => (
                    <div
                      key={
                        row.id
                      }
                      className="relative grid grid-cols-[1.5fr_1fr_0.7fr_0.7fr_60px] items-center px-6 py-4 transition hover:bg-kite-soft/50"
                    >

                      {/* MEMBER */}
                      <div className="flex min-w-0 items-center gap-3">

                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-kite-line bg-kite-soft text-xs font-semibold text-kite-ink">
                          {
                            row.initials
                          }
                        </div>

                        <div className="min-w-0">

                          <p className="truncate text-sm font-medium text-kite-ink">

                            {
                              row.name
                            }

                            {row.kind ===
                              "member" &&
                              row.userId ===
                                user?.id && (
                              <span className="ml-2 text-xs font-normal text-kite-faint">
                                You
                              </span>
                            )}

                          </p>

                          {row.role ===
                            "Owner" && (
                            <p className="mt-0.5 text-xs text-kite-faint">
                              Workspace owner
                            </p>
                          )}

                        </div>

                      </div>

                      {/* EMAIL */}
                      <p className="truncate pr-5 text-sm text-kite-muted">
                        {
                          row.email
                        }
                      </p>

                      {/* ROLE */}
                      <div>
                        <RoleBadge
                          role={
                            row.role
                          }
                        />
                      </div>

                      {/* STATUS */}
                      <StatusBadge
                        status={
                          row.status
                        }
                      />

                      {/* MENU */}
                      <div className="relative flex justify-end">

                        {canManageRow(
                          row
                        ) && (
                          <>

                            <button
                              type="button"
                              disabled={
                                isActionLoading ===
                                row.id
                              }
                              onClick={() =>
                                setOpenMenuId(
                                  (
                                    current
                                  ) =>
                                    current ===
                                    row.id
                                      ? null
                                      : row.id
                                )
                              }
                              aria-label={`Manage ${row.name}`}
                              aria-expanded={
                                openMenuId ===
                                row.id
                              }
                              className="grid h-9 w-9 place-items-center rounded-lg text-lg text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink disabled:opacity-40"
                            >
                              {isActionLoading ===
                              row.id
                                ? "…"
                                : "⋯"}
                            </button>

                            {renderRowMenu(
                              row
                            )}

                          </>
                        )}

                      </div>

                    </div>
                  )
                )}

              </div>

            </div>
          )}

          {/* MOBILE CARDS */}
          {!isLoading &&
            !loadError &&
            visibleRows.length >
              0 && (
            <div className="divide-y divide-kite-line md:hidden">

              {visibleRows.map(
                (
                  row
                ) => (
                  <article
                    key={
                      row.id
                    }
                    className="relative p-4"
                  >

                    <div className="flex min-w-0 items-start gap-3">

                      {/* AVATAR */}
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-kite-line bg-kite-soft text-xs font-semibold text-kite-ink">
                        {
                          row.initials
                        }
                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex min-w-0 items-start justify-between gap-2">

                          <div className="min-w-0 flex-1">

                            <p className="truncate text-sm font-medium text-kite-ink">

                              {
                                row.name
                              }

                              {row.kind ===
                                "member" &&
                                row.userId ===
                                  user?.id && (
                                <span className="ml-2 text-[10px] font-normal text-kite-faint">
                                  You
                                </span>
                              )}

                            </p>

                            <p className="mt-1 truncate text-xs text-kite-muted">
                              {
                                row.email
                              }
                            </p>

                          </div>

                          {/* MOBILE MANAGEMENT MENU */}
                          {canManageRow(
                            row
                          ) && (
                            <div className="relative shrink-0">

                              <button
                                type="button"
                                disabled={
                                  isActionLoading ===
                                  row.id
                                }
                                onClick={() =>
                                  setOpenMenuId(
                                    (
                                      current
                                    ) =>
                                      current ===
                                      row.id
                                        ? null
                                        : row.id
                                  )
                                }
                                aria-label={`Manage ${row.name}`}
                                aria-expanded={
                                  openMenuId ===
                                  row.id
                                }
                                className="grid h-9 w-9 place-items-center rounded-lg text-lg text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink disabled:opacity-40"
                              >
                                {isActionLoading ===
                                row.id
                                  ? "…"
                                  : "⋯"}
                              </button>

                              {renderRowMenu(
                                row
                              )}

                            </div>
                          )}

                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">

                          <RoleBadge
                            role={
                              row.role
                            }
                          />

                          <StatusBadge
                            status={
                              row.status
                            }
                            compact
                          />

                        </div>

                      </div>

                    </div>

                  </article>
                )
              )}

            </div>
          )}

        </section>

        {/* WORKSPACE ROLES */}
        <section className="mt-5">

          <div className="mb-4">

            <h2 className="font-semibold text-kite-ink">
              Workspace Roles
            </h2>

            <p className="mt-1 text-sm text-kite-muted">
              Roles determine what members can do inside KiteDesk.
            </p>

          </div>

          {/* HORIZONTAL ON MOBILE, GRID ON DESKTOP */}
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0">

            <RoleInfoCard
              title="Owner"
              description="Full control over the workspace, members, projects, roles, and workspace settings."
              emphasized
            />

            <RoleInfoCard
              title="Manager"
              description="Creates projects and tasks, assigns work, manages team activity, and reviews completed work."
            />

            <RoleInfoCard
              title="Member"
              description="Works on assigned projects and tasks, updates progress, comments, and submits work for review."
            />

          </div>

          <p className="mt-2 text-center text-[10px] text-kite-faint md:hidden">
            Swipe to compare workspace roles.
          </p>

        </section>

      </div>

      {/* INVITE MODAL */}
      {inviteOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">

          {/* BACKDROP */}
          <button
            type="button"
            disabled={
              isInviting
            }
            onClick={
              closeInviteModal
            }
            aria-label="Close invite modal"
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px] disabled:cursor-default"
          />

          {/* MODAL / MOBILE BOTTOM SHEET */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-member-title"
            className="relative z-10 max-h-[94dvh] w-full overflow-y-auto rounded-t-[24px] border border-kite-line bg-white shadow-[0_25px_80px_-30px_rgba(46,51,56,0.45)] sm:max-h-[92vh] sm:max-w-[480px] sm:rounded-[24px]"
          >

            {/* MOBILE HANDLE */}
            <div className="flex justify-center pt-2 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-kite-line" />
            </div>

            {/* MODAL HEADER */}
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-kite-line bg-white px-4 py-4 sm:px-6 sm:py-5">

              <div className="min-w-0">

                <h2
                  id="invite-member-title"
                  className="text-lg font-semibold tracking-tight text-kite-ink"
                >
                  Invite team member
                </h2>

                <p className="mt-1 truncate text-sm text-kite-muted">
                  Invite someone to{" "}
                  {
                    workspace.name
                  }
                  .
                </p>

              </div>

              <button
                type="button"
                onClick={
                  closeInviteModal
                }
                disabled={
                  isInviting
                }
                aria-label="Close"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xl text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink disabled:opacity-40"
              >
                ×
              </button>

            </div>

            <form
              onSubmit={
                handleInvite
              }
            >

              <div className="space-y-5 p-4 sm:p-6">

                {/* EMAIL */}
                <div>

                  <label
                    htmlFor="invite-email"
                    className="mb-2 block text-sm font-medium text-kite-muted"
                  >
                    Email address
                  </label>

                  <input
                    id="invite-email"
                    type="email"
                    value={
                      email
                    }
                    disabled={
                      isInviting
                    }
                    onChange={(
                      event
                    ) => {
                      setEmail(
                        event.target
                          .value
                      );

                      setEmailError(
                        ""
                      );
                    }}
                    placeholder="teammate@example.com"
                    autoFocus
                    className={`w-full rounded-xl border bg-kite-soft px-4 py-3.5 text-sm text-kite-ink outline-none transition placeholder:text-kite-faint focus:bg-white focus:ring-4 disabled:opacity-60 ${
                      emailError
                        ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                        : "border-kite-line focus:border-kite-blue focus:ring-kite-blue-wash"
                    }`}
                  />

                  {emailError && (
                    <p className="mt-2 text-sm leading-6 text-red-500">
                      {
                        emailError
                      }
                    </p>
                  )}

                </div>

                {/* ROLE */}
                <div>

                  <label
                    htmlFor="invite-role"
                    className="mb-2 block text-sm font-medium text-kite-muted"
                  >
                    Workspace role
                  </label>

                  <select
                    id="invite-role"
                    value={
                      role
                    }
                    disabled={
                      isInviting
                    }
                    onChange={(
                      event
                    ) =>
                      setRole(
                        event.target
                          .value as
                          WorkspaceRole
                      )
                    }
                    className="w-full rounded-xl border border-kite-line bg-kite-soft px-4 py-3.5 text-sm text-kite-ink outline-none transition focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash disabled:opacity-60"
                  >

                    <option value="Member">
                      Member
                    </option>

                    {isOwner && (
                      <>
                        <option value="Manager">
                          Manager
                        </option>

                        <option value="Owner">
                          Owner
                        </option>
                      </>
                    )}

                  </select>

                </div>

                {/* ROLE DESCRIPTION */}
                <div className="rounded-xl border border-kite-line bg-kite-soft p-4">

                  <p className="text-xs leading-5 text-kite-muted">
                    {role ===
                    "Owner"
                      ? "Owners have full workspace control, including members, roles, projects, and workspace settings."
                      : role ===
                          "Manager"
                        ? "Managers can create projects, manage tasks, assign members, and review work."
                        : "Members can work on assigned tasks, update progress, comment, and submit work for review."}
                  </p>

                </div>

              </div>

              {/* MODAL ACTIONS */}
              <div className="sticky bottom-0 grid grid-cols-2 gap-3 border-t border-kite-line bg-white/95 px-4 py-4 backdrop-blur sm:flex sm:justify-end sm:px-6">

                <button
                  type="button"
                  onClick={
                    closeInviteModal
                  }
                  disabled={
                    isInviting
                  }
                  className="rounded-xl border border-kite-line bg-white px-4 py-2.5 text-sm font-medium text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    isInviting
                  }
                  className="rounded-xl bg-kite-blue-deep px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isInviting
                    ? "Sending..."
                    : "Send Invite"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </>
  );
}

/*
|--------------------------------------------------------------------------
| WORKSPACE STAT
|--------------------------------------------------------------------------
*/

function WorkspaceStat({
  value,
  label,
  compact = false,
}: {
  value:
    | string
    | number;

  label:
    string;

  compact?:
    boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col justify-center px-2 py-5 text-center sm:px-4 sm:py-6">

      <p
        className={`truncate font-semibold text-kite-ink ${
          compact
            ? "text-sm sm:text-base"
            : "text-xl sm:text-2xl"
        }`}
      >
        {
          value
        }
      </p>

      <p className="mt-1 truncate text-[10px] text-kite-muted sm:text-xs">
        {
          label
        }
      </p>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| ROLE BADGE
|--------------------------------------------------------------------------
*/

function RoleBadge({
  role,
}: {
  role:
    WorkspaceRole;
}) {
  return (
    <span
      className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-medium sm:text-xs ${
        role ===
        "Owner"
          ? "bg-kite-blue-wash text-kite-blue-deep"
          : "bg-kite-soft text-kite-muted"
      }`}
    >
      {
        role
      }
    </span>
  );
}

/*
|--------------------------------------------------------------------------
| STATUS BADGE
|--------------------------------------------------------------------------
*/

function StatusBadge({
  status,
  compact = false,
}: {
  status:
    | "Active"
    | "Pending";

  compact?:
    boolean;
}) {
  return (
    <span
      className={`flex items-center gap-1.5 text-kite-muted ${
        compact
          ? "text-[10px]"
          : "text-sm"
      }`}
    >

      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          status ===
          "Active"
            ? "bg-emerald-400"
            : "bg-amber-400"
        }`}
      />

      {
        status
      }

    </span>
  );
}

/*
|--------------------------------------------------------------------------
| ROLE INFO CARD
|--------------------------------------------------------------------------
*/

function RoleInfoCard({
  title,
  description,
  emphasized = false,
}: {
  title:
    WorkspaceRole;

  description:
    string;

  emphasized?:
    boolean;
}) {
  return (
    <article className="min-w-[82%] snap-start rounded-2xl border border-kite-line bg-white p-5 sm:min-w-[60%] md:min-w-0">

      <div
        className={`mb-4 grid h-10 w-10 place-items-center rounded-xl ${
          emphasized
            ? "bg-kite-blue-wash text-kite-blue-deep"
            : "bg-kite-soft text-kite-muted"
        }`}
      >

        {title ===
        "Owner" ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="8"
              r="3"
            />

            <path d="M5 21c.7-4.3 3-6.5 7-6.5s6.3 2.2 7 6.5" />

            <path d="m17 5 1-2 1 2 2 .4-1.4 1.5.3 2.1L18 8l-1.9 1 .3-2.1L15 5.4Z" />
          </svg>
        ) : title ===
          "Manager" ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M4 20v-9M10 20V4M16 20v-6M22 20H2" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="8"
              r="3"
            />

            <path d="M5 21c.7-4.3 3-6.5 7-6.5s6.3 2.2 7 6.5" />
          </svg>
        )}

      </div>

      <h3 className="text-sm font-semibold text-kite-ink">
        {
          title
        }
      </h3>

      <p className="mt-2 text-sm leading-6 text-kite-muted">
        {
          description
        }
      </p>

    </article>
  );
}

/*
|--------------------------------------------------------------------------
| PAGE STATES
|--------------------------------------------------------------------------
*/

function WorkspacePageSkeleton() {
  return (
    <div className="mx-auto max-w-[1500px] animate-pulse">

      <div className="mb-6 sm:mb-8">

        <div className="h-4 w-24 rounded bg-kite-line" />

        <div className="mt-3 h-8 w-52 rounded-xl bg-kite-line sm:w-64" />

        <div className="mt-3 h-4 w-96 max-w-full rounded bg-kite-line" />

      </div>

      <div className="h-64 rounded-2xl border border-kite-line bg-white sm:h-56" />

      <div className="mt-4 overflow-hidden rounded-2xl border border-kite-line bg-white sm:mt-5">

        <div className="border-b border-kite-line px-4 py-5 sm:px-6">

          <div className="h-5 w-36 rounded bg-kite-line" />

          <div className="mt-2 h-4 w-72 max-w-full rounded bg-kite-line" />

          <div className="mt-4 h-11 rounded-xl bg-kite-line sm:w-64" />

        </div>

        {[1, 2, 3].map(
          (
            item
          ) => (
            <div
              key={
                item
              }
              className="flex items-center gap-3 border-b border-kite-line px-4 py-4 last:border-b-0 sm:px-6"
            >

              <div className="h-10 w-10 rounded-full bg-kite-line" />

              <div className="flex-1">

                <div className="h-4 w-36 rounded bg-kite-line" />

                <div className="mt-2 h-3 w-52 max-w-full rounded bg-kite-line" />

              </div>

            </div>
          )
        )}

      </div>

    </div>
  );
}

type WorkspacePageErrorProps = {
  message:
    string;

  onRetry:
    () => void;
};

function WorkspacePageError({
  message,
  onRetry,
}: WorkspacePageErrorProps) {
  return (
    <div className="mx-auto max-w-[1500px]">

      <section className="rounded-2xl border border-kite-line bg-white px-5 py-12 text-center sm:px-6 sm:py-16">

        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-500 sm:h-16 sm:w-16">

          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
            />

            <path d="M12 8v5M12 17h.01" />
          </svg>

        </div>

        <h1 className="mt-5 text-xl font-semibold tracking-tight text-kite-ink">
          Couldn&apos;t load workspace
        </h1>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-kite-muted">
          {
            message
          }
        </p>

        <button
          type="button"
          onClick={
            onRetry
          }
          className="mt-6 w-full rounded-xl bg-kite-blue-deep px-5 py-3 text-sm font-medium text-white transition hover:brightness-95 sm:w-auto"
        >
          Try Again
        </button>

      </section>

    </div>
  );
}

export default WorkspacePage;