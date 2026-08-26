import {
  prisma,
} from "../config/prisma.js";

type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_REASSIGNED"
  | "TASK_REVIEW"
  | "TASK_APPROVED"
  | "CHANGES_REQUESTED"
  | "COMMENT"
  | "DUE_SOON"
  | "OVERDUE"
  | "PROJECT_ADDED"
  | "PROJECT_REMOVED";

type CreateNotificationInput = {
  workspaceId: string;

  userId: string;

  type: NotificationType;

  title: string;

  message: string;

  projectId?: string | null;

  taskId?: string | null;

  actorId?: string | null;

  dedupeKey?: string | null;
};

export async function createNotification(
  input: CreateNotificationInput
) {
  /*
   * Don't notify somebody about
   * their own action.
   */
  if (
    input.actorId &&
    input.actorId ===
      input.userId
  ) {
    return null;
  }

  const preferences =
    await prisma.notificationPreference.findUnique({
      where: {
        userId:
          input.userId,
      },
    });

  /*
   * Older accounts may not have a
   * preference row.
   *
   * Default to notifications enabled.
   */
  if (
    preferences &&
    !isNotificationEnabled(
      preferences,
      input.type
    )
  ) {
    return null;
  }

  /*
   * Optional dedupe support is useful
   * later for DUE_SOON / OVERDUE.
   */
  if (input.dedupeKey) {
    const existing =
      await prisma.notification.findUnique({
        where: {
          dedupeKey:
            input.dedupeKey,
        },

        select: {
          id: true,
        },
      });

    if (existing) {
      return existing;
    }
  }

  return prisma.notification.create({
    data: {
      workspaceId:
        input.workspaceId,

      userId:
        input.userId,

      type:
        input.type,

      title:
        input.title,

      message:
        input.message,

      projectId:
        input.projectId ??
        null,

      taskId:
        input.taskId ??
        null,

      actorId:
        input.actorId ??
        null,

      dedupeKey:
        input.dedupeKey ??
        null,
    },
  });
}

function isNotificationEnabled(
  preferences: {
    taskAssignments: boolean;
    reviewActivity: boolean;
    comments: boolean;
    deadlines: boolean;
    projectMembership: boolean;
  },

  type: NotificationType
) {
  switch (type) {
    case "TASK_ASSIGNED":
    case "TASK_REASSIGNED":
      return preferences
        .taskAssignments;

    case "TASK_REVIEW":
    case "TASK_APPROVED":
    case "CHANGES_REQUESTED":
      return preferences
        .reviewActivity;

    case "COMMENT":
      return preferences
        .comments;

    case "DUE_SOON":
    case "OVERDUE":
      return preferences
        .deadlines;

    case "PROJECT_ADDED":
    case "PROJECT_REMOVED":
      return preferences
        .projectMembership;

    default:
      return true;
  }
}