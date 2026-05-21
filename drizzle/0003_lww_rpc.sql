-- Last-Write-Wins guard for offline-first sync.
--
-- Without this, two devices that edited the same row while offline will
-- silently overwrite each other based on push order. With it, an older
-- payload is rejected (we return the existing row instead).
--
-- The function is one RPC per synced table to keep the type signature
-- explicit. Add a new one if a new synced table appears.

-- sphere ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION upsert_sphere_if_newer(payload jsonb)
RETURNS sphere
LANGUAGE plpgsql
AS $$
DECLARE
  result sphere;
  existing_updated_at timestamptz;
  incoming_updated_at timestamptz;
BEGIN
  incoming_updated_at := (payload->>'updated_at')::timestamptz;
  SELECT updated_at INTO existing_updated_at FROM sphere WHERE id = (payload->>'id')::uuid;

  IF existing_updated_at IS NOT NULL AND existing_updated_at > incoming_updated_at THEN
    -- Server has a newer version, keep it.
    SELECT * INTO result FROM sphere WHERE id = (payload->>'id')::uuid;
    RETURN result;
  END IF;

  INSERT INTO sphere
  SELECT * FROM jsonb_populate_record(NULL::sphere, payload)
  ON CONFLICT (id) DO UPDATE SET
    user_id    = EXCLUDED.user_id,
    name       = EXCLUDED.name,
    color      = EXCLUDED.color,
    icon       = EXCLUDED.icon,
    "order"    = EXCLUDED."order",
    archived   = EXCLUDED.archived,
    deleted_at = EXCLUDED.deleted_at
  RETURNING * INTO result;
  RETURN result;
END;
$$;

-- project ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION upsert_project_if_newer(payload jsonb)
RETURNS project
LANGUAGE plpgsql
AS $$
DECLARE
  result project;
  existing_updated_at timestamptz;
  incoming_updated_at timestamptz;
BEGIN
  incoming_updated_at := (payload->>'updated_at')::timestamptz;
  SELECT updated_at INTO existing_updated_at FROM project WHERE id = (payload->>'id')::uuid;

  IF existing_updated_at IS NOT NULL AND existing_updated_at > incoming_updated_at THEN
    SELECT * INTO result FROM project WHERE id = (payload->>'id')::uuid;
    RETURN result;
  END IF;

  INSERT INTO project
  SELECT * FROM jsonb_populate_record(NULL::project, payload)
  ON CONFLICT (id) DO UPDATE SET
    user_id     = EXCLUDED.user_id,
    sphere_id   = EXCLUDED.sphere_id,
    name        = EXCLUDED.name,
    description = EXCLUDED.description,
    status      = EXCLUDED.status,
    "order"     = EXCLUDED."order",
    deleted_at  = EXCLUDED.deleted_at
  RETURNING * INTO result;
  RETURN result;
END;
$$;

-- task ------------------------------------------------------------------
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
    carry_count    = EXCLUDED.carry_count,
    completed_at   = EXCLUDED.completed_at,
    overdue_action = EXCLUDED.overdue_action,
    deleted_at     = EXCLUDED.deleted_at
  RETURNING * INTO result;
  RETURN result;
END;
$$;

-- inbox_item ------------------------------------------------------------
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
    processed_at         = EXCLUDED.processed_at,
    converted_task_id    = EXCLUDED.converted_task_id,
    converted_sphere_id  = EXCLUDED.converted_sphere_id,
    converted_project_id = EXCLUDED.converted_project_id,
    deleted_at           = EXCLUDED.deleted_at
  RETURNING * INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_sphere_if_newer(jsonb)     TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_project_if_newer(jsonb)    TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_task_if_newer(jsonb)       TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_inbox_item_if_newer(jsonb) TO authenticated;
