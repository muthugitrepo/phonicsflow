export const THEMES = [
  { value: "light", label: "Light", swatch: ["#ffffff", "#2a78d6", "#f7f7f4"] },
  { value: "dark", label: "Dark", swatch: ["#1a1a19", "#3987e5", "#0d0d0d"] },
  { value: "warm", label: "Warm", swatch: ["#fffdf8", "#b45309", "#faf4e8"] },
  { value: "ocean", label: "Ocean", swatch: ["#ffffff", "#0f766e", "#f2f7f7"] },
] as const;

export type ThemeName = (typeof THEMES)[number]["value"];

export const DEFAULT_THEME: ThemeName = "light";
export const THEME_STORAGE_KEY = "phonicsflow-theme";

export function isThemeName(value: unknown): value is ThemeName {
  return THEMES.some((theme) => theme.value === value);
}

/**
 * Runs before first paint, inlined in <head>, so the stored theme is applied
 * without a flash of the default palette. Kept dependency-free and tiny.
 */
export const THEME_BOOTSTRAP_SCRIPT = `
(function(){try{
  var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
  var allowed=${JSON.stringify(THEMES.map((t) => t.value))};
  document.documentElement.dataset.theme=allowed.indexOf(t)>-1?t:${JSON.stringify(DEFAULT_THEME)};
}catch(e){document.documentElement.dataset.theme=${JSON.stringify(DEFAULT_THEME)};}})();
`.trim();
