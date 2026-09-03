import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";

const labelSchema = z.object({
  name: z.string().trim().min(1).max(40),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a six-digit hex value."),
});

export async function getLabels(request: Request, response: Response) {
  if (!request.workspace) throw new AppError("Workspace context is missing.", 500);

  const labels = await prisma.label.findMany({
    where: { workspaceId: request.workspace.id },
    select: { id: true, name: true, color: true },
    orderBy: { name: "asc" },
  });

  response.json({ success: true, data: { labels } });
}

export async function createLabel(request: Request, response: Response) {
  if (!request.workspace) throw new AppError("Workspace context is missing.", 500);
  const data = labelSchema.parse(request.body);

  const existing = await prisma.label.findFirst({
    where: { workspaceId: request.workspace.id, name: { equals: data.name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) throw new AppError("A label with this name already exists.", 409, "LABEL_EXISTS");

  const label = await prisma.label.create({
    data: { workspaceId: request.workspace.id, name: data.name, color: data.color.toUpperCase() },
    select: { id: true, name: true, color: true },
  });
  response.status(201).json({ success: true, message: "Label created.", data: { label } });
}

export async function deleteLabel(request: Request, response: Response) {
  if (!request.workspace) throw new AppError("Workspace context is missing.", 500);
  const labelId = z.string().uuid("Invalid label ID.").parse(request.params.labelId);
  const result = await prisma.label.deleteMany({ where: { id: labelId, workspaceId: request.workspace.id } });
  if (!result.count) throw new AppError("Label not found.", 404, "LABEL_NOT_FOUND");
  response.json({ success: true, message: "Label deleted." });
}
