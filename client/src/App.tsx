import {
  Navigate,
  Route,
  Routes,
} from "react-router";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";

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
          This route is intentionally outside RequireAuth and
          RequireWorkspace.

          An invited person must be able to view the invitation before
          logging in or joining the workspace.
      */}

      <Route
        path="/invitations/:token"
        element={
          <InvitationPage />
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

      {/* ONBOARDING */}

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

      {/* APPLICATION */}

      <Route
        element={
          <RequireAuth>
            <RequireWorkspace>
              <AppLayout />
            </RequireWorkspace>
          </RequireAuth>
        }
      >

        {/* DASHBOARD */}

        <Route
          path="/dashboard"
          element={
            <DashboardPage />
          }
        />

        {/* MY TASKS */}

        <Route
          path="/my-tasks"
          element={
            <MyTasksPage />
          }
        />

        {/* NOTIFICATIONS */}

        <Route
          path="/notifications"
          element={
            <NotificationsPage />
          }
        />

        {/* PROJECTS */}

        <Route
          path="/projects"
          element={
            <ProjectsPage />
          }
        />

        {/* TASK DETAILS */}

        <Route
          path="/projects/:projectId/tasks/:taskId"
          element={
            <TaskDetailsPage />
          }
        />

        {/* PROJECT DETAILS */}

        <Route
          path="/projects/:projectId/*"
          element={
            <ProjectDetailsPage />
          }
        />

        {/* WORKSPACE */}

        <Route
          path="/workspace"
          element={
            <WorkspacePage />
          }
        />

        {/* SETTINGS */}

        <Route
          path="/settings"
          element={
            <SettingsPage />
          }
        />

      </Route>

      {/* NOT FOUND
          ---------------------------------------------------------------
          Never silently redirect an unknown URL.

          Showing a real 404 makes broken links, typos, and deleted
          resources easier for the user to understand.
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