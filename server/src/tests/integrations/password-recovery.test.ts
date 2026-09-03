import {
  createHash,
  randomBytes,
} from "node:crypto";

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
import {
  comparePassword,
  hashPassword,
} from "../../utils/password.js";
import { resetTestDatabase } from "../helpers/db.js";

describe("password recovery API", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it(
    "resets a password with a valid single-use token",
    async () => {
      const oldPassword =
        "OldPassword123";

      const newPassword =
        "NewPassword123";

      const user =
        await prisma.user.create({
          data: {
            name:
              "Reset User",
            email:
              "reset@example.com",
            passwordHash:
              await hashPassword(
                oldPassword
              ),
            emailVerifiedAt:
              new Date(),
          },
        });

      const rawToken =
        randomBytes(32)
          .toString("hex");

      const tokenHash =
        createHash("sha256")
          .update(rawToken)
          .digest("hex");

      await prisma.passwordResetToken.create({
        data: {
          userId:
            user.id,
          tokenHash,
          expiresAt:
            new Date(
              Date.now() +
                60 * 60 * 1000
            ),
        },
      });

      await request(app)
        .post(
          "/api/auth/reset-password"
        )
        .send({
          token:
            rawToken,
          password:
            newPassword,
        })
        .expect(200);

      const updatedUser =
        await prisma.user
          .findUniqueOrThrow({
            where: {
              id:
                user.id,
            },
            select: {
              passwordHash:
                true,
            },
          });

      expect(
        await comparePassword(
          oldPassword,
          updatedUser.passwordHash
        )
      ).toBe(false);

      expect(
        await comparePassword(
          newPassword,
          updatedUser.passwordHash
        )
      ).toBe(true);

      const remainingToken =
        await prisma.passwordResetToken
          .findUnique({
            where: {
              tokenHash,
            },
          });

      expect(
        remainingToken
      ).toBeNull();

      await request(app)
        .post(
          "/api/auth/reset-password"
        )
        .send({
          token:
            rawToken,
          password:
            "AnotherPassword123",
        })
        .expect(400);
    }
  );

  it("rejects an expired reset token", async () => {
    const user =
      await prisma.user.create({
        data: {
          name:
            "Expired Reset User",
          email:
            "expired@example.com",
          passwordHash:
            await hashPassword(
              "OldPassword123"
            ),
          emailVerifiedAt:
            new Date(),
        },
      });

    const rawToken =
      randomBytes(32)
        .toString("hex");

    const tokenHash =
      createHash("sha256")
        .update(rawToken)
        .digest("hex");

    await prisma.passwordResetToken.create({
      data: {
        userId:
          user.id,
        tokenHash,
        expiresAt:
          new Date(
            Date.now() -
              60_000
          ),
      },
    });

    await request(app)
      .post(
        "/api/auth/reset-password"
      )
      .send({
        token:
          rawToken,
        password:
          "NewPassword123",
      })
      .expect(410);

    const remainingToken =
      await prisma.passwordResetToken
        .findUnique({
          where: {
            tokenHash,
          },
        });

    expect(
      remainingToken
    ).toBeNull();
  });
});
