import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A single headline number is not a chart — it is a tile. Values use the
 * default proportional figures; the label carries the meaning.
 */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "neutral" | "good" | "warning" | "critical";
}) {
  return (
    <div className="rounded-card border border-line bg-surface px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-ink-2">{label}</span>
        {Icon ? <Icon className="h-4 w-4 text-muted" /> : null}
      </div>
      <p
        className={cn(
          "mt-1.5 text-2xl font-semibold leading-none",
          tone === "neutral" && "text-ink",
          tone === "good" && "text-[#006300]",
          tone === "warning" && "text-[#7a5300]",
          tone === "critical" && "text-[#a02525]",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

/** Labelled percentage bar. Always ships its own number — never colour alone. */
export function ProgressMeter({
  label,
  value,
  series = 1,
  caption,
}: {
  label: string;
  value: number;
  series?: 1 | 2 | 3;
  caption?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="viz-root">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-ink-2">{label}</span>
        <span className="text-xs font-semibold tabular-nums text-ink">{pct}%</span>
      </div>
      <div
        className="mt-1.5 h-2 w-full rounded-full bg-[var(--gridline)]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-2 rounded-r-[4px] transition-[width] duration-300"
          style={{ width: `${pct}%`, background: `var(--series-${series})` }}
        />
      </div>
      {caption ? <p className="mt-1 text-xs text-muted">{caption}</p> : null}
    </div>
  );
}
