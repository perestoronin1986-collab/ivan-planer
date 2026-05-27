"use client";

import { useEffect, useState } from "react";

/**
 * Reminder picker — quick presets + custom datetime.
 *
 * Presets relative to dueAt:
 *   - "10m"   = dueAt - 10 min
 *   - "1h"    = dueAt - 1 h
 *   - "1d9"   = day before dueAt at 09:00 local
 *   - "custom" = free datetime-local input
 *
 * Presets 10m / 1h / 1d9 are disabled if dueAt is empty.
 */
type Preset = "10m" | "1h" | "1d9" | "custom" | "none";

function toLocalInputValue(iso: string): string {
  // YYYY-MM-DDTHH:mm in local time for <input type=datetime-local>
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(v: string): string {
  // input value is local; new Date(v) treats as local — convert to ISO UTC
  if (!v) return "";
  return new Date(v).toISOString();
}

function computePresetIso(preset: Preset, dueAtIso: string | null): string | null {
  if (!dueAtIso) return null;
  const due = new Date(dueAtIso);
  if (isNaN(due.getTime())) return null;
  if (preset === "10m") return new Date(due.getTime() - 10 * 60_000).toISOString();
  if (preset === "1h") return new Date(due.getTime() - 60 * 60_000).toISOString();
  if (preset === "1d9") {
    const d = new Date(due);
    d.setDate(d.getDate() - 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
  }
  return null;
}

export function RemindAtPicker({
  value, // ISO or null
  dueAt, // ISO or null
  onChange,
}: {
  value: string | null;
  dueAt: string | null;
  onChange: (iso: string | null) => void;
}) {
  // Determine active preset from value+dueAt
  const matchedPreset: Preset = (() => {
    if (!value) return "none";
    if (dueAt) {
      for (const p of ["10m", "1h", "1d9"] as const) {
        const iso = computePresetIso(p, dueAt);
        if (iso && Math.abs(new Date(iso).getTime() - new Date(value).getTime()) < 30_000) {
          return p;
        }
      }
    }
    return "custom";
  })();

  const [preset, setPreset] = useState<Preset>(matchedPreset);
  const [customLocal, setCustomLocal] = useState<string>(
    value && matchedPreset === "custom" ? toLocalInputValue(value) : "",
  );

  useEffect(() => {
    // Re-sync if dueAt changes and a relative preset is active
    if (preset === "10m" || preset === "1h" || preset === "1d9") {
      const iso = computePresetIso(preset, dueAt);
      onChange(iso);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueAt]);

  function selectPreset(p: Preset) {
    setPreset(p);
    if (p === "none") {
      onChange(null);
      return;
    }
    if (p === "custom") {
      if (customLocal) onChange(fromLocalInputValue(customLocal));
      else onChange(null);
      return;
    }
    onChange(computePresetIso(p, dueAt));
  }

  const dueDisabled = !dueAt;
  const PRESETS: { key: Preset; label: string; disabled?: boolean }[] = [
    { key: "none", label: "—" },
    { key: "10m", label: "10 мин", disabled: dueDisabled },
    { key: "1h", label: "1 час", disabled: dueDisabled },
    { key: "1d9", label: "1 день (9:00)", disabled: dueDisabled },
    { key: "custom", label: "точно" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => {
          const active = preset === p.key;
          return (
            <button
              type="button"
              key={p.key}
              disabled={p.disabled}
              onClick={() => selectPreset(p.key)}
              className="rounded-full px-2.5 py-1 text-xs transition-colors disabled:opacity-40"
              style={{
                background: active ? "var(--brand-600, #7c3aed)" : "#fff",
                color: active ? "#fff" : "#4c1d95",
                border: `1px solid ${active ? "var(--brand-600, #7c3aed)" : "#e9d5ff"}`,
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      {preset === "custom" && (
        <input
          type="datetime-local"
          value={customLocal}
          onChange={(e) => {
            setCustomLocal(e.target.value);
            onChange(e.target.value ? fromLocalInputValue(e.target.value) : null);
          }}
          className="w-full rounded-[10px] border border-neutral-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[var(--brand-500,#8b5cf6)]"
        />
      )}
      {dueDisabled && preset !== "custom" && preset !== "none" && (
        <p className="text-[10px] text-neutral-400">
          Пресеты доступны после указания срока задачи
        </p>
      )}
    </div>
  );
}
