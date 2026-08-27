"use client";

import * as React from "react";
import { ChartFrame, type ChartDatum } from "./chart-frame";
import { EmptyState } from "@/components/ui/states";

const W = 640;
const H = 200;
const PAD = { top: 12, right: 12, bottom: 24, left: 32 };

/**
 * Single-series trend line with a crosshair + tooltip. One series means no
 * legend box — the chart title names it.
 */
export function LineChart({
  title,
  subtitle,
  data,
  valueLabel,
  formatValue = (value: number) => String(value),
  series = 1,
  maxValue,
  emptyMessage = "Not enough history yet",
}: {
  title: string;
  subtitle?: string;
  data: ChartDatum[];
  valueLabel?: string;
  formatValue?: (value: number) => string;
  series?: 1 | 2 | 3;
  maxValue?: number;
  emptyMessage?: string;
}) {
  const [active, setActive] = React.useState<number | null>(null);
  const color = `var(--series-${series})`;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const max = Math.max(maxValue ?? 0, 1, ...data.map((item) => item.value));

  const pointAt = (index: number, value: number) => ({
    x: PAD.left + (data.length === 1 ? plotW / 2 : (index / (data.length - 1)) * plotW),
    y: PAD.top + plotH - (value / max) * plotH,
  });

  const points = data.map((item, index) => pointAt(index, item.value));
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
  const areaPath =
    points.length > 0
      ? `${path} L${points[points.length - 1].x} ${PAD.top + plotH} L${points[0].x} ${
          PAD.top + plotH
        } Z`
      : "";

  const ticks = [0, 0.5, 1].map((fraction) => ({
    value: Math.round(max * fraction),
    y: PAD.top + plotH - fraction * plotH,
  }));

  const onMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (data.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const index = Math.round(ratio * W - PAD.left) / plotW;
    setActive(Math.min(data.length - 1, Math.max(0, Math.round(index * (data.length - 1)))));
  };

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
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-48 w-full touch-none"
            role="img"
            aria-label={`${title}. ${data
              .map((item) => `${item.label}: ${formatValue(item.value)}`)
              .join(", ")}`}
            onMouseMove={onMove}
            onMouseLeave={() => setActive(null)}
          >
            {ticks.map((tick) => (
              <g key={tick.y}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={tick.y}
                  y2={tick.y}
                  stroke="var(--gridline)"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={PAD.left - 6}
                  y={tick.y + 3}
                  textAnchor="end"
                  className="fill-[var(--text-muted)] text-[9px] tabular-nums"
                >
                  {tick.value}
                </text>
              </g>
            ))}

            <path d={areaPath} fill={color} opacity={0.08} />
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />

            {points.map((point, index) => (
              <circle
                key={data[index].label + index}
                cx={point.x}
                cy={point.y}
                r={active === index ? 5 : 3.5}
                fill={color}
                stroke="var(--surface-1)"
                strokeWidth={2}
              />
            ))}

            {active !== null ? (
              <line
                x1={points[active].x}
                x2={points[active].x}
                y1={PAD.top}
                y2={PAD.top + plotH}
                stroke="var(--baseline)"
                strokeWidth={1}
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}

            {data.map((item, index) =>
              index === 0 || index === data.length - 1 || index === active ? (
                <text
                  key={`x-${item.label}-${index}`}
                  x={points[index].x}
                  y={H - 6}
                  textAnchor={index === 0 ? "start" : index === data.length - 1 ? "end" : "middle"}
                  className="fill-[var(--text-muted)] text-[9px]"
                >
                  {item.label}
                </text>
              ) : null,
            )}
          </svg>

          {active !== null ? (
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md border border-line bg-surface px-2 py-1 text-xs shadow-md"
              style={{
                left: `${(points[active].x / W) * 100}%`,
                top: `${(points[active].y / H) * 100}%`,
              }}
            >
              <span className="block font-medium text-ink">{data[active].label}</span>
              <span className="tabular-nums text-ink-2">{formatValue(data[active].value)}</span>
            </div>
          ) : null}
        </div>
      )}
    </ChartFrame>
  );
}
