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
    | EMAIL / SMTP
    |--------------------------------------------------------------------------
    */

    SMTP_HOST: z
      .string()
      .min(
        1,
        "SMTP_HOST is required."
      )
      .default(
        "smtp.gmail.com"
      ),

    SMTP_PORT: z.coerce
      .number()
      .int()
      .positive()
      .default(465),

    SMTP_SECURE: z
      .enum([
        "true",
        "false",
      ])
      .default("true")
      .transform(
        (value) =>
          value === "true"
      ),

    SMTP_USER: z
      .string()
      .email(
        "SMTP_USER must be a valid email address."
      ),

    SMTP_APP_PASSWORD: z
      .string()
      .min(
        1,
        "SMTP_APP_PASSWORD is required."
      ),

    EMAIL_FROM: z
      .string()
      .min(
        1,
        "EMAIL_FROM is required."
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