import "dotenv/config";

import app from "./app.js";

import {
  prisma,
} from "./config/prisma.js";

import {
  env,
} from "./config/env.js";

const server =
  app.listen(
    env.PORT,
    "0.0.0.0",
    () => {
      console.log(
        "================================="
      );

      console.log(
        "🚀 KiteDesk API"
      );

      console.log(
        `🌐 http://localhost:${env.PORT}`
      );

      console.log(
        `❤️  http://localhost:${env.PORT}/api/health`
      );

      console.log(
        `🗄️  http://localhost:${env.PORT}/api/health/db`
      );

      console.log(
        `🔐 http://localhost:${env.PORT}/api/auth`
      );

      console.log(
        `🧪 Environment: ${env.NODE_ENV}`
      );

      console.log(
        "================================="
      );
    }
  );

let shuttingDown =
  false;

async function shutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown =
    true;

  console.log(
    "\nShutting down KiteDesk API..."
  );

  server.close(
    async () => {
      try {
        await prisma.$disconnect();

        console.log(
          "Database disconnected."
        );

        console.log(
          "Server stopped."
        );

        process.exit(0);
      } catch (error) {
        console.error(
          "Shutdown error:",
          error
        );

        process.exit(1);
      }
    }
  );
}

process.on(
  "SIGINT",
  shutdown
);

process.on(
  "SIGTERM",
  shutdown
);