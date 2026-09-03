import {
  randomUUID,
} from "node:crypto";

import bcrypt from "bcryptjs";
import pg from "pg";

import {
  testDatabaseUrl,
} from "./e2e-env.mjs";

const { Client } = pg;
const client = new Client({ connectionString: testDatabaseUrl });

await client.connect();

try {
  await client.query(`
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

  const passwordHash = await bcrypt.hash("SecurePass123", 12);

  await client.query(
    `
      INSERT INTO users (
        id,
        name,
        email,
        password_hash,
        email_verified_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())
    `,
    [
      randomUUID(),
      "E2E User",
      "e2e@example.com",
      passwordHash,
    ]
  );

  console.log("Seeded E2E user: e2e@example.com");
} finally {
  await client.end();
}
