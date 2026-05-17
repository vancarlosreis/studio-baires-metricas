"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, ChevronDown } from "lucide-react";
import { PRESETS, resolvePeriod, formatDateBR } from "@/lib/period";

export function PeriodSelectorDark() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentPreset = searchParams.get("periodo") ?? "30d";
  const customDe = searchParams.get("de") ?? undefined;
  const customAte = searchParams.get("ate") ?? undefined;
  const period = resolvePeriod(currentPreset, customDe, customAte);

  const [customStart, setCustomStart] = useState(
    customDe ?? period.start.toISOString().slice(0, 10),
  );
  const [customEnd, setCustomEnd] = useState(
    customAte ?? period.end.toISOString().slice(0, 10),
  );

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onClickOutside);
      document.addEventListener("keydown", onEsc);
      return () => {
        document.removeEventListener("mousedown", onClickOutside);
        document.removeEventListener("keydown", onEsc);
      };
    }
  }, [open]);

  function selectPreset(preset: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("periodo", preset);
    if (preset !== "custom") {
      params.delete("de");
      params.delete("ate");
    }
    router.push(`?${params.toString()}`);
    if (preset !== "custom") setOpen(false);
  }

  function applyCustom() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("periodo", "custom");
    params.set("de", customStart);
    params.set("ate", customEnd);
    router.push(`?${params.toString()}`);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-white/[0.06] bg-surface/60 px-4 text-sm font-medium text-white/80 transition hover:text-white"
      >
        <Calendar size={14} />
        <span>{period.label}</span>
        <span className="hidden text-xs text-white/40 sm:inline">
          ({formatDateBR(period.start)} → {formatDateBR(period.end)})
        </span>
        <ChevronDown size={14} className="text-white/60" />
      </button>

      {open && (
        <div
          role="menu"
          className="dark-card absolute right-0 top-12 z-40 w-[420px] p-4 shadow-2xl"
        >
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
            Período de análise
          </p>

          <div className="grid grid-cols-2 gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => selectPreset(p.value)}
                className={`rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                  currentPreset === p.value
                    ? "bg-surface-2 text-white dark-glow-purple"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {currentPreset === "custom" && (
            <div className="mt-4 border-t border-white/[0.08] pt-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                    De
                  </span>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="mt-1 w-full rounded-full border border-white/[0.10] bg-bg-elevated px-3 py-1.5 text-sm text-white outline-none focus:border-neon-purple/60"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                    Até
                  </span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="mt-1 w-full rounded-full border border-white/[0.10] bg-bg-elevated px-3 py-1.5 text-sm text-white outline-none focus:border-neon-purple/60"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={applyCustom}
                className="dark-bg-grad-purple-pink mt-3 inline-flex h-9 w-full items-center justify-center rounded-full px-4 text-sm font-semibold text-white"
              >
                Aplicar período
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
