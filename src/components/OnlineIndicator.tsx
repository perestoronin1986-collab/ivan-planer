"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function OnlineIndicator() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );

  const color = online ? "bg-green-500" : "bg-neutral-400";
  const label = online ? "онлайн" : "оффлайн";
  const title = online
    ? "Онлайн: изменения синхронизируются с сервером"
    : "Оффлайн: изменения сохраняются локально и отправятся при подключении";

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-neutral-500"
      title={title}
      aria-label={`Статус: ${label}`}
    >
      <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden />
      <span>{label}</span>
    </span>
  );
}
