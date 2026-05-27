import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron-driven Web Push sender.
 *
 * Schedule: every 5 minutes (see vercel.json).
 * Reads pending notifications (fire_at <= now AND sent_at IS NULL),
 * sends Web Push to all push_subscription rows for the owner,
 * marks notification.sent_at, prunes expired (410 Gone) subscriptions.
 *
 * Auth:
 *   - Vercel attaches `Authorization: Bearer <CRON_SECRET>` automatically
 *     when CRON_SECRET env var is set (recommended).
 *   - Manual triggers: pass ?secret=<CRON_SECRET> or same Bearer header.
 *
 * Uses the SERVICE ROLE key for unrestricted reads across all users
 * (RLS would block the cron's anon-context).
 */
function checkAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // unsafe but allow if not configured
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(req.url);
  if (url.searchParams.get("secret") === secret) return true;
  return false;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env not configured");
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function configureWebPush() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  if (!pub || !priv) throw new Error("VAPID keys not configured");
  webpush.setVapidDetails(subject, pub, priv);
}

type NotificationRow = {
  id: string;
  user_id: string;
  task_id: string;
  fire_at: string;
};

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
};

type SubRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

async function handle(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  configureWebPush();
  const sb = getServiceClient();
  const nowIso = new Date().toISOString();

  // 1. Pending notifications, oldest first, cap batch.
  const { data: notifs, error: notifErr } = await sb
    .from("notification")
    .select("id, user_id, task_id, fire_at")
    .lte("fire_at", nowIso)
    .is("sent_at", null)
    .order("fire_at", { ascending: true })
    .limit(200);

  if (notifErr) {
    return NextResponse.json({ error: notifErr.message }, { status: 500 });
  }
  if (!notifs || notifs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const taskIds = [...new Set(notifs.map((n) => (n as NotificationRow).task_id))];
  const userIds = [...new Set(notifs.map((n) => (n as NotificationRow).user_id))];

  const [{ data: tasksData }, { data: subsData }] = await Promise.all([
    sb
      .from("task")
      .select("id, title, description, due_at, status, deleted_at")
      .in("id", taskIds),
    sb.from("push_subscription").select("id, user_id, endpoint, p256dh, auth").in(
      "user_id",
      userIds,
    ),
  ]);

  const taskById = new Map<string, TaskRow & { status: string; deleted_at: string | null }>();
  for (const t of (tasksData ?? []) as Array<TaskRow & { status: string; deleted_at: string | null }>) {
    taskById.set(t.id, t);
  }
  const subsByUser = new Map<string, SubRow[]>();
  for (const s of (subsData ?? []) as SubRow[] & { user_id: string }[]) {
    const uid = (s as unknown as { user_id: string }).user_id;
    const arr = subsByUser.get(uid) ?? [];
    arr.push(s);
    subsByUser.set(uid, arr);
  }

  const sentIds: string[] = [];
  const deadEndpoints: string[] = [];
  let pushed = 0;

  for (const n of notifs as NotificationRow[]) {
    const task = taskById.get(n.task_id);
    // Skip if task gone or done
    if (!task || task.deleted_at || task.status === "done") {
      sentIds.push(n.id);
      continue;
    }
    const subs = subsByUser.get(n.user_id) ?? [];
    if (subs.length === 0) {
      // No devices — mark sent to avoid re-trying forever
      sentIds.push(n.id);
      continue;
    }

    const body = task.description?.trim() || "Напоминание о задаче";
    const payload = JSON.stringify({
      title: task.title,
      body: body.length > 140 ? body.slice(0, 137) + "…" : body,
      data: { url: "/today", task_id: task.id },
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 60 * 60 * 24 },
        );
        pushed++;
      } catch (e: unknown) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          deadEndpoints.push(sub.endpoint);
        } else {
          console.error("push fail", code, e);
        }
      }
    }
    sentIds.push(n.id);
  }

  if (sentIds.length > 0) {
    await sb
      .from("notification")
      .update({ sent_at: nowIso })
      .in("id", sentIds);
  }
  if (deadEndpoints.length > 0) {
    await sb.from("push_subscription").delete().in("endpoint", deadEndpoints);
  }

  return NextResponse.json({
    ok: true,
    notifications: notifs.length,
    pushed,
    dead: deadEndpoints.length,
  });
}

export const GET = handle;
export const POST = handle;
