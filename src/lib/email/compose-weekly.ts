import "server-only";

import { buildWeeklySummary, resolveWeek, type WeeklyScope } from "@/lib/reports/weekly";
import {
  weeklyReportHtml,
  weeklyReportSubject,
  weeklyReportText,
} from "./weekly-report-template";

/** Subject and body are always derived from the data — never typed by hand. */
export async function composeWeeklyEmail(week?: string | null, scope?: WeeklyScope) {
  const reference = week ? new Date(`${week}T12:00:00`) : new Date();
  const { from, to } = resolveWeek(reference);
  const summary = await buildWeeklySummary(from, to, scope);

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined);

  return {
    week: { from, to },
    summary,
    subject: weeklyReportSubject(summary),
    html: weeklyReportHtml(summary, appUrl),
    text: weeklyReportText(summary),
  };
}
