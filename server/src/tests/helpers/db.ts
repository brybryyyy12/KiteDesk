import {
  prisma,
} from "../../config/prisma.js";

/*
|--------------------------------------------------------------------------
| RESET TEST DATABASE
|--------------------------------------------------------------------------
|
| This truncates every application table in
| public while preserving Prisma's migration
| history.
|
*/

export async function resetTestDatabase() {
  if (
    !process.env.TEST_DATABASE_URL
  ) {
    throw new Error(
      [
        "Integration tests require TEST_DATABASE_URL.",
        "Create server/.env.test from .env.test.example,",
        "then run npm run test:integration.",
      ].join(" ")
    );
  }

  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE
      table_record RECORD;
    BEGIN
      FOR table_record IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename <> '_prisma_migrations'
      LOOP
        EXECUTE format(
          'TRUNCATE TABLE %I.%I RESTART IDENTITY CASCADE',
          'public',
          table_record.tablename
        );
      END LOOP;
    END
    $$;
  `);
}
