import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  useAuth,
} from "./AuthContext";

import {
  settingsService,
  type ChangePasswordInput,
  type NotificationPreferences,
  type ProfileSettings,
  type UpdateNotificationPreferencesInput,
  type UpdateProfileInput,
} from "../services/settings.service";

/*
|--------------------------------------------------------------------------
| RE-EXPORT TYPES
|--------------------------------------------------------------------------
*/

export type {
  NotificationPreferences,
  ProfileSettings,
};

/*
|--------------------------------------------------------------------------
| SETTINGS
|--------------------------------------------------------------------------
*/

export type UserSettings = {
  profile: ProfileSettings;

  notifications:
    NotificationPreferences;
};

type SettingsContextType = {
  settings: UserSettings;

  isLoaded: boolean;

  isLoading: boolean;

  isSavingProfile: boolean;

  isSavingNotifications: boolean;

  isChangingPassword: boolean;

  error: string;

  refreshSettings: () => Promise<void>;

  updateProfile: (
    data: UpdateProfileInput
  ) => Promise<ProfileSettings>;

  updateNotificationPreferences: (
    data:
      UpdateNotificationPreferencesInput
  ) => Promise<NotificationPreferences>;

  changePassword: (
    data: ChangePasswordInput
  ) => Promise<string>;
};

/*
|--------------------------------------------------------------------------
| DEFAULT STATE
|--------------------------------------------------------------------------
*/

const EMPTY_SETTINGS: UserSettings = {
  profile: {
    id: "",

    displayName: "",

    email: "",

    jobTitle: null,

    createdAt: "",

    updatedAt: "",
  },

  notifications: {
    taskAssignments: true,

    reviewActivity: true,

    comments: true,

    deadlines: true,

    projectMembership: true,
  },
};

const SettingsContext =
  createContext<SettingsContextType | null>(
    null
  );

/*
|--------------------------------------------------------------------------
| PROVIDER
|--------------------------------------------------------------------------
*/

export function SettingsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    user,
    isLoading:
      authLoading,
    refreshUser,
  } =
    useAuth();

  const userId =
    user?.id ?? null;

  const [
    settings,
    setSettings,
  ] =
    useState<UserSettings>(
      EMPTY_SETTINGS
    );

  const [
    isLoaded,
    setIsLoaded,
  ] =
    useState(false);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(false);

  const [
    isSavingProfile,
    setIsSavingProfile,
  ] =
    useState(false);

  const [
    isSavingNotifications,
    setIsSavingNotifications,
  ] =
    useState(false);

  const [
    isChangingPassword,
    setIsChangingPassword,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const requestVersionRef =
    useRef(0);

  /*
  |--------------------------------------------------------------------------
  | REFRESH
  |--------------------------------------------------------------------------
  */

  const refreshSettings =
    useCallback(
      async () => {
        if (
          !userId
        ) {
          setSettings(
            EMPTY_SETTINGS
          );

          setIsLoaded(
            true
          );

          setIsLoading(
            false
          );

          setError(
            ""
          );

          return;
        }

        const requestVersion =
          ++requestVersionRef.current;

        setIsLoading(
          true
        );

        setError(
          ""
        );

        try {
          const [
            profileResponse,
            notificationResponse,
          ] =
            await Promise.all([
              settingsService.getProfile(),

              settingsService.getNotificationPreferences(),
            ]);

          if (
            requestVersion !==
            requestVersionRef.current
          ) {
            return;
          }

          setSettings({
            profile:
              profileResponse.data
                .profile,

            notifications:
              notificationResponse.data
                .preferences,
          });
        } catch (
          caughtError
        ) {
          if (
            requestVersion !==
            requestVersionRef.current
          ) {
            return;
          }

          setError(
            caughtError instanceof
              Error
              ? caughtError.message
              : "Unable to load settings."
          );
        } finally {
          if (
            requestVersion ===
            requestVersionRef.current
          ) {
            setIsLoading(
              false
            );

            setIsLoaded(
              true
            );
          }
        }
      },
      [
        userId,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | LOAD ON AUTH CHANGE
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      if (
        authLoading
      ) {
        return;
      }

      requestVersionRef.current +=
        1;

      if (
        !userId
      ) {
        setSettings(
          EMPTY_SETTINGS
        );

        setIsLoaded(
          true
        );

        setIsLoading(
          false
        );

        setError(
          ""
        );

        return;
      }

      setIsLoaded(
        false
      );

      void refreshSettings();
    },
    [
      authLoading,
      userId,
      refreshSettings,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | UPDATE PROFILE
  |--------------------------------------------------------------------------
  */

  const updateProfile =
    useCallback(
      async (
        data:
          UpdateProfileInput
      ) => {
        setIsSavingProfile(
          true
        );

        setError(
          ""
        );

        try {
          const response =
            await settingsService.updateProfile(
              data
            );

          const profile =
            response.data
              .profile;

          setSettings(
            (
              current
            ) => ({
              ...current,

              profile,
            })
          );

          try {
            await refreshUser();
          } catch {
            /*
             * Profile save already succeeded.
             */
          }

          return profile;
        } catch (
          caughtError
        ) {
          setError(
            caughtError instanceof
              Error
              ? caughtError.message
              : "Unable to update profile."
          );

          throw caughtError;
        } finally {
          setIsSavingProfile(
            false
          );
        }
      },
      [
        refreshUser,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | UPDATE NOTIFICATION PREFERENCES
  |--------------------------------------------------------------------------
  */

  const updateNotificationPreferences =
    useCallback(
      async (
        data:
          UpdateNotificationPreferencesInput
      ) => {
        setIsSavingNotifications(
          true
        );

        setError(
          ""
        );

        try {
          const response =
            await settingsService.updateNotificationPreferences(
              data
            );

          const preferences =
            response.data
              .preferences;

          setSettings(
            (
              current
            ) => ({
              ...current,

              notifications:
                preferences,
            })
          );

          return preferences;
        } catch (
          caughtError
        ) {
          setError(
            caughtError instanceof
              Error
              ? caughtError.message
              : "Unable to update notification preferences."
          );

          throw caughtError;
        } finally {
          setIsSavingNotifications(
            false
          );
        }
      },
      []
    );

  /*
  |--------------------------------------------------------------------------
  | CHANGE PASSWORD
  |--------------------------------------------------------------------------
  */

  const changePassword =
    useCallback(
      async (
        data:
          ChangePasswordInput
      ) => {
        setIsChangingPassword(
          true
        );

        try {
          const response =
            await settingsService.changePassword(
              data
            );

          return response.message;
        } finally {
          setIsChangingPassword(
            false
          );
        }
      },
      []
    );

  /*
  |--------------------------------------------------------------------------
  | VALUE
  |--------------------------------------------------------------------------
  */

  const value =
    useMemo<SettingsContextType>(
      () => ({
        settings,

        isLoaded,

        isLoading,

        isSavingProfile,

        isSavingNotifications,

        isChangingPassword,

        error,

        refreshSettings,

        updateProfile,

        updateNotificationPreferences,

        changePassword,
      }),
      [
        settings,
        isLoaded,
        isLoading,
        isSavingProfile,
        isSavingNotifications,
        isChangingPassword,
        error,
        refreshSettings,
        updateProfile,
        updateNotificationPreferences,
        changePassword,
      ]
    );

  return (
    <SettingsContext.Provider
      value={
        value
      }
    >
      {
        children
      }
    </SettingsContext.Provider>
  );
}

/*
|--------------------------------------------------------------------------
| HOOK
|--------------------------------------------------------------------------
*/

export function useSettings() {
  const context =
    useContext(
      SettingsContext
    );

  if (
    !context
  ) {
    throw new Error(
      "useSettings must be used inside SettingsProvider"
    );
  }

  return context;
}