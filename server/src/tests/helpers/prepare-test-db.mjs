import {
  spawnSync,
} from "node:child_process";

import {
  config,
} from "dotenv";

config({
  path: ".env.test",
  override: true,
});

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  console.error(
    "TEST_DATABASE_URL is missing. Create server/.env.test first."
  );
  process.exit(1);
}

let databaseName = "";

try {
  const parsed = new URL(testDatabaseUrl);

  databaseName = decodeURIComponent(
    parsed.pathname.replace(/^\//, "").split("/")[0] ?? ""
  );
} catch {
  console.error(
    "TEST_DATABASE_URL is not a valid PostgreSQL URL."
  );
  process.exit(1);
}

if (!databaseName.toLowerCase().includes("test")) {
  console.error(
    `Refusing to migrate database "${databaseName}". The test database name must contain "test".`
  );
  process.exit(1);
}

console.log(`Preparing test database: ${databaseName}`);

const result = spawnSync(
  process.execPath,
  [
    "node_modules/prisma/build/index.js",
    "migrate",
    "deploy",
  ],
  {
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      NODE_ENV: "test",
      DATABASE_URL: testDatabaseUrl,
    },
  }
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
