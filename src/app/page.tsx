import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { OnlineIndicator } from "@/components/OnlineIndicator";
import { SyncHealth } from "@/components/SyncHealth";

export default async function Home() {
  const user = await requireUser();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-2 bg-gray-100 p-3">
      {/* Header */}
      <header className="flex items-start justify-between pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">IvanPlaner</h1>
            <OnlineIndicator />
            <SyncHealth />
          </div>
          <span className="text-xs text-gray-400">{user.email}</span>
        </div>
        <form action={signOut} className="mt-1">
          <button className="text-xs text-gray-400 underline">выйти</button>
        </form>
      </header>

      {/* Block 1: Планирование — highlighted */}
      <section
        style={{
          background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
          border: "1.5px solid #a78bfa",
          borderRadius: "20px",
          padding: "12px",
          boxShadow: "0 4px 20px rgba(139,92,246,0.2)",
        }}
      >
        <p
          style={{
            color: "#7c3aed",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "1px",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}
        >
          📅 Планирование
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "6px" }}>
          <Link
            href="/today"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #8b5cf6)",
              borderRadius: "14px",
              padding: "13px 10px",
              textAlign: "center",
              display: "block",
              boxShadow: "0 4px 15px rgba(124,58,237,0.4)",
              textDecoration: "none",
            }}
          >
            <div style={{ fontSize: "18px", marginBottom: "2px" }}>☀️</div>
            <div style={{ color: "#fff", fontSize: "14px", fontWeight: 600 }}>Сегодня</div>
          </Link>
          <Link
            href="/week"
            style={{
              background: "#fff",
              border: "1.5px solid #c4b5fd",
              borderRadius: "14px",
              padding: "13px 10px",
              textAlign: "center",
              display: "block",
              boxShadow: "0 2px 8px rgba(139,92,246,0.12)",
              textDecoration: "none",
            }}
          >
            <div style={{ fontSize: "18px", marginBottom: "2px" }}>📆</div>
            <div style={{ color: "#6d28d9", fontSize: "14px", fontWeight: 600 }}>Неделя</div>
          </Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", width: "66%", margin: "0 auto" }}>
          <Link
            href="/month"
            style={{
              background: "#fff",
              border: "1px solid #ddd6fe",
              borderRadius: "14px",
              padding: "8px",
              textAlign: "center",
              display: "block",
              textDecoration: "none",
            }}
          >
            <span style={{ color: "#8b5cf6", fontSize: "13px", fontWeight: 500 }}>🗓 Месяц</span>
          </Link>
          <Link
            href="/year"
            style={{
              background: "#fff",
              border: "1px solid #ddd6fe",
              borderRadius: "14px",
              padding: "8px",
              textAlign: "center",
              display: "block",
              textDecoration: "none",
            }}
          >
            <span style={{ color: "#8b5cf6", fontSize: "13px", fontWeight: 500 }}>📅 Год</span>
          </Link>
        </div>
      </section>

      {/* Block 2: Структура */}
      <section
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "20px",
          padding: "12px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <p
          style={{
            color: "#a78bfa",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "1px",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}
        >
          🏗 Структура
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "6px" }}>
          {[
            { href: "/spheres", emoji: "🌐", label: "Сферы" },
            { href: "/projects", emoji: "📁", label: "Проекты" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                background: "#faf5ff",
                border: "1px solid #e9d5ff",
                borderRadius: "14px",
                padding: "11px 10px",
                textAlign: "center",
                display: "block",
                textDecoration: "none",
              }}
            >
              <div style={{ fontSize: "16px", marginBottom: "2px" }}>{item.emoji}</div>
              <div style={{ color: "#4c1d95", fontSize: "13px", fontWeight: 500 }}>{item.label}</div>
            </Link>
          ))}
        </div>
        <Link
          href="/projects/done"
          style={{
            background: "#faf5ff",
            border: "1px solid #ede9fe",
            borderRadius: "14px",
            padding: "8px",
            textAlign: "center",
            display: "block",
            width: "50%",
            margin: "0 auto",
            textDecoration: "none",
          }}
        >
          <span style={{ color: "#a78bfa", fontSize: "12px", fontWeight: 500 }}>✅ Выполненные проекты</span>
        </Link>
      </section>

      {/* Block 3: Задачи */}
      <section
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "20px",
          padding: "12px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <p
          style={{
            color: "#a78bfa",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "1px",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}
        >
          ✅ Задачи
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "6px" }}>
          {[
            { href: "/tasks", emoji: "⚡", label: "Активные" },
            { href: "/recurring", emoji: "🔄", label: "Регулярные" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                background: "#faf5ff",
                border: "1px solid #e9d5ff",
                borderRadius: "14px",
                padding: "11px 10px",
                textAlign: "center",
                display: "block",
                textDecoration: "none",
              }}
            >
              <div style={{ fontSize: "16px", marginBottom: "2px" }}>{item.emoji}</div>
              <div style={{ color: "#4c1d95", fontSize: "12px", fontWeight: 500 }}>{item.label}</div>
            </Link>
          ))}
        </div>
        <Link
          href="/done"
          style={{
            background: "#faf5ff",
            border: "1px solid #ede9fe",
            borderRadius: "14px",
            padding: "8px",
            textAlign: "center",
            display: "block",
            width: "50%",
            margin: "0 auto",
            textDecoration: "none",
          }}
        >
          <span style={{ color: "#a78bfa", fontSize: "12px", fontWeight: 500 }}>✔ Выполнено</span>
        </Link>
      </section>

      {/* Block 4: Утилиты */}
      <section
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "20px",
          padding: "12px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {[
            { href: "/search", emoji: "🔍", label: "Поиск" },
            { href: "/settings", emoji: "⚙️", label: "Настройки" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                background: "#faf5ff",
                border: "1px solid #e9d5ff",
                borderRadius: "14px",
                padding: "10px 10px",
                textAlign: "center",
                display: "block",
                textDecoration: "none",
              }}
            >
              <div style={{ fontSize: "15px", marginBottom: "2px" }}>{item.emoji}</div>
              <div style={{ color: "#7c3aed", fontSize: "12px", fontWeight: 500 }}>{item.label}</div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
