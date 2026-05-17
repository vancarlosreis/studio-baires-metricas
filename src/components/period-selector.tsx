"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PRESETS, resolvePeriod, formatDateBR } from "@/lib/period";

export function PeriodSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentPreset = searchParams.get("periodo") ?? "30d";
  const customDe = searchParams.get("de") ?? undefined;
  const customAte = searchParams.get("ate") ?? undefined;
  const period = resolvePeriod(currentPreset, customDe, customAte);

  // Estados pro form de custom
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
    params.delete("de");
    params.delete("ate");
    router.push(`?${params.toString()}`);
    setOpen(false);
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
        className="inline-flex h-10 items-center gap-2 rounded-full border border-ink/15 bg-paper px-4 text-sm font-semibold text-ink transition-colors hover:border-ink/40"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
        >
          <path d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2zM4.75 5.5A1.25 1.25 0 0 0 3.5 6.75V8h13V6.75a1.25 1.25 0 0 0-1.25-1.25H4.75zM3.5 9.5v5.75c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25V9.5h-13z" />
        </svg>
        <span>{period.label}</span>
        <span className="hidden text-xs text-ink-soft sm:inline">
          ({formatDateBR(period.start)} → {formatDateBR(period.end)})
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.4a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-40 w-[420px] rounded-2xl border border-ink/10 bg-paper p-4 shadow-lg"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Período de análise
          </p>

          <div className="grid grid-cols-2 gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => selectPreset(p.value)}
                className={`rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${
                  currentPreset === p.value
                    ? "bg-ink text-cream"
                    : "text-ink hover:bg-cream"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {currentPreset === "custom" && (
            <div className="mt-4 border-t border-ink/10 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                    De
                  </span>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="mt-1 w-full rounded-full border border-ink/15 bg-cream px-3 py-1.5 text-sm text-ink outline-none focus:border-ink/40"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                    Até
                  </span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="mt-1 w-full rounded-full border border-ink/15 bg-cream px-3 py-1.5 text-sm text-ink outline-none focus:border-ink/40"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={applyCustom}
                className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-full bg-forest px-4 text-sm font-semibold text-cream hover:bg-forest-soft"
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
