ALTER TABLE "projects" ADD COLUMN "archived_at" TIMESTAMP(3), ADD COLUMN "archived_by_id" UUID;
CREATE INDEX "projects_workspace_id_archived_at_idx" ON "projects"("workspace_id", "archived_at");
CREATE INDEX "projects_archived_by_id_idx" ON "projects"("archived_by_id");
ALTER TABLE "projects" ADD CONSTRAINT "projects_archived_by_id_fkey" FOREIGN KEY ("archived_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
