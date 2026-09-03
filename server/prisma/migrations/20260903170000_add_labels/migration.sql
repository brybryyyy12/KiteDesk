CREATE TABLE "labels" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "color" VARCHAR(7) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "labels_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "task_labels" (
    "task_id" UUID NOT NULL,
    "label_id" UUID NOT NULL,
    CONSTRAINT "task_labels_pkey" PRIMARY KEY ("task_id", "label_id")
);

CREATE UNIQUE INDEX "labels_workspace_id_name_key" ON "labels"("workspace_id", "name");
CREATE INDEX "labels_workspace_id_idx" ON "labels"("workspace_id");
CREATE INDEX "task_labels_label_id_idx" ON "task_labels"("label_id");

ALTER TABLE "labels" ADD CONSTRAINT "labels_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_task_id_fkey"
FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_label_id_fkey"
FOREIGN KEY ("label_id") REFERENCES "labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
