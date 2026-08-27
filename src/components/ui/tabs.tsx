"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: string;
  count?: number;
}

export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn("flex gap-1 overflow-x-auto rounded-lg bg-plane p-1", className)}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-surface text-ink shadow-xs" : "text-ink-2 hover:text-ink",
            )}
          >
            {item.label}
            {item.count !== undefined ? (
              <span className="ml-1.5 text-xs text-muted">{item.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
