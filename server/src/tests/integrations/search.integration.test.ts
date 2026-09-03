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
import { createAuthToken } from "../../utils/jwt.js";
import { hashPassword } from "../../utils/password.js";
import { resetTestDatabase } from "../helpers/db.js";

describe("workspace global search API", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns only accessible projects and tasks from the requested workspace", async () => {
    const user = await prisma.user.create({
      data: {
        name: "Search Member",
        email: "search@example.com",
        passwordHash: await hashPassword("SecurePass123"),
        emailVerifiedAt: new Date(),
      },
    });

    const workspace = await prisma.workspace.create({
      data: {
        name: "Current Workspace",
        slug: "current-workspace",
        createdById: user.id,
      },
    });

    const otherWorkspace = await prisma.workspace.create({
      data: {
        name: "Other Workspace",
        slug: "other-workspace",
        createdById: user.id,
      },
    });

    await prisma.workspaceMembership.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: "MEMBER",
      },
    });

    const accessibleProject = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: "Needle Project",
        description: "Visible result",
        createdById: user.id,
        members: {
          create: {
            userId: user.id,
            addedById: user.id,
          },
        },
      },
    });

    const inaccessibleProject = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: "Hidden Needle Project",
        createdById: user.id,
      },
    });

    const otherWorkspaceProject = await prisma.project.create({
      data: {
        workspaceId: otherWorkspace.id,
        name: "Outside Needle Project",
        createdById: user.id,
      },
    });

    await prisma.task.createMany({
      data: [
        {
          projectId: accessibleProject.id,
          title: "Needle Task",
          createdById: user.id,
        },
        {
          projectId: inaccessibleProject.id,
          title: "Hidden Needle Task",
          createdById: user.id,
        },
        {
          projectId: otherWorkspaceProject.id,
          title: "Outside Needle Task",
          createdById: user.id,
        },
      ],
    });

    const response = await request(app)
      .get(`/api/workspaces/${workspace.id}/search?q=needle`)
      .set("Authorization", `Bearer ${createAuthToken({ userId: user.id })}`)
      .expect(200);

    expect(response.body.data.projects).toHaveLength(1);
    expect(response.body.data.projects[0].id).toBe(accessibleProject.id);
    expect(response.body.data.tasks).toHaveLength(1);
    expect(response.body.data.tasks[0].title).toBe("Needle Task");
  });

  it("rejects a search query shorter than two characters", async () => {
    const user = await prisma.user.create({
      data: {
        name: "Search Owner",
        email: "owner-search@example.com",
        passwordHash: await hashPassword("SecurePass123"),
        emailVerifiedAt: new Date(),
      },
    });

    const workspace = await prisma.workspace.create({
      data: {
        name: "Search Workspace",
        slug: "search-workspace",
        createdById: user.id,
        memberships: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
      },
    });

    await request(app)
      .get(`/api/workspaces/${workspace.id}/search?q=a`)
      .set("Authorization", `Bearer ${createAuthToken({ userId: user.id })}`)
      .expect(400);
  });
});
