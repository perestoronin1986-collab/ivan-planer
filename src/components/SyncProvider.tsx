"use client";

import { useEffect } from "react";
import { installSyncListeners } from "@/lib/local/sync";

/**
 * Mounts the sync engine (online event listeners + initial sync).
 * Place near the root of the client tree, after auth is hydrated.
 */
export function SyncProvider() {
  useEffect(() => {
    return installSyncListeners();
  }, []);
  return null;
}
