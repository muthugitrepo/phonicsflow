"use client";

import { useSyncExternalStore } from "react";
import { toISODate } from "./utils";

const subscribe = () => () => {};
const getSnapshot = () => toISODate();
const getServerSnapshot = () => null;

/**
 * Today's date in the *viewer's* timezone, as yyyy-mm-dd.
 *
 * The server cannot know that timezone — on Vercel it is UTC, which disagrees
 * with (say) IST about what day it is for 5.5 hours out of every 24. Returning
 * null for the server snapshot lets React render a placeholder, hydrate against
 * that same placeholder, and only then swap in the real local date. That is
 * what keeps the markup matching without a state-syncing effect.
 */
export function useToday(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
