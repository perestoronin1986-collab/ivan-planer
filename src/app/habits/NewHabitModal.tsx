"use client";

import { useRef, useState } from "react";
import { useUserId } from "@/lib/local/useUser";
import { addHabitLocal } from "@/lib/local/mutations";
import type { HabitFrequency, HabitKind, HabitType } from "@/lib/db";
import {
  dialogClass,
  inputClass,
  labelClass,
  primaryBtnClass,
  ghostBtnClass,
} from "@/components/ui/formStyles";

const ICONS = ["💧", "🏃", "📖", "🧘", "💪", "🥗", "😴", "🚭", "🍷", "📵", "🦷", "✍️"];
const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f59e0b", "#10b981", "#06b6d4"];

export function NewHabitModal({
  triggerClassName,
  triggerChildren,
}: {
  triggerClassName?: string;
  triggerChildren?: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const userId = useUserId();

  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [kind, setKind] = useState<HabitKind>("build");
  const [frequency, setFrequency] = useState<HabitFrequency>("daily");
  const [targetPerWeek, setTargetPerWeek] = useState(3);
  const [type, setType] = useState<HabitType>("binary");
  const [unit, setUnit] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setIcon(ICONS[0]);
    setColor(COLORS[0]);
    setKind("build");
    setFrequency("daily");
    setTargetPerWeek(3);
    setType("binary");
    setUnit("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !name.trim()) return;
    try {
      setError(null);
      await addHabitLocal({
        userId,
        name: name.trim(),
        icon,
        color,
        kind,
        frequency,
        targetPerWeek,
        type,
        unit,
      });
      reset();
      dialogRef.current?.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  }

  return (
    <>
      <button
        onClick={() => {
          reset();
          dialogRef.current?.showModal();
        }}
        className={triggerClassName ?? primaryBtnClass}
      >
        {triggerChildren ?? "+ Новая привычка"}
      </button>

      <dialog
        ref={dialogRef}
        className={dialogClass}
        onClick={(e) => {
          if (e.target === dialogRef.current) {
            reset();
            dialogRef.current?.close();
          }
        }}
      >
        <h2 className="mb-4 text-base font-bold text-[var(--ink)]">
          ✨ Новая привычка
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="space-y-1">
            <label className={labelClass}>Название</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Например: Пить воду"
              className={inputClass}
            />
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Иконка</label>
            <div className="flex flex-wrap gap-1.5">
              {ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] text-lg transition"
                  style={{
                    background: icon === ic ? "var(--brand-100)" : "var(--brand-50)",
                    border:
                      icon === ic
                        ? "1.5px solid var(--brand-500)"
                        : "1px solid var(--brand-200)",
                  }}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Цвет</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={c}
                  className="h-7 w-7 rounded-full transition"
                  style={{
                    background: c,
                    outline: color === c ? "2px solid var(--ink)" : "none",
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Тип</label>
            <div className="grid grid-cols-2 gap-2">
              <TypeBtn
                active={kind === "build"}
                onClick={() => setKind("build")}
                label="Полезная"
                hint="формировать"
              />
              <TypeBtn
                active={kind === "quit"}
                onClick={() => setKind("quit")}
                label="Отказ"
                hint="бросить"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Тип отметки</label>
            <div className="grid grid-cols-2 gap-2">
              <TypeBtn
                active={type === "binary"}
                onClick={() => setType("binary")}
                label="Галочка"
                hint="выполнено / нет"
              />
              <TypeBtn
                active={type === "numeric"}
                onClick={() => setType("numeric")}
                label="Числовая"
                hint="записывать число"
              />
            </div>
          </div>

          {type === "numeric" && (
            <div className="space-y-1">
              <label className={labelClass}>Единица (необязательно)</label>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="кг, мл, км, шаги…"
                className={inputClass}
              />
            </div>
          )}

          <div className="space-y-1">
            <label className={labelClass}>Частота</label>
            <div className="grid grid-cols-2 gap-2">
              <TypeBtn
                active={frequency === "daily"}
                onClick={() => setFrequency("daily")}
                label="Ежедневная"
                hint="каждый день"
              />
              <TypeBtn
                active={frequency === "weekly"}
                onClick={() => setFrequency("weekly")}
                label="Еженедельная"
                hint="N раз в неделю"
              />
            </div>
          </div>

          {frequency === "weekly" && (
            <div className="space-y-1">
              <label className={labelClass}>Цель: раз в неделю</label>
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setTargetPerWeek(n)}
                    className="h-9 w-9 rounded-[10px] text-sm font-semibold transition"
                    style={{
                      background:
                        targetPerWeek === n ? "var(--brand-600)" : "var(--brand-50)",
                      color: targetPerWeek === n ? "#fff" : "var(--brand-900)",
                      border:
                        targetPerWeek === n
                          ? "none"
                          : "1px solid var(--brand-200)",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                reset();
                dialogRef.current?.close();
              }}
              className={`flex-1 ${ghostBtnClass}`}
            >
              Отмена
            </button>
            <button type="submit" className={`flex-1 ${primaryBtnClass}`}>
              Добавить
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

function TypeBtn({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[12px] px-3 py-2 text-left transition"
      style={{
        background: active ? "var(--brand-100)" : "var(--brand-50)",
        border: active
          ? "1.5px solid var(--brand-500)"
          : "1px solid var(--brand-200)",
      }}
    >
      <div className="text-sm font-semibold text-[var(--brand-900)]">{label}</div>
      <div className="text-[11px] text-muted">{hint}</div>
    </button>
  );
}
