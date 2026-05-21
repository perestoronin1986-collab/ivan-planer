-- Offline/PWA sync support: updated_at (LWW marker) + deleted_at (soft delete)
-- Applied to tables synced to local IndexedDB: sphere, project, task, inbox_item.

ALTER TABLE "sphere"     ADD COLUMN "updated_at" timestamptz NOT NULL DEFAULT now();
--> statement-breakpoint
ALTER TABLE "sphere"     ADD COLUMN "deleted_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "project"    ADD COLUMN "updated_at" timestamptz NOT NULL DEFAULT now();
--> statement-breakpoint
ALTER TABLE "project"    ADD COLUMN "deleted_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "task"       ADD COLUMN "updated_at" timestamptz NOT NULL DEFAULT now();
--> statement-breakpoint
ALTER TABLE "task"       ADD COLUMN "deleted_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "inbox_item" ADD COLUMN "updated_at" timestamptz NOT NULL DEFAULT now();
--> statement-breakpoint
ALTER TABLE "inbox_item" ADD COLUMN "deleted_at" timestamptz;
--> statement-breakpoint

-- Indexes for incremental pull (`updated_at > last_sync_at`)
CREATE INDEX IF NOT EXISTS "sphere_updated_idx"     ON "sphere"     ("user_id", "updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_updated_idx"    ON "project"    ("user_id", "updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_updated_idx"       ON "task"       ("user_id", "updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbox_updated_idx"      ON "inbox_item" ("user_id", "updated_at");
--> statement-breakpoint

-- Auto-bump updated_at on every UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS sphere_set_updated_at     ON "sphere";
--> statement-breakpoint
CREATE TRIGGER sphere_set_updated_at     BEFORE UPDATE ON "sphere"     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

DROP TRIGGER IF EXISTS project_set_updated_at    ON "project";
--> statement-breakpoint
CREATE TRIGGER project_set_updated_at    BEFORE UPDATE ON "project"    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

DROP TRIGGER IF EXISTS task_set_updated_at       ON "task";
--> statement-breakpoint
CREATE TRIGGER task_set_updated_at       BEFORE UPDATE ON "task"       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

DROP TRIGGER IF EXISTS inbox_set_updated_at      ON "inbox_item";
--> statement-breakpoint
CREATE TRIGGER inbox_set_updated_at      BEFORE UPDATE ON "inbox_item" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
