-- Numeric habits: habit.type ('binary'|'numeric') + habit.unit, habit_log.value.
-- Numeric habits record a per-day value (e.g. weight). No daily target.
-- Apply manually via Supabase SQL Editor (direct TCP to Supabase is blocked).

-- habit_type enum (guarded — CREATE TYPE has no IF NOT EXISTS)
DO $$
BEGIN
  CREATE TYPE "public"."habit_type" AS ENUM('binary', 'numeric');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

ALTER TABLE "habit"     ADD COLUMN IF NOT EXISTS "type" "habit_type" DEFAULT 'binary' NOT NULL;
--> statement-breakpoint
ALTER TABLE "habit"     ADD COLUMN IF NOT EXISTS "unit" text;
--> statement-breakpoint
ALTER TABLE "habit_log" ADD COLUMN IF NOT EXISTS "value" real;
--> statement-breakpoint

-- Refresh LWW upsert RPCs so the new columns are written on conflict too.
-- (jsonb_populate_record already covers INSERT; the SET lists below cover
-- updates to existing rows — without these, server-side edits drop the
-- new columns. See 0003_lww_rpc / 0005_habits for the pattern.)
CREATE OR REPLACE FUNCTION upsert_habit_if_newer(payload jsonb)
RETURNS habit
LANGUAGE plpgsql
AS $$
DECLARE
  result habit;
  existing_updated_at timestamptz;
  incoming_updated_at timestamptz;
BEGIN
  incoming_updated_at := (payload->>'updated_at')::timestamptz;
  SELECT updated_at INTO existing_updated_at FROM habit WHERE id = (payload->>'id')::uuid;

  IF existing_updated_at IS NOT NULL AND existing_updated_at > incoming_updated_at THEN
    SELECT * INTO result FROM habit WHERE id = (payload->>'id')::uuid;
    RETURN result;
  END IF;

  INSERT INTO habit
  SELECT * FROM jsonb_populate_record(NULL::habit, payload)
  ON CONFLICT (id) DO UPDATE SET
    user_id         = EXCLUDED.user_id,
    name            = EXCLUDED.name,
    icon            = EXCLUDED.icon,
    color           = EXCLUDED.color,
    kind            = EXCLUDED.kind,
    frequency       = EXCLUDED.frequency,
    type            = EXCLUDED.type,
    unit            = EXCLUDED.unit,
    target_per_week = EXCLUDED.target_per_week,
    "order"         = EXCLUDED."order",
    archived        = EXCLUDED.archived,
    deleted_at      = EXCLUDED.deleted_at
  RETURNING * INTO result;
  RETURN result;
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION upsert_habit_log_if_newer(payload jsonb)
RETURNS habit_log
LANGUAGE plpgsql
AS $$
DECLARE
  result habit_log;
  existing_updated_at timestamptz;
  incoming_updated_at timestamptz;
BEGIN
  incoming_updated_at := (payload->>'updated_at')::timestamptz;
  SELECT updated_at INTO existing_updated_at FROM habit_log WHERE id = (payload->>'id')::uuid;

  IF existing_updated_at IS NOT NULL AND existing_updated_at > incoming_updated_at THEN
    SELECT * INTO result FROM habit_log WHERE id = (payload->>'id')::uuid;
    RETURN result;
  END IF;

  INSERT INTO habit_log
  SELECT * FROM jsonb_populate_record(NULL::habit_log, payload)
  ON CONFLICT (id) DO UPDATE SET
    user_id    = EXCLUDED.user_id,
    habit_id   = EXCLUDED.habit_id,
    date       = EXCLUDED.date,
    value      = EXCLUDED.value,
    deleted_at = EXCLUDED.deleted_at
  RETURNING * INTO result;
  RETURN result;
END;
$$;
--> statement-breakpoint

GRANT EXECUTE ON FUNCTION upsert_habit_if_newer(jsonb)     TO authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION upsert_habit_log_if_newer(jsonb) TO authenticated;
