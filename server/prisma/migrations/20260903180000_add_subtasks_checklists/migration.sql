ALTER TABLE "tasks" ADD COLUMN "parent_task_id" UUID;

CREATE TABLE "checklist_items" (
  "id" UUID NOT NULL,
  "task_id" UUID NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "is_completed" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tasks_parent_task_id_idx" ON "tasks"("parent_task_id");
CREATE INDEX "checklist_items_task_id_idx" ON "checklist_items"("task_id");
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
