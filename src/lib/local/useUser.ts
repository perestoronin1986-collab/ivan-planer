"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Client-side hook to read the current Supabase user id.
 * Returns null until resolved, undefined if signed out.
 */
export function useUserId(): string | null | undefined {
  const [id, setId] = useState<string | null | undefined>(null);
  useEffect(() => {
    const supabase = createClient();
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setId(data.user?.id ?? undefined);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (active) setId(session?.user?.id ?? undefined);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return id;
}
