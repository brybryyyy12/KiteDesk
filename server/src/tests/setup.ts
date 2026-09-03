import {
  config,
} from "dotenv";

/*
|--------------------------------------------------------------------------
| LOAD TEST ENVIRONMENT
|--------------------------------------------------------------------------
|
| .env.test is intentionally separate from
| the normal KiteDesk .env file.
|
| Unit tests do not need PostgreSQL, so this
| file can still load without .env.test.
|
| Integration-test commands run
| test:db:prepare first, which requires a
| dedicated TEST_DATABASE_URL.
|
*/

config({
  path:
    ".env.test",

  override:
    true,
});

const configuredTestDatabaseUrl =
  process.env.TEST_DATABASE_URL;

function assertSafeTestDatabase(
  databaseUrl: string
) {
  let parsed:
    URL;

  try {
    parsed =
      new URL(
        databaseUrl
      );
  } catch {
    throw new Error(
      "TEST_DATABASE_URL is not a valid PostgreSQL URL."
    );
  }

  const databaseName =
    decodeURIComponent(
      parsed.pathname
        .replace(
          /^\//,
          ""
        )
        .split("/")[0] ??
        ""
    );

  if (
    !databaseName
      .toLowerCase()
      .includes(
        "test"
      )
  ) {
    throw new Error(
      [
        "Refusing to use this database for automated tests.",
        `Database "${databaseName || "(unknown)"}" does not contain "test" in its name.`,
        "Use a dedicated database such as kitedesk_test.",
      ].join(" ")
    );
  }
}

if (
  configuredTestDatabaseUrl
) {
  assertSafeTestDatabase(
    configuredTestDatabaseUrl
  );
}

/*
|--------------------------------------------------------------------------
| FORCE SAFE TEST VALUES
|--------------------------------------------------------------------------
|
| env.ts validates production integrations
| when app.ts is imported.
|
| Tests never receive real Brevo/R2 secrets.
| Email is mocked in integration tests.
|
*/

process.env.NODE_ENV =
  "test";

process.env.DATABASE_URL =
  configuredTestDatabaseUrl ??
  "postgresql://test:test@127.0.0.1:5432/kitedesk_test";

process.env.CLIENT_URL =
  "http://localhost:5173";

process.env.JWT_SECRET =
  "kitedesk-test-jwt-secret-do-not-use-outside-tests-2026";

process.env.JWT_EXPIRES_IN =
  "1h";

process.env.AUTH_COOKIE_NAME =
  "kitedesk_test_token";

process.env.BREVO_API_KEY =
  "test-brevo-api-key";

process.env.BREVO_SENDER_EMAIL =
  "test@example.com";

process.env.BREVO_SENDER_NAME =
  "KiteDesk Test";

process.env.R2_ACCOUNT_ID =
  "test-r2-account";

process.env.R2_ACCESS_KEY_ID =
  "test-r2-access-key";

process.env.R2_SECRET_ACCESS_KEY =
  "test-r2-secret-key";

process.env.R2_BUCKET_NAME =
  "kitedesk-test-bucket";
