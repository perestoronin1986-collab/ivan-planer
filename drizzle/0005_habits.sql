-- Habits feature: habit definitions + per-day completion logs.
-- Two new synced tables (Dexie mirror, LWW by updated_at, soft delete).

CREATE TYPE "public"."habit_kind" AS ENUM('build', 'quit');
--> statement-breakpoint
CREATE TYPE "public"."habit_frequency" AS ENUM('daily', 'weekly');
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "habit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"kind" "habit_kind" DEFAULT 'build' NOT NULL,
	"frequency" "habit_frequency" DEFAULT 'daily' NOT NULL,
	"target_per_week" integer DEFAULT 7 NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	"deleted_at" timestamptz,
	CONSTRAINT "habit_target_chk" CHECK ("target_per_week" BETWEEN 1 AND 7)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "habit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"habit_id" uuid NOT NULL,
	"date" text NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	"deleted_at" timestamptz
);
--> statement-breakpoint

ALTER TABLE "habit_log" ADD CONSTRAINT "habit_log_habit_id_habit_id_fk"
	FOREIGN KEY ("habit_id") REFERENCES "public"."habit"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "habit_user_idx"        ON "habit"     ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "habit_updated_idx"     ON "habit"     ("user_id", "updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "habit_log_user_idx"    ON "habit_log" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "habit_log_habit_idx"   ON "habit_log" ("habit_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "habit_log_date_idx"    ON "habit_log" ("user_id", "date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "habit_log_updated_idx" ON "habit_log" ("user_id", "updated_at");
--> statement-breakpoint

-- Auto-bump updated_at (reuses set_updated_at() from 0002_offline_sync)
DROP TRIGGER IF EXISTS habit_set_updated_at ON "habit";
--> statement-breakpoint
CREATE TRIGGER habit_set_updated_at BEFORE UPDATE ON "habit"
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS habit_log_set_updated_at ON "habit_log";
--> statement-breakpoint
CREATE TRIGGER habit_log_set_updated_at BEFORE UPDATE ON "habit_log"
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

-- RLS: owner only
ALTER TABLE "habit"     ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "habit_log" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "habit_owner" ON "habit";
--> statement-breakpoint
CREATE POLICY "habit_owner" ON "habit"
	FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
--> statement-breakpoint
DROP POLICY IF EXISTS "habit_log_owner" ON "habit_log";
--> statement-breakpoint
CREATE POLICY "habit_log_owner" ON "habit_log"
	FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
--> statement-breakpoint

-- LWW-guarded upsert RPC (one per synced table; see 0003_lww_rpc)
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
    deleted_at = EXCLUDED.deleted_at
  RETURNING * INTO result;
  RETURN result;
END;
$$;
--> statement-breakpoint

GRANT EXECUTE ON FUNCTION upsert_habit_if_newer(jsonb)     TO authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION upsert_habit_log_if_newer(jsonb) TO authenticated;
