declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        jobTitle: string | null;
        createdAt: Date;
        updatedAt: Date;
      };

      workspace?: {
        id: string;
        name: string;
        slug: string;
        description: string | null;
        createdById: string;
        createdAt: Date;
        updatedAt: Date;
      };

      workspaceMembership?: {
        id: string;
        workspaceId: string;
        userId: string;

        role:
          | "OWNER"
          | "MANAGER"
          | "MEMBER";

        joinedAt: Date;
      };

      project?: {
        id: string;
        workspaceId: string;
        name: string;
        description: string | null;

        status:
          | "PLANNING"
          | "IN_PROGRESS"
          | "ON_HOLD"
          | "COMPLETED";

        deadline: Date | null;

        createdById: string;

        createdAt: Date;
        updatedAt: Date;
      };

      projectMembership?: {
        id: string;
        projectId: string;
        userId: string;
        addedById: string | null;
        addedAt: Date;
      } | null;

      task?: {
        id: string;
        projectId: string;

        title: string;

        description:
          | string
          | null;

        type:
          | "TASK"
          | "FEATURE"
          | "BUG";

        priority:
          | "LOW"
          | "MEDIUM"
          | "HIGH"
          | "URGENT";

        status:
          | "TODO"
          | "IN_PROGRESS"
          | "REVIEW"
          | "DONE";

        assigneeId:
          | string
          | null;

        createdById:
          string;

        dueDate:
          | Date
          | null;

        createdAt: Date;
        updatedAt: Date;
      };
    }
  }
}

export {};