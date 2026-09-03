import {
  config,
} from "dotenv";

config({
  path: ".env.test",
  override: true,
  quiet: true,
});

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL is missing. Create server/.env.test first."
  );
}

const databaseName = decodeURIComponent(
  new URL(testDatabaseUrl).pathname.replace(/^\//, "").split("/")[0] ?? ""
);

if (!databaseName.toLowerCase().includes("test")) {
  throw new Error(
    `Refusing to use database "${databaseName}" for E2E tests. Its name must contain "test".`
  );
}

Object.assign(process.env, {
  NODE_ENV: "test",
  PORT: "5000",
  CLIENT_URL: "http://127.0.0.1:4173",
  DATABASE_URL: testDatabaseUrl,
  JWT_SECRET: "kitedesk-e2e-jwt-secret-do-not-use-outside-tests-2026",
  JWT_EXPIRES_IN: "1h",
  AUTH_COOKIE_NAME: "kitedesk_e2e_token",
  BREVO_API_KEY: "test-brevo-api-key",
  BREVO_SENDER_EMAIL: "test@example.com",
  BREVO_SENDER_NAME: "KiteDesk E2E",
  R2_ACCOUNT_ID: "test-r2-account",
  R2_ACCESS_KEY_ID: "test-r2-access-key",
  R2_SECRET_ACCESS_KEY: "test-r2-secret-key",
  R2_BUCKET_NAME: "kitedesk-test-bucket",
});

export {
  databaseName,
  testDatabaseUrl,
};
