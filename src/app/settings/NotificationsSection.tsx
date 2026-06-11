"use client";

import { useEffect, useState } from "react";
import { Section } from "@/components/ui";
import {
  isPushSupported,
  getCurrentSubscription,
  subscribePush,
  unsubscribePush,
} from "@/lib/webPushClient";

export function NotificationsSection() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sup = isPushSupported();
      const perm = sup ? Notification.permission : "default";
      const sub = sup ? await getCurrentSubscription().catch(() => null) : null;
      if (cancelled) return;
      setSupported(sup);
      setPermission(perm);
      setEnabled(!!sub);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle() {
    setError(null);
    setBusy(true);
    try {
      if (enabled) {
        await unsubscribePush();
        setEnabled(false);
      } else {
        await subscribePush();
        setEnabled(true);
        setPermission(Notification.permission);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  if (supported === null) return null;

  return (
    <Section label="🔔 Уведомления">
      {!supported && (
        <p className="text-sm text-muted">
          Браузер не поддерживает push-уведомления. На iPhone установи приложение
          на главный экран (Safari → «Поделиться» → «На экран Домой»).
        </p>
      )}

      {supported && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={toggle}
              className="flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50"
              style={{
                background: enabled
                  ? "var(--brand-600, #7c3aed)"
                  : "var(--brand-200, #ddd6fe)",
              }}
              aria-pressed={enabled}
              aria-label="Push-уведомления"
            >
              <span
                className={`ml-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  enabled ? "translate-x-5" : ""
                }`}
              />
            </button>
            <div className="flex-1">
              <div className="text-sm font-medium">
                {enabled ? "Push-уведомления включены" : "Push-уведомления выключены"}
              </div>
              <div className="text-xs text-muted">
                Будут приходить за указанное время до срока задачи
              </div>
            </div>
          </div>

          {permission === "denied" && (
            <p className="text-xs text-red-500">
              Разрешение заблокировано в настройках браузера. Открой настройки
              сайта и разреши уведомления.
            </p>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <p className="text-[10px] text-muted">
            На iPhone push работает только если приложение установлено на главный
            экран (iOS 16.4+).
          </p>
        </div>
      )}
    </Section>
  );
}
