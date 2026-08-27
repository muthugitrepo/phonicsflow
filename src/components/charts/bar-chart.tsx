"use client";

import * as React from "react";
import { ChartFrame, type ChartDatum } from "./chart-frame";
import { EmptyState } from "@/components/ui/states";

/**
 * Horizontal bars — the form for magnitude across named categories, where the
 * names need room to be read. Every bar carries a direct value label, so the
 * fill colour is decoration rather than the only channel.
 */
export function BarChart({
  title,
  subtitle,
  data,
  valueLabel,
  formatValue = (value: number) => String(value),
  series = 1,
  emptyMessage = "No data yet",
}: {
  title: string;
  subtitle?: string;
  data: ChartDatum[];
  valueLabel?: string;
  formatValue?: (value: number) => string;
  series?: 1 | 2 | 3;
  emptyMessage?: string;
}) {
  const max = Math.max(1, ...data.map((item) => item.value));
  const color = `var(--series-${series})`;

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      data={data}
      valueLabel={valueLabel}
      formatValue={formatValue}
    >
      {data.length === 0 ? (
        <EmptyState title={emptyMessage} />
      ) : (
        <ul className="space-y-2.5">
          {data.map((item) => (
            <li key={item.label} className="group">
              <div className="flex items-baseline justify-between gap-3 pb-1">
                <span className="truncate text-xs text-[var(--text-secondary)]" title={item.label}>
                  {item.label}
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--text-primary)]">
                  {formatValue(item.value)}
                </span>
              </div>
              <div
                className="h-2 w-full rounded-full bg-[var(--gridline)]"
                title={item.hint ?? `${item.label}: ${formatValue(item.value)}`}
              >
                <div
                  className="h-2 rounded-r-[4px] transition-[width] duration-300"
                  style={{
                    width: `${Math.max(item.value > 0 ? 2 : 0, (item.value / max) * 100)}%`,
                    background: color,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </ChartFrame>
  );
}
