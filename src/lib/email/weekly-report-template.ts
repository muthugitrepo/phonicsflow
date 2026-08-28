import { formatDate } from "@/lib/utils";
import type { WeeklySummary, WeeklyTrainerRow } from "@/lib/reports/weekly";

/*
 * Email HTML, not web HTML. Gmail and Outlook strip <style> blocks and ignore
 * flexbox/grid, so everything here is tables with inline styles. Keep it that
 * way when editing.
 */

const INK = "#0b0b0b";
const INK_2 = "#52514e";
const MUTED = "#898781";
const LINE = "#e6e5df";
const BRAND = "#2a78d6";
const GOOD = "#0ca30c";
const WARN = "#b07800";

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

function statTile(label: string, value: string, tone = INK) {
  return `
    <td width="25%" style="padding:0 6px 12px 0;vertical-align:top;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="border:1px solid ${LINE};border-radius:10px;background:#ffffff;">
        <tr><td style="padding:12px 14px;">
          <div style="font:500 11px/1.3 system-ui,-apple-system,'Segoe UI',sans-serif;color:${INK_2};">${escape(label)}</div>
          <div style="font:600 22px/1.2 system-ui,-apple-system,'Segoe UI',sans-serif;color:${tone};padding-top:5px;">${escape(value)}</div>
        </td></tr>
      </table>
    </td>`;
}

function trainerRow(row: WeeklyTrainerRow, index: number) {
  const cell = `padding:9px 10px;border-top:1px solid ${LINE};font:400 13px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif;color:${INK_2};`;
  const background = index % 2 === 1 ? "background:#faf9f7;" : "";
  return `
    <tr style="${background}">
      <td style="${cell}color:${INK};font-weight:500;">${escape(row.name)}</td>
      <td align="right" style="${cell}">${row.students}</td>
      <td align="right" style="${cell}">${row.classesCompleted}</td>
      <td align="right" style="${cell}">${row.attendanceRate === null ? "&mdash;" : `${row.attendanceRate}%`}</td>
      <td align="right" style="${cell}">${row.videosPosted}</td>
      <td align="right" style="${cell}${row.reportSubmitted ? `color:${GOOD};` : `color:${WARN};font-weight:600;`}">
        ${row.reportSubmitted ? "Yes" : "No"}
      </td>
    </tr>`;
}

function section(title: string, body: string) {
  return `
    <tr><td style="padding:22px 0 8px 0;">
      <div style="font:600 14px/1.3 system-ui,-apple-system,'Segoe UI',sans-serif;color:${INK};">${escape(title)}</div>
    </td></tr>
    <tr><td>${body}</td></tr>`;
}

function bulletList(items: string[], emptyMessage: string, tone = INK_2) {
  if (items.length === 0) {
    return `<div style="font:400 13px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;color:${GOOD};">${escape(emptyMessage)}</div>`;
  }
  return `<div style="font:400 13px/1.6 system-ui,-apple-system,'Segoe UI',sans-serif;color:${tone};">
      ${items.map((item) => `&bull; ${escape(item)}`).join("<br />")}
    </div>`;
}

export function weeklyReportSubject(summary: WeeklySummary) {
  const scope = summary.scopeLabel ? `${summary.scopeLabel} — ` : "";
  return `PhonicsFlow weekly report — ${scope}week ending ${formatDate(summary.to)}`;
}

/** Plain-text alternative. Some clients show it, and spam filters like it. */
export function weeklyReportText(summary: WeeklySummary) {
  const lines = [
    `PhonicsFlow weekly report`,
    ...(summary.scopeLabel ? [summary.scopeLabel] : []),
    `${formatDate(summary.from)} to ${formatDate(summary.to)}`,
    ``,
    `Classes completed: ${summary.classesCompleted} of ${summary.classesScheduled} scheduled`,
    `Attendance: ${summary.attendanceRate === null ? "not marked" : `${summary.attendanceRate}%`}`,
    `Active students: ${summary.activeStudents}`,
    `Videos posted: ${summary.trainers.reduce((sum, t) => sum + t.videosPosted, 0)}`,
    `Homework: ${summary.homeworkCorrected} corrected of ${summary.homeworkAssigned} assigned` +
      (summary.homeworkOverdue > 0 ? ` (${summary.homeworkOverdue} overdue)` : ""),
    `Parent contacts: ${summary.parentContacts}`,
    `Parent feedback: ${summary.parentFeedback} received, ${summary.feedbackUnreviewed} unreviewed`,
    ``,
    `Trainers:`,
    ...summary.trainers.map(
      (t) =>
        `  ${t.name} — ${t.students} students, ${t.classesCompleted} classes, ` +
        `${t.videosPosted} videos, weekly report ${t.reportSubmitted ? "submitted" : "MISSING"}`,
    ),
  ];

  if (summary.missingReports.length > 0) {
    lines.push(``, `Weekly reports not submitted: ${summary.missingReports.join(", ")}`);
  }
  if (summary.studentsWithoutContact.length > 0) {
    lines.push(``, `No parent contact this week: ${summary.studentsWithoutContact.join(", ")}`);
  }
  return lines.join("\n");
}

export function weeklyReportHtml(summary: WeeklySummary, appUrl?: string) {
  const totalVideos = summary.trainers.reduce((sum, t) => sum + t.videosPosted, 0);
  const headCell = `padding:0 10px 8px 10px;font:600 11px/1.3 system-ui,-apple-system,'Segoe UI',sans-serif;color:${MUTED};text-transform:uppercase;letter-spacing:0.04em;`;

  const issues = summary.trainers.filter((t) => t.issues);

  return `<!doctype html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escape(weeklyReportSubject(summary))}</title></head>
<body style="margin:0;padding:0;background:#f7f7f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f4;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;">

        <tr><td style="padding-bottom:16px;">
          <div style="font:700 16px/1.2 system-ui,-apple-system,'Segoe UI',sans-serif;color:${BRAND};">PhonicsFlow</div>
          <div style="font:600 20px/1.3 system-ui,-apple-system,'Segoe UI',sans-serif;color:${INK};padding-top:6px;">
            Weekly report${summary.scopeLabel ? ` &middot; ${escape(summary.scopeLabel)}` : ""}
          </div>
          <div style="font:400 13px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif;color:${INK_2};padding-top:3px;">
            ${escape(formatDate(summary.from))} &ndash; ${escape(formatDate(summary.to))}
          </div>
        </td></tr>

        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              ${statTile("Classes completed", String(summary.classesCompleted))}
              ${statTile("Attendance", summary.attendanceRate === null ? "—" : `${summary.attendanceRate}%`, summary.attendanceRate !== null && summary.attendanceRate < 85 ? WARN : INK)}
              ${statTile("Active students", String(summary.activeStudents))}
              ${statTile("Videos posted", String(totalVideos))}
            </tr>
            <tr>
              ${statTile("Homework corrected", `${summary.homeworkCorrected}/${summary.homeworkAssigned}`)}
              ${statTile("Homework overdue", String(summary.homeworkOverdue), summary.homeworkOverdue > 0 ? WARN : INK)}
              ${statTile("Parent contacts", String(summary.parentContacts))}
              ${statTile("Feedback unreviewed", String(summary.feedbackUnreviewed), summary.feedbackUnreviewed > 0 ? WARN : INK)}
            </tr>
          </table>
        </td></tr>

        ${section(
          "By trainer",
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                  style="border:1px solid ${LINE};border-radius:10px;background:#ffffff;border-collapse:separate;">
             <tr>
               <td style="${headCell}padding-top:12px;">Trainer</td>
               <td align="right" style="${headCell}padding-top:12px;">Students</td>
               <td align="right" style="${headCell}padding-top:12px;">Classes</td>
               <td align="right" style="${headCell}padding-top:12px;">Att.</td>
               <td align="right" style="${headCell}padding-top:12px;">Videos</td>
               <td align="right" style="${headCell}padding-top:12px;">Reported</td>
             </tr>
             ${
               summary.trainers.length === 0
                 ? `<tr><td colspan="6" style="padding:14px 10px;border-top:1px solid ${LINE};font:400 13px system-ui,sans-serif;color:${MUTED};">No trainers on the roster.</td></tr>`
                 : summary.trainers.map(trainerRow).join("")
             }
           </table>`,
        )}

        ${section(
          "Weekly submissions outstanding",
          bulletList(summary.missingReports, "All trainers submitted their weekly details.", WARN),
        )}

        ${section(
          "Students with no parent contact this week",
          bulletList(
            summary.studentsWithoutContact,
            "Every active student's parent was contacted.",
            WARN,
          ),
        )}

        ${
          issues.length > 0
            ? section(
                "Issues raised by trainers",
                issues
                  .map(
                    (t) => `<div style="border:1px solid ${LINE};border-radius:10px;background:#ffffff;padding:12px 14px;margin-bottom:8px;">
                      <div style="font:600 13px/1.3 system-ui,-apple-system,'Segoe UI',sans-serif;color:${INK};">${escape(t.name)}</div>
                      <div style="font:400 13px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;color:${INK_2};padding-top:4px;">${escape(t.issues!)}</div>
                    </div>`,
                  )
                  .join(""),
              )
            : ""
        }

        ${
          appUrl
            ? `<tr><td style="padding:20px 0 0 0;">
                 <a href="${escape(appUrl)}/dashboard"
                    style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;
                           font:600 13px/1 system-ui,-apple-system,'Segoe UI',sans-serif;
                           padding:11px 18px;border-radius:8px;">Open PhonicsFlow</a>
               </td></tr>`
            : ""
        }

        <tr><td style="padding:22px 0 0 0;">
          <div style="font:400 11px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;color:${MUTED};border-top:1px solid ${LINE};padding-top:12px;">
            Sent automatically by PhonicsFlow every Sunday evening.
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}
