"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/local/db";
import { PageShell } from "@/components/ui";

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

export default function YearPage() {
  const year = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const data = useLiveQuery(async () => {
    const db = localDb();
    const tasks = await db.task.toArray();
    const active = new Array(12).fill(0);
    const done = new Array(12).fill(0);

    for (const t of tasks) {
      if (t.deleted_at) continue;
      if (t.rrule) continue;

      if (t.completed_at) {
        const d = new Date(t.completed_at);
        if (d.getFullYear() === year) done[d.getMonth()]++;
      }

      if (t.status !== "done" && t.due_at) {
        const d = new Date(t.due_at);
        if (d.getFullYear() === year) active[d.getMonth()]++;
      }
    }

    return { active, done };
  });

  const active = data?.active ?? new Array(12).fill(0);
  const done = data?.done ?? new Array(12).fill(0);

  const totalActive = active.reduce((a, b) => a + b, 0);
  const totalDone = done.reduce((a, b) => a + b, 0);

  return (
    <PageShell
      title={`${year} год`}
      emoji="📅"
      subtitle={`${totalActive} активных · ${totalDone} выполнено`}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "8px",
        }}
      >
        {MONTHS.map((name, i) => {
          const isCurrent = i === currentMonth;
          return (
            <div
              key={i}
              style={{
                background: isCurrent ? "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)" : "#fff",
                border: isCurrent ? "1.5px solid #a78bfa" : "1px solid #e5e7eb",
                borderRadius: "14px",
                padding: "10px 8px",
                textAlign: "center",
                boxShadow: isCurrent
                  ? "0 2px 10px rgba(139,92,246,0.15)"
                  : "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: isCurrent ? "#7c3aed" : "#374151",
                  marginBottom: "6px",
                }}
              >
                {name}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "6px",
                  minHeight: "18px",
                }}
              >
                {active[i] > 0 && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "2px",
                      fontSize: "10px",
                      color: "#059669",
                      fontWeight: 600,
                    }}
                  >
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: "#10b981",
                        display: "inline-block",
                      }}
                    />
                    {active[i]}
                  </span>
                )}
                {done[i] > 0 && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "2px",
                      fontSize: "10px",
                      color: "#9ca3af",
                      fontWeight: 600,
                    }}
                  >
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: "#d1d5db",
                        display: "inline-block",
                      }}
                    />
                    {done[i]}
                  </span>
                )}
                {active[i] === 0 && done[i] === 0 && (
                  <span style={{ fontSize: "10px", color: "#e5e7eb" }}>—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "14px",
          padding: "10px 14px",
          fontSize: "11px",
          color: "#9ca3af",
          display: "flex",
          gap: "16px",
          justifyContent: "center",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#10b981",
              display: "inline-block",
            }}
          />
          в процессе
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#d1d5db",
              display: "inline-block",
            }}
          />
          выполнено
        </span>
      </div>
    </PageShell>
  );
}
