ALTER TABLE "task" ADD COLUMN "carry_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION increment_carry_count(task_ids uuid[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE task SET carry_count = carry_count + 1 WHERE id = ANY(task_ids);
$$;
