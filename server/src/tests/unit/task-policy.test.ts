import {
  describe,
  expect,
  it,
} from "vitest";

import {
  canTransitionTask,
  type TaskWorkflowRole,
  type WorkflowTaskStatus,
} from "../../lib/task-policy.js";

type TransitionCase = {
  currentStatus: WorkflowTaskStatus;
  nextStatus: WorkflowTaskStatus;
};

const memberAllowedTransitions: TransitionCase[] = [
  { currentStatus: "TODO", nextStatus: "IN_PROGRESS" },
  { currentStatus: "IN_PROGRESS", nextStatus: "TODO" },
  { currentStatus: "IN_PROGRESS", nextStatus: "REVIEW" },
];

const reviewerAllowedTransitions: TransitionCase[] = [
  ...memberAllowedTransitions,
  { currentStatus: "REVIEW", nextStatus: "IN_PROGRESS" },
  { currentStatus: "REVIEW", nextStatus: "DONE" },
];

function canTransition(
  role: TaskWorkflowRole,
  isAssignee: boolean,
  transition: TransitionCase
) {
  return canTransitionTask({
    role,
    isAssignee,
    ...transition,
  });
}

describe("task workflow policy", () => {
  it.each(memberAllowedTransitions)(
    "allows an assigned member to move $currentStatus to $nextStatus",
    (transition) => {
      expect(canTransition("MEMBER", true, transition)).toBe(true);
    }
  );

  it.each(memberAllowedTransitions)(
    "blocks an unassigned member from moving $currentStatus to $nextStatus",
    (transition) => {
      expect(canTransition("MEMBER", false, transition)).toBe(false);
    }
  );

  it.each(["OWNER", "MANAGER"] as const)(
    "allows a %s to perform every review workflow transition",
    (role) => {
      for (const transition of reviewerAllowedTransitions) {
        expect(canTransition(role, false, transition)).toBe(true);
      }
    }
  );

  it.each(["OWNER", "MANAGER", "MEMBER"] as const)(
    "treats no-op transitions as safe for %s",
    (role) => {
      expect(
        canTransition(role, role === "MEMBER", {
          currentStatus: "REVIEW",
          nextStatus: "REVIEW",
        })
      ).toBe(true);
    }
  );

  it.each(["OWNER", "MANAGER", "MEMBER"] as const)(
    "keeps DONE terminal for %s",
    (role) => {
      expect(
        canTransition(role, true, {
          currentStatus: "DONE",
          nextStatus: "IN_PROGRESS",
        })
      ).toBe(false);
    }
  );

  it("does not let a member approve a task in review", () => {
    expect(
      canTransition("MEMBER", true, {
        currentStatus: "REVIEW",
        nextStatus: "DONE",
      })
    ).toBe(false);
  });
});
