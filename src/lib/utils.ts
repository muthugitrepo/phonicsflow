import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** ISO date (yyyy-mm-dd) for a Date, in local time rather than UTC. */
export function toISODate(date: Date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

/** Monday-based start of the week containing `date`. */
export function startOfWeek(date: Date = new Date()) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Sunday that ends the week containing `date`. */
export function weekEnding(date: Date = new Date()) {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  return d;
}

/**
 * Dates are formatted against a fixed locale, never the ambient one. Node and
 * the browser resolve `undefined` differently (ICU default vs browser setting),
 * which renders different text on each side and breaks hydration.
 */
export const DATE_LOCALE = "en-GB";

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString(DATE_LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatShortDate(value?: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString(DATE_LOCALE, {
    day: "numeric",
    month: "short",
  });
}

/** "14:30:00" -> "2:30 PM" */
export function formatTime(value?: string | null) {
  if (!value) return "—";
  const [h, m] = value.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${m} ${suffix}`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function monthName(month: number) {
  return new Date(2000, month - 1, 1).toLocaleDateString(DATE_LOCALE, { month: "long" });
}
