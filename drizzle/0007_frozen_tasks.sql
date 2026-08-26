-- Frozen (deferred) tasks.
--
-- A task that is not relevant right now but must not be forgotten: it leaves
-- the "Просрочено"/"Активные" lists on /today and lives in the "Заморожено"
-- tab instead. It keeps its due_at, so nothing is lost if it is unfrozen.
-- Completing a frozen task works as usual (status -> done).

ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "frozen_at" timestamptz;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "task_frozen_idx"
  ON "task" ("user_id", "frozen_at")
  WHERE "frozen_at" IS NOT NULL;
--> statement-breakpoint

-- Sync RPC must carry the new column, otherwise an offline freeze is dropped
-- on conflict. Same reason `priority` is added here: it was introduced in
-- 0004 but never added to this DO UPDATE SET list, so priority edits to an
-- existing row were silently discarded by the LWW upsert.
CREATE OR REPLACE FUNCTION upsert_task_if_newer(payload jsonb)
RETURNS task
LANGUAGE plpgsql
AS $$
DECLARE
  result task;
  existing_updated_at timestamptz;
  incoming_updated_at timestamptz;
BEGIN
  incoming_updated_at := (payload->>'updated_at')::timestamptz;
  SELECT updated_at INTO existing_updated_at FROM task WHERE id = (payload->>'id')::uuid;

  IF existing_updated_at IS NOT NULL AND existing_updated_at > incoming_updated_at THEN
    SELECT * INTO result FROM task WHERE id = (payload->>'id')::uuid;
    RETURN result;
  END IF;

  INSERT INTO task
  SELECT * FROM jsonb_populate_record(NULL::task, payload)
  ON CONFLICT (id) DO UPDATE SET
    user_id        = EXCLUDED.user_id,
    sphere_id      = EXCLUDED.sphere_id,
    project_id     = EXCLUDED.project_id,
    parent_id      = EXCLUDED.parent_id,
    title          = EXCLUDED.title,
    description    = EXCLUDED.description,
    status         = EXCLUDED.status,
    due_at         = EXCLUDED.due_at,
    remind_at      = EXCLUDED.remind_at,
    rrule          = EXCLUDED.rrule,
    rrule_until    = EXCLUDED.rrule_until,
    "order"        = EXCLUDED."order",
    priority       = EXCLUDED.priority,
    carry_count    = EXCLUDED.carry_count,
    completed_at   = EXCLUDED.completed_at,
    overdue_action = EXCLUDED.overdue_action,
    frozen_at      = EXCLUDED.frozen_at,
    deleted_at     = EXCLUDED.deleted_at
  RETURNING * INTO result;
  RETURN result;
END;
$$;
