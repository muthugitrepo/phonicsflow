"use client";

import * as React from "react";
import { Table2, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChartDatum {
  label: string;
  value: number;
  hint?: string;
}

/**
 * Shared chrome for every chart: title, the .viz-root token scope, and the
 * table view. The table is not optional polish — several palette slots sit
 * below 3:1 on the light surface, so a non-colour reading has to exist.
 */
export function ChartFrame({
  title,
  subtitle,
  data,
  valueLabel = "Value",
  formatValue = (value: number) => String(value),
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  data: ChartDatum[];
  valueLabel?: string;
  formatValue?: (value: number) => string;
  children: React.ReactNode;
  className?: string;
}) {
  const [showTable, setShowTable] = React.useState(false);

  return (
    <section className={cn("viz-root rounded-card border border-line bg-surface", className)}>
      <header className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5">
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-ink-2">{subtitle}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => setShowTable((current) => !current)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-ink-2 hover:bg-plane hover:text-ink"
          aria-pressed={showTable}
        >
          {showTable ? (
            <>
              <BarChart3 className="h-3.5 w-3.5" /> Chart
            </>
          ) : (
            <>
              <Table2 className="h-3.5 w-3.5" /> Table
            </>
          )}
        </button>
      </header>

      <div className="px-4 pb-4 pt-3 sm:px-5">
        {showTable ? (
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="py-1.5 pr-3 font-medium">
                    Label
                  </th>
                  <th scope="col" className="py-1.5 text-right font-medium">
                    {valueLabel}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.label} className="border-t border-line">
                    <td className="py-1.5 pr-3 text-ink">{row.label}</td>
                    <td className="py-1.5 text-right tabular-nums text-ink">
                      {formatValue(row.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
