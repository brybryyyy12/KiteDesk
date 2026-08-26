import {
  StrictMode,
} from "react";

import {
  createRoot,
} from "react-dom/client";

import {
  BrowserRouter,
} from "react-router";

import App from "./App";

import "./index.css";

import {
  ToastProvider,
} from "./context/ToastContext";

import {
  AuthProvider,
} from "./context/AuthContext";

import {
  WorkspaceProvider,
} from "./context/WorkspaceContext";

import {
  SettingsProvider,
} from "./context/SettingsContext";

import {
  ProjectProvider,
} from "./context/ProjectContext";

import {
  NotificationProvider,
} from "./context/NotificationContext";

import {
  TaskProvider,
} from "./context/TaskContext";

createRoot(
  document.getElementById(
    "root"
  )!
).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <SettingsProvider>
              <ProjectProvider>
                <NotificationProvider>
                  <TaskProvider>
                    <App />
                  </TaskProvider>
                </NotificationProvider>
              </ProjectProvider>
            </SettingsProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>
);