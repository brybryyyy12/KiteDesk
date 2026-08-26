import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import {
  prisma,
} from "./config/prisma.js";

import {
  env,
} from "./config/env.js";

import authRoutes from "./routes/auth.routes.js";

import workspaceRoutes from "./routes/workspace.routes.js";

import invitationRoutes from "./routes/invitation.routes.js";

import projectRoutes from "./routes/project.routes.js";

import taskRoutes from "./routes/task.routes.js";

import notificationRoutes from "./routes/notification.routes.js";

import settingsRoutes from "./routes/settings.routes.js";

import activityRoutes from "./routes/activity.routes.js";

import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware.js";

const app =
  express();

/*
|--------------------------------------------------------------------------
| SECURITY
|--------------------------------------------------------------------------
*/

app.use(
  helmet()
);

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin:
      env.CLIENT_URL,

    credentials: true,
  })
);

/*
|--------------------------------------------------------------------------
| REQUEST PARSING
|--------------------------------------------------------------------------
*/

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(
  cookieParser()
);

/*
|--------------------------------------------------------------------------
| HEALTH
|--------------------------------------------------------------------------
*/

app.get(
  "/api/health",
  (
    _request,
    response
  ) => {
    response.json({
      success: true,

      message:
        "KiteDesk API is running",

      timestamp:
        new Date().toISOString(),
    });
  }
);

app.get(
  "/api/health/db",
  async (
    _request,
    response,
    next
  ) => {
    try {
      const result =
        await prisma.$queryRaw<
          Array<{
            database: string;
            now: Date;
          }>
        >`
          SELECT
            current_database() AS database,
            NOW() AS now
        `;

      response.json({
        success: true,

        message:
          "PostgreSQL connection is healthy",

        database:
          result[0]
            ?.database,

        databaseTime:
          result[0]?.now,
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
|--------------------------------------------------------------------------
| API ROOT
|--------------------------------------------------------------------------
*/

app.get(
  "/api",
  (
    _request,
    response
  ) => {
    response.json({
      name:
        "KiteDesk API",

      version:
        "1.0.0",

      status:
        "online",
    });
  }
);

/*
|--------------------------------------------------------------------------
| AUTHENTICATION
|--------------------------------------------------------------------------
*/

app.use(
  "/api/auth",
  authRoutes
);

/*
|--------------------------------------------------------------------------
| USER SETTINGS
|--------------------------------------------------------------------------
*/

app.use(
  "/api/settings",
  settingsRoutes
);

/*
|--------------------------------------------------------------------------
| NOTIFICATIONS
|--------------------------------------------------------------------------
*/

app.use(
  "/api/notifications",
  notificationRoutes
);

/*
|--------------------------------------------------------------------------
| WORKSPACE
|--------------------------------------------------------------------------
*/

app.use(
  "/api/workspaces",
  workspaceRoutes
);

app.use(
  "/api/invitations",
  invitationRoutes
);

/*
|--------------------------------------------------------------------------
| PROJECTS
|--------------------------------------------------------------------------
*/

app.use(
  "/api/workspaces/:workspaceId/projects",
  projectRoutes
);

/*
|--------------------------------------------------------------------------
| TASKS
|--------------------------------------------------------------------------
*/

app.use(
  "/api/workspaces/:workspaceId/projects/:projectId/tasks",
  taskRoutes
);

/*
|--------------------------------------------------------------------------
| ACTIVITY LOGS
|--------------------------------------------------------------------------
*/

app.use(
  "/api/workspaces",
  activityRoutes
);

/*
|--------------------------------------------------------------------------
| ERRORS
|--------------------------------------------------------------------------
*/

app.use(
  notFoundHandler
);

app.use(
  errorHandler
);

export default app;