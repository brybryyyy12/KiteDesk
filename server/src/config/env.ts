import "dotenv/config";

import {
  z,
} from "zod";

const envSchema =
  z.object({
    NODE_ENV: z
      .enum([
        "development",
        "test",
        "production",
      ])
      .default(
        "development"
      ),

    PORT: z.coerce
      .number()
      .int()
      .positive()
      .default(5000),

    CLIENT_URL: z
      .string()
      .url()
      .default(
        "http://localhost:5173"
      ),

    DATABASE_URL: z
      .string()
      .min(
        1,
        "DATABASE_URL is required."
      ),

    JWT_SECRET: z
      .string()
      .min(
        32,
        "JWT_SECRET must be at least 32 characters."
      ),

    JWT_EXPIRES_IN: z
      .string()
      .default("7d"),

    AUTH_COOKIE_NAME: z
      .string()
      .default(
        "kitedesk_token"
      ),

    /*
    |--------------------------------------------------------------------------
    | EMAIL / BREVO
    |--------------------------------------------------------------------------
    */

    BREVO_API_KEY: z
      .string()
      .min(
        1,
        "BREVO_API_KEY is required."
      ),

    BREVO_SENDER_EMAIL: z
      .string()
      .trim()
      .email(
        "BREVO_SENDER_EMAIL must be a valid email address."
      ),

    BREVO_SENDER_NAME: z
      .string()
      .trim()
      .min(
        1,
        "BREVO_SENDER_NAME is required."
      )
      .max(
        100,
        "BREVO_SENDER_NAME is too long."
      )
      .default(
        "KiteDesk"
      ),

    /*
    |--------------------------------------------------------------------------
    | CLOUDFLARE R2
    |--------------------------------------------------------------------------
    */

    R2_ACCOUNT_ID: z
      .string()
      .trim()
      .min(
        1,
        "R2_ACCOUNT_ID is required."
      ),

    R2_ACCESS_KEY_ID: z
      .string()
      .trim()
      .min(
        1,
        "R2_ACCESS_KEY_ID is required."
      ),

    R2_SECRET_ACCESS_KEY: z
      .string()
      .min(
        1,
        "R2_SECRET_ACCESS_KEY is required."
      ),

    R2_BUCKET_NAME: z
      .string()
      .trim()
      .min(
        3,
        "R2_BUCKET_NAME is required."
      ),
  });

const parsed =
  envSchema.safeParse(
    process.env
  );

if (
  !parsed.success
) {
  console.error(
    "❌ Invalid environment configuration:"
  );

  console.error(
    parsed.error.flatten()
      .fieldErrors
  );

  process.exit(1);
}

export const env =
  parsed.data;
