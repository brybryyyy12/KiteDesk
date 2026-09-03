import {
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
import { hashPassword } from "../../utils/password.js";
import { resetTestDatabase } from "../helpers/db.js";

describe("workspace invitation API", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it(
    "previews publicly, accepts once, and blocks rejoin after removal",
    async () => {
      const password =
        "SecurePass123";

      const owner =
        await prisma.user.create({
          data: {
            name:
              "Workspace Owner",
            email:
              "owner@example.com",
            passwordHash:
              await hashPassword(
                password
              ),
            emailVerifiedAt:
              new Date(),
          },
        });

      const invitedUser =
        await prisma.user.create({
          data: {
            name:
              "Invited User",
            email:
              "invited@example.com",
            passwordHash:
              await hashPassword(
                password
              ),
            emailVerifiedAt:
              new Date(),
          },
        });

      const workspace =
        await prisma.workspace.create({
          data: {
            name:
              "Test Workspace",
            slug:
              "test-workspace",
            description:
              "Integration-test workspace",
            createdById:
              owner.id,
          },
        });

      await prisma.workspaceMembership.create({
        data: {
          workspaceId:
            workspace.id,
          userId:
            owner.id,
          role:
            "OWNER",
        },
      });

      const token =
        randomBytes(32)
          .toString("hex");

      const invitation =
        await prisma.invitation.create({
          data: {
            workspaceId:
              workspace.id,
            email:
              invitedUser.email,
            role:
              "MEMBER",
            token,
            status:
              "PENDING",
            invitedById:
              owner.id,
            expiresAt:
              new Date(
                Date.now() +
                  24 *
                    60 *
                    60 *
                    1000
              ),
          },
        });

      const previewResponse =
        await request(app)
          .get(
            `/api/invitations/${token}`
          )
          .expect(200);

      expect(
        previewResponse.body.data
          .invitation.workspace.id
      ).toBe(
        workspace.id
      );

      expect(
        previewResponse.body.data
          .invitation.status
      ).toBe(
        "PENDING"
      );

      const loginResponse =
        await request(app)
          .post("/api/auth/login")
          .send({
            email:
              invitedUser.email,
            password,
          })
          .expect(200);

      const authToken =
        loginResponse.body.data
          .token as string;

      await request(app)
        .post(
          `/api/invitations/${token}/accept`
        )
        .set(
          "Authorization",
          `Bearer ${authToken}`
        )
        .expect(200);

      const membership =
        await prisma.workspaceMembership
          .findUnique({
            where: {
              workspaceId_userId: {
                workspaceId:
                  workspace.id,
                userId:
                  invitedUser.id,
              },
            },
          });

      expect(
        membership
      ).not.toBeNull();

      const acceptedInvitation =
        await prisma.invitation
          .findUniqueOrThrow({
            where: {
              id:
                invitation.id,
            },
            select: {
              status:
                true,
              acceptedAt:
                true,
            },
          });

      expect(
        acceptedInvitation.status
      ).toBe(
        "ACCEPTED"
      );

      expect(
        acceptedInvitation.acceptedAt
      ).not.toBeNull();

      await request(app)
        .post(
          `/api/invitations/${token}/accept`
        )
        .set(
          "Authorization",
          `Bearer ${authToken}`
        )
        .expect(200);

      await prisma.workspaceMembership.delete({
        where: {
          workspaceId_userId: {
            workspaceId:
              workspace.id,
            userId:
              invitedUser.id,
          },
        },
      });

      await request(app)
        .post(
          `/api/invitations/${token}/accept`
        )
        .set(
          "Authorization",
          `Bearer ${authToken}`
        )
        .expect(409);

      const rejoined =
        await prisma.workspaceMembership
          .findUnique({
            where: {
              workspaceId_userId: {
                workspaceId:
                  workspace.id,
                userId:
                  invitedUser.id,
              },
            },
          });

      expect(
        rejoined
      ).toBeNull();
    }
  );

  it(
    "does not allow the wrong authenticated email to accept",
    async () => {
      const password =
        "SecurePass123";

      const owner =
        await prisma.user.create({
          data: {
            name:
              "Workspace Owner",
            email:
              "owner@example.com",
            passwordHash:
              await hashPassword(
                password
              ),
            emailVerifiedAt:
              new Date(),
          },
        });

      const correctUser =
        await prisma.user.create({
          data: {
            name:
              "Correct User",
            email:
              "correct@example.com",
            passwordHash:
              await hashPassword(
                password
              ),
            emailVerifiedAt:
              new Date(),
          },
        });

      const wrongUser =
        await prisma.user.create({
          data: {
            name:
              "Wrong User",
            email:
              "wrong@example.com",
            passwordHash:
              await hashPassword(
                password
              ),
            emailVerifiedAt:
              new Date(),
          },
        });

      const workspace =
        await prisma.workspace.create({
          data: {
            name:
              "Email Match Workspace",
            slug:
              "email-match-workspace",
            createdById:
              owner.id,
          },
        });

      await prisma.workspaceMembership.create({
        data: {
          workspaceId:
            workspace.id,
          userId:
            owner.id,
          role:
            "OWNER",
        },
      });

      const token =
        randomBytes(32)
          .toString("hex");

      await prisma.invitation.create({
        data: {
          workspaceId:
            workspace.id,
          email:
            correctUser.email,
          role:
            "MEMBER",
          token,
          status:
            "PENDING",
          invitedById:
            owner.id,
          expiresAt:
            new Date(
              Date.now() +
                24 *
                  60 *
                  60 *
                  1000
            ),
        },
      });

      const loginResponse =
        await request(app)
          .post("/api/auth/login")
          .send({
            email:
              wrongUser.email,
            password,
          })
          .expect(200);

      await request(app)
        .post(
          `/api/invitations/${token}/accept`
        )
        .set(
          "Authorization",
          `Bearer ${loginResponse.body.data.token}`
        )
        .expect(404);

      const wrongMembership =
        await prisma.workspaceMembership
          .findUnique({
            where: {
              workspaceId_userId: {
                workspaceId:
                  workspace.id,
                userId:
                  wrongUser.id,
              },
            },
          });

      expect(
        wrongMembership
      ).toBeNull();
    }
  );
});
