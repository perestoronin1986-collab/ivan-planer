-- Голосовой инбокс: канал записи + идемпотентность VK.
--
-- Мысль попадает в inbox_item тремя путями: руками в UI ('manual'), голосовым
-- в сообщество VK ('vk', вебхук пишет напрямую в Supabase), диктовкой на
-- /inbox через Web Speech API ('voice'). `source` нужен, чтобы при разборе
-- было видно происхождение, и чтобы отличать строки, которые ведёт вебхук.
--
-- `vk_message_id` — ключ идемпотентности. Callback API повторяет событие, если
-- не ответить `ok` за отведённое время, а расшифровку длинного голосового VK
-- досылает отдельным `message_edit` по тому же сообщению. И повтор, и досылка
-- находят строку по этому id вместо того, чтобы плодить дубли мысли.

ALTER TABLE "inbox_item" ADD COLUMN IF NOT EXISTS "source" text NOT NULL DEFAULT 'manual';
--> statement-breakpoint

ALTER TABLE "inbox_item" ADD COLUMN IF NOT EXISTS "vk_message_id" bigint;
--> statement-breakpoint

ALTER TABLE "inbox_item" DROP CONSTRAINT IF EXISTS "inbox_source_check";
--> statement-breakpoint

ALTER TABLE "inbox_item" ADD CONSTRAINT "inbox_source_check"
  CHECK ("source" IN ('manual', 'vk', 'voice'));
--> statement-breakpoint

-- Частичный uniqueness: NULL у всех записей, заведённых руками, а несколько
-- NULL уникальному индексу не мешают.
CREATE UNIQUE INDEX IF NOT EXISTS "inbox_vk_message_idx"
  ON "inbox_item" ("vk_message_id")
  WHERE "vk_message_id" IS NOT NULL;
--> statement-breakpoint

-- Sync RPC обязан нести новые колонки, иначе офлайн-правка строки затрёт их
-- на конфликте — ровно те грабли, на которых в 0007 потерялся `priority`.
CREATE OR REPLACE FUNCTION upsert_inbox_item_if_newer(payload jsonb)
RETURNS inbox_item
LANGUAGE plpgsql
AS $$
DECLARE
  result inbox_item;
  existing_updated_at timestamptz;
  incoming_updated_at timestamptz;
BEGIN
  incoming_updated_at := (payload->>'updated_at')::timestamptz;
  SELECT updated_at INTO existing_updated_at FROM inbox_item WHERE id = (payload->>'id')::uuid;

  IF existing_updated_at IS NOT NULL AND existing_updated_at > incoming_updated_at THEN
    SELECT * INTO result FROM inbox_item WHERE id = (payload->>'id')::uuid;
    RETURN result;
  END IF;

  INSERT INTO inbox_item
  SELECT * FROM jsonb_populate_record(NULL::inbox_item, payload)
  ON CONFLICT (id) DO UPDATE SET
    user_id              = EXCLUDED.user_id,
    content              = EXCLUDED.content,
    source               = EXCLUDED.source,
    vk_message_id        = EXCLUDED.vk_message_id,
    processed_at         = EXCLUDED.processed_at,
    converted_task_id    = EXCLUDED.converted_task_id,
    converted_sphere_id  = EXCLUDED.converted_sphere_id,
    converted_project_id = EXCLUDED.converted_project_id,
    deleted_at           = EXCLUDED.deleted_at
  RETURNING * INTO result;
  RETURN result;
END;
$$;
