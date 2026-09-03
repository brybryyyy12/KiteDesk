import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";

const titleSchema = z.object({ title: z.string().trim().min(1).max(200) });
const itemParamsSchema = z.object({ checklistItemId: z.string().uuid("Invalid checklist item ID.") });
const toggleSchema = z.object({ isCompleted: z.boolean() });

function requireContext(request: Request) {
  if (!request.task || !request.user) throw new AppError("Task context is missing.", 500);
  return { task: request.task, user: request.user };
}

function requireChecklistManagement(request: Request) {
  const { task, user } = requireContext(request);
  const membership = request.workspaceMembership;

  if (!membership) throw new AppError("Workspace membership is required.", 403, "WORKSPACE_ACCESS_REQUIRED");

  const canManage =
    membership.role === "OWNER" ||
    membership.role === "MANAGER" ||
    task.assigneeId === user.id ||
    task.parentTaskId !== null;

  if (!canManage) {
    throw new AppError(
      "Only workspace managers or the task assignee can manage this checklist.",
      403,
      "CHECKLIST_ACCESS_DENIED"
    );
  }

  return { task, user };
}

export async function createSubtask(request: Request, response: Response) {
  const { task, user } = requireContext(request);
  const data = titleSchema.parse(request.body);
  if (task.parentTaskId) throw new AppError("Nested subtasks are not supported.", 400, "NESTED_SUBTASK");

  const subtask = await prisma.task.create({
    data: {
      projectId: task.projectId,
      parentTaskId: task.id,
      title: data.title,
      createdById: user.id,
      assigneeId: task.assigneeId,
    },
    select: { id: true, projectId: true, title: true, status: true, priority: true, dueDate: true },
  });
  response.status(201).json({ success: true, data: { subtask } });
}

export async function createChecklistItem(request: Request, response: Response) {
  const { task } = requireChecklistManagement(request);
  const data = titleSchema.parse(request.body);
  const item = await prisma.checklistItem.create({ data: { taskId: task.id, title: data.title } });
  response.status(201).json({ success: true, data: { item } });
}

export async function updateChecklistItem(request: Request, response: Response) {
  const { task } = requireContext(request);
  const { checklistItemId } = itemParamsSchema.parse(request.params);
  const data = toggleSchema.parse(request.body);
  const exists = await prisma.checklistItem.findFirst({ where: { id: checklistItemId, taskId: task.id }, select: { id: true } });
  if (!exists) throw new AppError("Checklist item not found.", 404, "CHECKLIST_ITEM_NOT_FOUND");
  const item = await prisma.checklistItem.update({ where: { id: checklistItemId }, data });
  response.json({ success: true, data: { item } });
}

export async function deleteChecklistItem(request: Request, response: Response) {
  const { task } = requireChecklistManagement(request);
  const { checklistItemId } = itemParamsSchema.parse(request.params);
  const result = await prisma.checklistItem.deleteMany({ where: { id: checklistItemId, taskId: task.id } });
  if (!result.count) throw new AppError("Checklist item not found.", 404, "CHECKLIST_ITEM_NOT_FOUND");
  response.json({ success: true, message: "Checklist item deleted." });
}
