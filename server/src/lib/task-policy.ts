export type TaskWorkflowRole =
  | "OWNER"
  | "MANAGER"
  | "MEMBER";

export type WorkflowTaskStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "REVIEW"
  | "DONE";

type CanTransitionTaskOptions = {
  role: TaskWorkflowRole;

  isAssignee: boolean;

  currentStatus:
    WorkflowTaskStatus;

  nextStatus:
    WorkflowTaskStatus;
};

export function canTransitionTask({
  role,
  isAssignee,
  currentStatus,
  nextStatus,
}: CanTransitionTaskOptions) {
  /*
   * No-op is allowed.
   */
  if (
    currentStatus ===
    nextStatus
  ) {
    return true;
  }

  /*
   * DONE is terminal for V1.
   */
  if (
    currentStatus ===
    "DONE"
  ) {
    return false;
  }

  /*
   * MEMBER
   *
   * Members can only work on their
   * own assigned tasks.
   */
  if (role === "MEMBER") {
    if (!isAssignee) {
      return false;
    }

    if (
      currentStatus ===
        "TODO" &&
      nextStatus ===
        "IN_PROGRESS"
    ) {
      return true;
    }

    if (
      currentStatus ===
        "IN_PROGRESS" &&
      (
        nextStatus ===
          "TODO" ||
        nextStatus ===
          "REVIEW"
      )
    ) {
      return true;
    }

    return false;
  }

  /*
   * OWNER / MANAGER
   */
  if (
    currentStatus ===
      "TODO"
  ) {
    return (
      nextStatus ===
      "IN_PROGRESS"
    );
  }

  if (
    currentStatus ===
      "IN_PROGRESS"
  ) {
    return (
      nextStatus ===
        "TODO" ||
      nextStatus ===
        "REVIEW"
    );
  }

  if (
    currentStatus ===
      "REVIEW"
  ) {
    return (
      nextStatus ===
        "IN_PROGRESS" ||
      nextStatus ===
        "DONE"
    );
  }

  return false;
}