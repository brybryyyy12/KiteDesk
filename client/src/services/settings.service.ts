import {
  apiFetch,
} from "../lib/api";

/*
|--------------------------------------------------------------------------
| PROFILE
|--------------------------------------------------------------------------
*/

export type ProfileSettings = {
  id: string;

  displayName: string;

  email: string;

  jobTitle: string | null;

  createdAt: string;

  updatedAt: string;
};

export type UpdateProfileInput = {
  displayName?: string;

  email?: string;

  jobTitle?: string | null;
};

/*
|--------------------------------------------------------------------------
| NOTIFICATION PREFERENCES
|--------------------------------------------------------------------------
*/

export type NotificationPreferences = {
  taskAssignments: boolean;

  reviewActivity: boolean;

  comments: boolean;

  deadlines: boolean;

  projectMembership: boolean;
};

export type UpdateNotificationPreferencesInput =
  Partial<NotificationPreferences>;

/*
|--------------------------------------------------------------------------
| PASSWORD
|--------------------------------------------------------------------------
*/

export type ChangePasswordInput = {
  currentPassword: string;

  newPassword: string;
};

/*
|--------------------------------------------------------------------------
| RESPONSES
|--------------------------------------------------------------------------
*/

type ProfileResponse = {
  success: true;

  data: {
    profile: ProfileSettings;
  };
};

type UpdateProfileResponse = {
  success: true;

  message: string;

  data: {
    profile: ProfileSettings;
  };
};

type NotificationPreferencesResponse = {
  success: true;

  data: {
    preferences:
      NotificationPreferences;
  };
};

type UpdateNotificationPreferencesResponse = {
  success: true;

  message: string;

  data: {
    preferences:
      NotificationPreferences;
  };
};

type ChangePasswordResponse = {
  success: true;

  message: string;
};

/*
|--------------------------------------------------------------------------
| SERVICE
|--------------------------------------------------------------------------
*/

export const settingsService = {
  async getProfile() {
    return apiFetch<ProfileResponse>(
      "/settings/profile"
    );
  },

  async updateProfile(
    input: UpdateProfileInput
  ) {
    return apiFetch<UpdateProfileResponse>(
      "/settings/profile",
      {
        method: "PATCH",

        body: input,
      }
    );
  },

  async getNotificationPreferences() {
    return apiFetch<NotificationPreferencesResponse>(
      "/settings/notifications"
    );
  },

  async updateNotificationPreferences(
    input:
      UpdateNotificationPreferencesInput
  ) {
    return apiFetch<UpdateNotificationPreferencesResponse>(
      "/settings/notifications",
      {
        method: "PATCH",

        body: input,
      }
    );
  },

  async changePassword(
    input: ChangePasswordInput
  ) {
    return apiFetch<ChangePasswordResponse>(
      "/settings/password",
      {
        method: "PATCH",

        body: input,
      }
    );
  },
};