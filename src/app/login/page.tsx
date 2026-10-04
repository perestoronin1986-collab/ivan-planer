"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Вход по паролю: у своего GoTrue на VPS нет почты, ссылка на почту не дойдёт.
// Пароль задаётся на сервере: /opt/planer-db/set-password.sh <email>.
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus("error");
      setError(
        error.message === "Invalid login credentials"
          ? "Неверная почта или пароль"
          : error.message,
      );
      return;
    }
    // Полная перезагрузка: middleware должен увидеть cookie сессии.
    window.location.assign("/");
  }

  const field =
    "w-full rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-100";

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">IvanPlaner</h1>
          <p className="text-sm text-neutral-500">Вход</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            autoComplete="username"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
          />
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {status === "sending" ? "Вход…" : "Войти"}
          </button>
        </form>
        {status === "error" && error && (
          <p className="text-center text-sm text-red-600">{error}</p>
        )}
      </div>
    </main>
  );
}
