"use client";

import { PRIORITY_OPTIONS, type Priority } from "@/lib/priority";

export function PrioritySelector({
  value,
  onChange,
}: {
  value: Priority;
  onChange: (p: Priority) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {PRIORITY_OPTIONS.map((o) => {
        const active = o.value === value;
        return (
          <button
            type="button"
            key={o.value}
            onClick={() => onChange(o.value)}
            className="flex-1 rounded-[10px] px-2 py-1.5 text-xs font-semibold transition-all"
            style={{
              background: active ? o.bg : "#fff",
              border: `1.5px solid ${active ? o.color : "#e5e7eb"}`,
              color: active ? o.color : "#6b7280",
              boxShadow: active ? `0 1px 4px ${o.ring}` : "none",
            }}
            aria-pressed={active}
          >
            <span style={{ marginRight: 4 }}>●</span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
