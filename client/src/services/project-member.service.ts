import {
  apiFetch,
} from "../lib/api";

export type WorkspaceProjectMember = {
  userId: string;

  membershipId?: string;

  name: string;

  email: string;

  jobTitle: string | null;

  role?: string;

  initials: string;
};

export type ApiProjectMember = {
  projectMemberId: string;

  id: string;

  name: string;

  email: string;

  jobTitle: string | null;

  addedAt: string;

  addedBy?: {
    id: string;
    name: string;
  };
};

/*
|--------------------------------------------------------------------------
| RAW WORKSPACE MEMBER
|--------------------------------------------------------------------------
|
| Workspace member responses have changed
| during the frontend migration, so this
| normalizer supports both:
|
| flattened:
|
| {
|   id,
|   userId,
|   name,
|   email
| }
|
| and nested:
|
| {
|   id,
|   user: {
|     id,
|     name,
|     email
|   }
| }
|
*/

type RawWorkspaceMember = {
  id?: string;

  membershipId?: string;

  userId?: string;

  name?: string;

  email?: string;

  jobTitle?: string | null;

  role?: string;

  user?: {
    id?: string;

    name?: string;

    email?: string;

    jobTitle?: string | null;
  };
};

type WorkspaceMembersResponse = {
  success: true;

  data: {
    members: RawWorkspaceMember[];
  };
};

type ProjectMembersResponse = {
  success: true;

  data: {
    members: ApiProjectMember[];
  };
};

type AddProjectMembersResponse = {
  success: true;

  message: string;

  data: {
    addedCount: number;

    members?: ApiProjectMember[];
  };
};

type RemoveProjectMemberResponse = {
  success: true;

  message: string;
};

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

function normalizeWorkspaceMember(
  member: RawWorkspaceMember
): WorkspaceProjectMember | null {
  const userId =
    member.userId ??
    member.user?.id ??
    /*
     * Fallback for responses where
     * id itself is the User UUID.
     */
    member.id;

  const name =
    member.name ??
    member.user?.name ??
    "";

  const email =
    member.email ??
    member.user?.email ??
    "";

  const jobTitle =
    member.jobTitle ??
    member.user?.jobTitle ??
    null;

  if (
    !userId ||
    !name
  ) {
    return null;
  }

  /*
   * If userId or nested user exists,
   * member.id usually represents the
   * WorkspaceMembership ID.
   */
  const membershipId =
    member.membershipId ??
    (
      member.userId ||
      member.user
        ? member.id
        : undefined
    );

  return {
    userId,

    membershipId,

    name,

    email,

    jobTitle,

    role:
      member.role,

    initials:
      getInitials(
        name
      ),
  };
}

export const projectMemberService = {
  async getWorkspaceMembers(
    workspaceId: string
  ) {
    const response =
      await apiFetch<WorkspaceMembersResponse>(
        `/workspaces/${workspaceId}/members`
      );

    return response.data.members
      .map(
        normalizeWorkspaceMember
      )
      .filter(
        (
          member
        ): member is WorkspaceProjectMember =>
          member !== null
      );
  },

  getProjectMembers(
    workspaceId: string,
    projectId: string
  ) {
    return apiFetch<ProjectMembersResponse>(
      `/workspaces/${workspaceId}/projects/${projectId}/members`
    );
  },

  addMembers(
    workspaceId: string,
    projectId: string,
    userIds: string[]
  ) {
    return apiFetch<AddProjectMembersResponse>(
      `/workspaces/${workspaceId}/projects/${projectId}/members`,
      {
        method: "POST",

        body: {
          userIds,
        },
      }
    );
  },

  removeMember(
    workspaceId: string,
    projectId: string,
    userId: string
  ) {
    return apiFetch<RemoveProjectMemberResponse>(
      `/workspaces/${workspaceId}/projects/${projectId}/members/${userId}`,
      {
        method: "DELETE",
      }
    );
  },
};