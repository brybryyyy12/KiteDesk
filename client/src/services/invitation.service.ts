import {
  apiFetch,
} from "../lib/api";

export type InvitationRole =
  | "OWNER"
  | "MANAGER"
  | "MEMBER";

export type InvitationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "REVOKED"
  | "EXPIRED";

export type InvitationDetails = {
  id: string;

  email: string;

  role: InvitationRole;

  status: InvitationStatus;

  expiresAt: string;

  createdAt?: string;

  acceptedAt?: string | null;

  workspace: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
  };

  invitedBy?: {
    id: string;
    name: string;
    email?: string;
  } | null;
};

type InvitationResponse = {
  success: true;

  message?: string;

  data: {
    invitation: InvitationDetails;
  };
};

type InvitationActionResponse = {
  success: true;

  message: string;

  data?: unknown;
};

export const invitationService = {
  getByToken(
    token: string
  ) {
    return apiFetch<InvitationResponse>(
      `/invitations/${token}`
    );
  },

  accept(
    token: string
  ) {
    return apiFetch<InvitationActionResponse>(
      `/invitations/${token}/accept`,
      {
        method: "POST",
      }
    );
  },

  decline(
    token: string
  ) {
    return apiFetch<InvitationActionResponse>(
      `/invitations/${token}/decline`,
      {
        method: "POST",
      }
    );
  },
};