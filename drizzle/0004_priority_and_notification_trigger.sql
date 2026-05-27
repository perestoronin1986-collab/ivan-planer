-- 1) Priority column on task (1=urgent..4=none, default 4)
ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "priority" integer NOT NULL DEFAULT 4;
--> statement-breakpoint

-- Constraint: priority in 1..4
ALTER TABLE "task" DROP CONSTRAINT IF EXISTS "task_priority_chk";
--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_priority_chk" CHECK ("priority" BETWEEN 1 AND 4);
--> statement-breakpoint

-- Index for sorting Today/Tasks
CREATE INDEX IF NOT EXISTS "task_priority_idx" ON "task" ("user_id", "priority", "due_at");
--> statement-breakpoint

-- 2) sync_task_notification trigger
-- Mirror task.remind_at -> notification(fire_at). Keep one notification row per task.
-- On INSERT/UPDATE: if remind_at set AND status != 'done' AND deleted_at IS NULL -> upsert.
-- On UPDATE: if remind_at changed -> reset sent_at.
-- On UPDATE to done/delete OR remind_at cleared -> delete notification row.
-- On DELETE: cascade handles it (FK).

CREATE OR REPLACE FUNCTION sync_task_notification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Should this task have an active notification?
  IF NEW.remind_at IS NOT NULL
     AND NEW.status <> 'done'
     AND NEW.deleted_at IS NULL
  THEN
    -- Upsert by task_id (delete + insert keeps it simple, one row per task)
    IF TG_OP = 'UPDATE'
       AND OLD.remind_at IS NOT DISTINCT FROM NEW.remind_at
       AND OLD.status = NEW.status
       AND OLD.deleted_at IS NOT DISTINCT FROM NEW.deleted_at
    THEN
      -- No relevant change, do nothing
      RETURN NEW;
    END IF;

    DELETE FROM "notification" WHERE task_id = NEW.id;
    INSERT INTO "notification" (user_id, task_id, fire_at)
    VALUES (NEW.user_id, NEW.id, NEW.remind_at);
  ELSE
    -- Remove pending notification if conditions no longer met
    DELETE FROM "notification" WHERE task_id = NEW.id AND sent_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS task_sync_notification ON "task";
--> statement-breakpoint
CREATE TRIGGER task_sync_notification
AFTER INSERT OR UPDATE ON "task"
FOR EACH ROW EXECUTE FUNCTION sync_task_notification();
--> statement-breakpoint

-- RLS on notification + push_subscription (just in case missing)
ALTER TABLE "notification" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "push_subscription" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

DROP POLICY IF EXISTS "notification_owner" ON "notification";
--> statement-breakpoint
CREATE POLICY "notification_owner" ON "notification"
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
--> statement-breakpoint

DROP POLICY IF EXISTS "push_subscription_owner" ON "push_subscription";
--> statement-breakpoint
CREATE POLICY "push_subscription_owner" ON "push_subscription"
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
