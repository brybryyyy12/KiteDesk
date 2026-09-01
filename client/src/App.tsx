import {
  Navigate,
  Route,
  Routes,
} from "react-router";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import CheckEmailPage from "./pages/auth/CheckEmailPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";

import InvitationPage from "./pages/invitations/InvitationPage";

import CreateWorkspacePage from "./pages/onboarding/CreateWorkspacePage";

import AppLayout from "./components/layout/AppLayout";

import DashboardPage from "./pages/dashboard/DashboardPage";

import WorkspacePage from "./pages/workspace/WorkspacePage";

import ProjectsPage from "./pages/projects/ProjectsPage";

import ProjectDetailsPage from "./pages/projects/ProjectDetailsPage";

import TaskDetailsPage from "./pages/tasks/TaskDetailsPage";

import MyTasksPage from "./pages/tasks/MyTaskPage";

import NotificationsPage from "./pages/notification/NotificationsPage";

import SettingsPage from "./pages/settings/SettingsPage";

import NotFoundPage from "./pages/errors/NotFoundPage";

/*
|--------------------------------------------------------------------------
| GUARDS
|--------------------------------------------------------------------------
*/

import RequireAuth from "./components/guards/RequireAuth";

import GuestOnlyRoute from "./components/guards/GuestOnlyRoute";

import RequireWorkspace from "./components/guards/RequireWorkspace";

import WorkspaceOnboardingGuard from "./components/guards/WorkspaceOnboardingGuard";

function App() {
  return (
    <Routes>

      {/* ROOT */}

      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      {/* INVITATION
          ---------------------------------------------------------------
          Invitation is public.

          Someone must be able to open an invitation before signing in
          or creating an account.
      */}

      <Route
        path="/invitations/:token"
        element={
          <InvitationPage />
        }
      />

      {/* EMAIL VERIFICATION
          ---------------------------------------------------------------
          These routes must remain public.

          Newly registered users intentionally do not receive an auth
          token until their email address has been verified.
      */}

      <Route
        path="/check-email"
        element={
          <CheckEmailPage />
        }
      />

      <Route
        path="/verify-email"
        element={
          <VerifyEmailPage />
        }
      />

      {/* PUBLIC / GUEST ONLY */}

      <Route
        path="/login"
        element={
          <GuestOnlyRoute>
            <LoginPage />
          </GuestOnlyRoute>
        }
      />

      <Route
        path="/register"
        element={
          <GuestOnlyRoute>
            <RegisterPage />
          </GuestOnlyRoute>
        }
      />

      {/* FIRST WORKSPACE ONBOARDING
          ---------------------------------------------------------------
          This route is only for users who do not yet have a workspace.

          They may:
          - create their first workspace
          - skip onboarding
      */}

      <Route
        path="/onboarding/workspace"
        element={
          <RequireAuth>
            <WorkspaceOnboardingGuard>
              <CreateWorkspacePage />
            </WorkspaceOnboardingGuard>
          </RequireAuth>
        }
      />

      {/* CREATE ANOTHER WORKSPACE
          ---------------------------------------------------------------
          Existing users may create additional workspaces here.

          IMPORTANT:
          Do not use WorkspaceOnboardingGuard here because that guard
          intentionally redirects users who already have a workspace.
      */}

      <Route
        path="/workspace/new"
        element={
          <RequireAuth>
            <CreateWorkspacePage />
          </RequireAuth>
        }
      />

      {/* APPLICATION
          ---------------------------------------------------------------
          Authentication is required for the application shell.

          A workspace is NOT globally required anymore.

          This allows a newly registered user to skip workspace creation
          and still enter KiteDesk.
      */}

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >

        {/* DASHBOARD
            -------------------------------------------------------------
            Workspace optional.

            Users who skipped onboarding must still be able to reach
            their dashboard.
        */}

        <Route
          path="/dashboard"
          element={
            <DashboardPage />
          }
        />

        {/* MY TASKS
            -------------------------------------------------------------
            Workspace optional.

            With no active workspace, this page should eventually show
            an empty state instead of redirecting.
        */}

        <Route
          path="/my-tasks"
          element={
            <MyTasksPage />
          }
        />

        {/* NOTIFICATIONS
            -------------------------------------------------------------
            Notifications belong to the user, so a workspace should not
            be required just to open this page.
        */}

        <Route
          path="/notifications"
          element={
            <NotificationsPage />
          }
        />

        {/* WORKSPACE
            -------------------------------------------------------------
            Workspace optional.

            This is the workspace management page where the user can:
            - see all workspaces
            - select one
            - create another
        */}

        <Route
          path="/workspace"
          element={
            <WorkspacePage />
          }
        />

        {/* SETTINGS
            -------------------------------------------------------------
            Account settings should remain available even when the user
            does not belong to a workspace.
        */}

        <Route
          path="/settings"
          element={
            <SettingsPage />
          }
        />

        {/* PROJECTS
            -------------------------------------------------------------
            Projects require an active workspace.
        */}

        <Route
          path="/projects"
          element={
            <RequireWorkspace>
              <ProjectsPage />
            </RequireWorkspace>
          }
        />

        {/* TASK DETAILS
            -------------------------------------------------------------
            A task always belongs to a project/workspace.
        */}

        <Route
          path="/projects/:projectId/tasks/:taskId"
          element={
            <RequireWorkspace>
              <TaskDetailsPage />
            </RequireWorkspace>
          }
        />

        {/* PROJECT DETAILS
            -------------------------------------------------------------
            Project routes require an active workspace.
        */}

        <Route
          path="/projects/:projectId/*"
          element={
            <RequireWorkspace>
              <ProjectDetailsPage />
            </RequireWorkspace>
          }
        />

      </Route>

      {/* NOT FOUND
          ---------------------------------------------------------------
          Unknown URLs should display the actual 404 page.
      */}

      <Route
        path="*"
        element={
          <NotFoundPage />
        }
      />

    </Routes>
  );
}

export default App;
