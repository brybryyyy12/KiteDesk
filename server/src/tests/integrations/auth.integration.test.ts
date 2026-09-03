import request from "supertest";

import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import app from "../../app.js";
import { prisma } from "../../config/prisma.js";
import { hashPassword } from "../../utils/password.js";
import { resetTestDatabase } from "../helpers/db.js";

describe("auth API", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it(
    "logs in a verified user and allows bearer-token access to /me",
    async () => {
      const password =
        "SecurePass123";

      const user =
        await prisma.user.create({
          data: {
            name: "Test User",
            email: "verified@example.com",
            passwordHash:
              await hashPassword(password),
            emailVerifiedAt:
              new Date(),
          },
        });

      const loginResponse =
        await request(app)
          .post("/api/auth/login")
          .send({
            email: user.email,
            password,
          })
          .expect(200);

      expect(loginResponse.body.success)
        .toBe(true);

      expect(loginResponse.body.data.user.id)
        .toBe(user.id);

      expect(
        loginResponse.body.data.user.passwordHash
      ).toBeUndefined();

      const token =
        loginResponse.body.data.token as string;

      expect(token)
        .toEqual(expect.any(String));

      const meResponse =
        await request(app)
          .get("/api/auth/me")
          .set(
            "Authorization",
            `Bearer ${token}`
          )
          .expect(200);

      expect(meResponse.body.data.user.id)
        .toBe(user.id);

      expect(meResponse.body.data.user.email)
        .toBe(user.email);
    }
  );

  it("rejects an incorrect password", async () => {
    await prisma.user.create({
      data: {
        name: "Test User",
        email: "verified@example.com",
        passwordHash:
          await hashPassword(
            "SecurePass123"
          ),
        emailVerifiedAt:
          new Date(),
      },
    });

    await request(app)
      .post("/api/auth/login")
      .send({
        email:
          "verified@example.com",
        password:
          "WrongPass123",
      })
      .expect(401);
  });

  it(
    "blocks login until email verification is complete",
    async () => {
      await prisma.user.create({
        data: {
          name:
            "Unverified User",
          email:
            "unverified@example.com",
          passwordHash:
            await hashPassword(
              "SecurePass123"
            ),
          emailVerifiedAt:
            null,
        },
      });

      await request(app)
        .post("/api/auth/login")
        .send({
          email:
            "unverified@example.com",
          password:
            "SecurePass123",
        })
        .expect(403);
    }
  );

  it("rejects /me without authentication", async () => {
    await request(app)
      .get("/api/auth/me")
      .expect(401);
  });
});
