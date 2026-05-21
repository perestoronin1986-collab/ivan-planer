"use client";

import { useEffect, useState } from "react";

export function OnlineIndicator() {
  const [online, setOnline] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!mounted) return null;

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
