"use client";

import * as React from "react";
import { Check, Palette } from "lucide-react";
import {
  DEFAULT_THEME,
  THEMES,
  THEME_STORAGE_KEY,
  isThemeName,
  type ThemeName,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

const THEME_EVENT = "phonicsflow:theme";

function subscribe(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/**
 * The <html data-theme> attribute is the source of truth — the bootstrap script
 * sets it before paint. Reading it through useSyncExternalStore keeps the server
 * render and hydration consistent without a state-syncing effect.
 */
export function useTheme(): [ThemeName, (theme: ThemeName) => void] {
  const theme = React.useSyncExternalStore(
    subscribe,
    () => {
      const current = document.documentElement.dataset.theme;
      return isThemeName(current) ? current : DEFAULT_THEME;
    },
    () => DEFAULT_THEME,
  );

  const setTheme = React.useCallback((next: ThemeName) => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private browsing: the theme still applies for this session.
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return [theme, setTheme];
}

/** Compact swatch row — used in the sidebar and on the Configuration page. */
export function ThemePicker({ className }: { className?: string }) {
  const [theme, setTheme] = useTheme();

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)} role="radiogroup" aria-label="Theme">
      {THEMES.map((option) => {
        const active = option.value === theme;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.label}
            onClick={() => setTheme(option.value)}
            className={cn(
              "relative flex h-8 items-center gap-1.5 rounded-lg border px-2 text-xs font-medium transition-colors",
              active
                ? "border-brand text-ink ring-2 ring-brand-ring"
                : "border-line text-ink-2 hover:bg-plane",
            )}
          >
            <span className="flex h-4 w-4 overflow-hidden rounded-full ring-1 ring-line">
              {option.swatch.map((color) => (
                <span key={color} style={{ background: color, width: "33.34%" }} />
              ))}
            </span>
            {option.label}
            {active ? <Check className="h-3 w-3 text-brand" /> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Icon-only trigger for tight spaces; cycles through the themes in order. */
export function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  const index = THEMES.findIndex((option) => option.value === theme);
  const next = THEMES[(index + 1) % THEMES.length];

  return (
    <button
      type="button"
      onClick={() => setTheme(next.value)}
      aria-label={`Switch theme (currently ${THEMES[index]?.label ?? "Light"})`}
      title={`Theme: ${THEMES[index]?.label ?? "Light"}`}
      className="grid h-9 w-9 place-items-center rounded-lg text-ink-2 hover:bg-plane hover:text-ink"
    >
      <Palette className="h-4 w-4" />
    </button>
  );
}
