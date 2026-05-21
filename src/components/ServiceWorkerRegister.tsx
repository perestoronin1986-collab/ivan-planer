"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let reg: ServiceWorkerRegistration | null = null;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((r) => {
        reg = r;
        // Force update check on each load
        r.update().catch(() => {});
      })
      .catch((err) => {
        console.error("SW registration failed:", err);
      });

    // Listen for outbox sync requests from SW background-sync
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "RUN_OUTBOX_SYNC") {
        window.dispatchEvent(new CustomEvent("ivanplaner:sync-outbox"));
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);

    // Trigger sync on online event
    const onOnline = () => {
      window.dispatchEvent(new CustomEvent("ivanplaner:sync-outbox"));
      // Also request background-sync if supported
      const sync = (reg as unknown as { sync?: { register: (tag: string) => Promise<void> } })?.sync;
      sync?.register("outbox-sync").catch(() => {});
    };
    window.addEventListener("online", onOnline);

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      window.removeEventListener("online", onOnline);
    };
  }, []);
  return null;
}
