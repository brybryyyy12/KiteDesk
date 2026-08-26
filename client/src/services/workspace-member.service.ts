import {
  apiFetch,
} from "../lib/api";

export type ApiWorkspaceRole =
  | "OWNER"
  | "MANAGER"
  | "MEMBER";

export type ApiWorkspaceMember = {
  id: string;

  role: ApiWorkspaceRole;

  joinedAt: string;

  user: {
    id: string;

    name: string;

    email: string;

    jobTitle: string | null;
  };
};

export type ApiInvitationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "REVOKED"
  | "EXPIRED";

export type ApiWorkspaceInvitation = {
  id: string;

  email: string;

  role: ApiWorkspaceRole;

  status: ApiInvitationStatus;

  expiresAt: string;

  acceptedAt: string | null;

  createdAt: string;

  invitedBy?: {
    id: string;

    name: string;

    email?: string;
  } | null;
};

/*
|--------------------------------------------------------------------------
| RAW BACKEND MEMBER
|--------------------------------------------------------------------------
|
| This supports both possible backend
| response styles:
|
| Nested:
|
| {
|   id,
|   role,
|   joinedAt,
|   user: {
|     id,
|     name,
|     email
|   }
| }
|
| Flattened:
|
| {
|   id,
|   userId,
|   name,
|   email,
|   role,
|   joinedAt
| }
|
*/

type RawWorkspaceMember = {
  id: string;

  membershipId?: string;

  userId?: string;

  name?: string;

  email?: string;

  jobTitle?: string | null;

  role: ApiWorkspaceRole;

  joinedAt: string;

  user?: {
    id: string;

    name: string;

    email: string;

    jobTitle?: string | null;
  };
};

type RawMembersResponse = {
  success: true;

  data: {
    members: RawWorkspaceMember[];
  };
};

type MembersResponse = {
  success: true;

  data: {
    members: ApiWorkspaceMember[];
  };
};

type InvitationsResponse = {
  success: true;

  data: {
    invitations: ApiWorkspaceInvitation[];
  };
};

type CreateInvitationResponse = {
  success: true;

  message: string;

  data?: {
    invitation?: ApiWorkspaceInvitation;

    developmentToken?: string;

    developmentInviteUrl?: string;

    inviteUrl?: string;
  };
};

type UpdateMemberRoleResponse = {
  success: true;

  message?: string;

  data?: {
    membership?: ApiWorkspaceMember;

    member?: ApiWorkspaceMember;
  };
};

/*
|--------------------------------------------------------------------------
| NORMALIZE MEMBER
|--------------------------------------------------------------------------
*/

function normalizeMember(
  member: RawWorkspaceMember
): ApiWorkspaceMember {
  /*
   * Backend returned nested user.
   */
  if (member.user) {
    return {
      id:
        member.membershipId ??
        member.id,

      role:
        member.role,

      joinedAt:
        member.joinedAt,

      user: {
        id:
          member.user.id,

        name:
          member.user.name,

        email:
          member.user.email,

        jobTitle:
          member.user.jobTitle ??
          null,
      },
    };
  }

  /*
   * Backend returned flattened data.
   */
  return {
    id:
      member.membershipId ??
      member.id,

    role:
      member.role,

    joinedAt:
      member.joinedAt,

    user: {
      id:
        member.userId ??
        "",

      name:
        member.name ??
        "Unknown User",

      email:
        member.email ??
        "",

      jobTitle:
        member.jobTitle ??
        null,
    },
  };
}

/*
|--------------------------------------------------------------------------
| SERVICE
|--------------------------------------------------------------------------
*/

export const workspaceMemberService = {
  async getMembers(
    workspaceId: string
  ): Promise<MembersResponse> {
    const response =
      await apiFetch<RawMembersResponse>(
        `/workspaces/${workspaceId}/members`
      );

    return {
      ...response,

      data: {
        ...response.data,

        members:
          response.data.members.map(
            normalizeMember
          ),
      },
    };
  },

  getInvitations(
    workspaceId: string
  ) {
    return apiFetch<InvitationsResponse>(
      `/workspaces/${workspaceId}/invitations`
    );
  },

  invite(
    workspaceId: string,
    input: {
      email: string;

      role: ApiWorkspaceRole;
    }
  ) {
    return apiFetch<CreateInvitationResponse>(
      `/workspaces/${workspaceId}/invitations`,
      {
        method: "POST",

        body: input,
      }
    );
  },

  revokeInvitation(
    workspaceId: string,
    invitationId: string
  ) {
    return apiFetch<{
      success: true;

      message: string;
    }>(
      `/workspaces/${workspaceId}/invitations/${invitationId}`,
      {
        method: "DELETE",
      }
    );
  },

  updateMemberRole(
    workspaceId: string,
    membershipId: string,
    role: ApiWorkspaceRole
  ) {
    return apiFetch<UpdateMemberRoleResponse>(
      `/workspaces/${workspaceId}/members/${membershipId}/role`,
      {
        method: "PATCH",

        body: {
          role,
        },
      }
    );
  },

  removeMember(
    workspaceId: string,
    membershipId: string
  ) {
    return apiFetch<{
      success: true;

      message: string;
    }>(
      `/workspaces/${workspaceId}/members/${membershipId}`,
      {
        method: "DELETE",
      }
    );
  },

  leaveWorkspace(
    workspaceId: string
  ) {
    return apiFetch<{
      success: true;

      message: string;
    }>(
      `/workspaces/${workspaceId}/members/me`,
      {
        method: "DELETE",
      }
    );
  },
};