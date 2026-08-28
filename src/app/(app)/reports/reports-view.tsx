"use client";

import * as React from "react";
import { FileText, Loader2, Mail, Printer, Send, Sparkles } from "lucide-react";
import {
  useGenerateMonthlyReport,
  useMonthlyReports,
  useSubmitMonthlyReport,
} from "@/lib/queries/reports";
import { useClasses } from "@/lib/queries/classes";
import { useHomework } from "@/lib/queries/homework";
import { useStudents } from "@/lib/queries/students";
import { useTrainerDetails, useSubmitTrainerDetail } from "@/lib/queries/trainers";
import { WeeklyEmailModal } from "@/components/features/weekly-email-modal";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/charts/stat-tile";
import { BarChart } from "@/components/charts/bar-chart";
import { LineChart } from "@/components/charts/line-chart";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { EmptyState, LoadingRows } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import {
  formatDate,
  formatShortDate,
  monthName,
  startOfWeek,
  toISODate,
  weekEnding,
} from "@/lib/utils";
import type { MonthlyReport, MonthlySummary, Profile, TrainerDetail } from "@/lib/types";

export function ReportsView({ profile }: { profile: Profile }) {
  return profile.role === "team_head" ? (
    <TeamHeadReports profile={profile} />
  ) : (
    <TrainerReports profile={profile} />
  );
}

// ---------------------------------------------------------------------------
// Team head — monthly report generation and submission
// ---------------------------------------------------------------------------
function TeamHeadReports({ profile }: { profile: Profile }) {
  const now = new Date();
  const [year, setYear] = React.useState(now.getFullYear());
  const [month, setMonth] = React.useState(now.getMonth() + 1);
  const reports = useMonthlyReports();
  const generate = useGenerateMonthlyReport();
  const { toast } = useToast();
  const [emailOpen, setEmailOpen] = React.useState(false);

  const selected = (reports.data ?? []).find(
    (report) => report.year === year && report.month === month,
  );
  const summary = selected?.summary_data as MonthlySummary | undefined;

  const onGenerate = async () => {
    try {
      await generate.mutateAsync({ year, month });
      toast(`${monthName(month)} ${year} report generated`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not generate the report", "error");
    }
  };

  return (
    <>
      <PageHeader
        title="Reports"
        description="Aggregate the month, review the trends, submit to the Head."
        actions={
          <>
            <Button variant="secondary" className="no-print" onClick={() => setEmailOpen(true)}>
              <Mail className="h-4 w-4" /> Email weekly report
            </Button>
            <Button variant="secondary" className="no-print" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button onClick={onGenerate} disabled={generate.isPending}>
              {generate.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-2 no-print">
        <Field label="Month" htmlFor="report_month" className="w-40">
          <Select
            id="report_month"
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>
                {monthName(value)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Year" htmlFor="report_year" className="w-28">
          <Input
            id="report_year"
            type="number"
            min={2020}
            max={2100}
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          />
        </Field>
      </div>

      {reports.isLoading ? (
        <Card>
          <LoadingRows rows={3} />
        </Card>
      ) : !summary ? (
        <Card>
          <EmptyState
            icon={FileText}
            title={`No report for ${monthName(month)} ${year} yet`}
            description="Generate one to pull together classes, attendance, videos and parent feedback."
            action={
              <Button size="sm" onClick={onGenerate}>
                Generate report
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-ink">
              {monthName(summary.month)} {summary.year}
            </h2>
            {selected?.status === "submitted" ? (
              <Badge tone="good">
                Submitted {selected.submitted_at ? formatDate(selected.submitted_at.slice(0, 10)) : ""}
              </Badge>
            ) : (
              <Badge tone="warning">Draft</Badge>
            )}
            <span className="text-xs text-muted">
              Generated {formatDate(selected!.generated_at.slice(0, 10))}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Classes completed" value={summary.classesCompleted} />
            <StatTile
              label="Attendance"
              value={`${summary.attendanceRate}%`}
              tone={summary.attendanceRate >= 85 ? "good" : "warning"}
            />
            <StatTile label="Videos posted" value={summary.videosPosted} />
            <StatTile label="Parent feedback" value={summary.parentFeedbackCount} />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Active trainers" value={summary.activeTrainers} />
            <StatTile label="Active students" value={summary.activeStudents} />
            <StatTile label="Homework corrected" value={summary.homeworkCorrected} />
            <StatTile
              label="Classes cancelled"
              value={summary.classesCancelled}
              tone={summary.classesCancelled > 0 ? "warning" : "neutral"}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <BarChart
              title="Classes completed by trainer"
              data={summary.perTrainer.map((row) => ({ label: row.name, value: row.classesCompleted }))}
              valueLabel="Classes"
            />
            <BarChart
              title="Videos posted by trainer"
              data={summary.perTrainer.map((row) => ({ label: row.name, value: row.videosPosted }))}
              valueLabel="Videos"
              series={2}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Per-trainer detail</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-medium sm:px-5">Trainer</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Students</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Classes</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Videos</th>
                    <th scope="col" className="px-4 py-2 text-right font-medium sm:px-5">Weekly reports</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.perTrainer.map((row) => (
                    <tr key={row.trainerId} className="border-b border-line last:border-0">
                      <td className="px-4 py-2 text-ink sm:px-5">{row.name}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-2">{row.students}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-2">{row.classesCompleted}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-2">{row.videosPosted}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-ink-2 sm:px-5">
                        {row.weeklyReportsSubmitted}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <ReportNotesCard key={selected!.id} report={selected!} />

          <PastReports reports={reports.data ?? []} />
        </div>
      )}

      <WeeklyEmailModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        profile={profile}
      />
    </>
  );
}

/** Keyed by report id, so switching months remounts with the right notes. */
function ReportNotesCard({ report }: { report: MonthlyReport }) {
  const [notes, setNotes] = React.useState(report.notes ?? "");
  const submit = useSubmitMonthlyReport();
  const { toast } = useToast();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes for the Head</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <Textarea
          rows={4}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Highlights, risks, support needed"
          aria-label="Notes for the Head"
        />
        <Button
          className="no-print"
          onClick={async () => {
            await submit.mutateAsync({ id: report.id, notes });
            toast("Report marked as submitted");
          }}
          disabled={submit.isPending}
        >
          {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Mark as submitted
        </Button>
      </CardBody>
    </Card>
  );
}

function PastReports({ reports }: { reports: MonthlyReport[] }) {
  if (reports.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report history</CardTitle>
      </CardHeader>
      <ul className="divide-y divide-line">
        {reports.map((report) => (
          <li key={report.id} className="flex items-center justify-between gap-2 px-4 py-2.5 sm:px-5">
            <span className="text-sm text-ink">
              {monthName(report.month)} {report.year}
            </span>
            <Badge tone={report.status === "submitted" ? "good" : "warning"}>{report.status}</Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Trainer — own weekly submission plus personal analytics
// ---------------------------------------------------------------------------
function TrainerReports({ profile }: { profile: Profile }) {
  const isLead = profile.role === "lead_trainer";
  const [emailOpen, setEmailOpen] = React.useState(false);
  const thisWeekEnding = React.useMemo(() => toISODate(weekEnding()), []);
  const historyStart = React.useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 8 * 7);
    return toISODate(start);
  }, []);
  const weekStart = React.useMemo(() => toISODate(startOfWeek()), []);

  const students = useStudents();
  const classes = useClasses({ from: historyStart, to: toISODate() });
  const homework = useHomework();
  const details = useTrainerDetails({ trainerId: profile.id });

  const thisWeek = (details.data ?? []).find((row) => row.week_ending_date === thisWeekEnding);

  const sessions = classes.data ?? [];
  const completed = sessions.filter((session) => session.status === "completed");
  const corrected = (homework.data ?? []).filter((item) => item.status === "corrected");

  const weeklyClasses = React.useMemo(() => {
    const buckets = new Map<string, number>();
    for (const session of completed) {
      const date = new Date(`${session.scheduled_date}T00:00:00`);
      date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
      const key = toISODate(date);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, value]) => ({ label: formatShortDate(week), value }));
  }, [completed]);

  return (
    <>
      <PageHeader
        title={isLead ? "Team reports" : "My reports"}
        description={
          isLead
            ? `Your team's week ending ${formatDate(thisWeekEnding)} — submit your own details, or email the summary on.`
            : `Weekly submission for the week ending ${formatDate(thisWeekEnding)}.`
        }
        actions={
          isLead ? (
            <Button variant="secondary" onClick={() => setEmailOpen(true)}>
              <Mail className="h-4 w-4" /> Email weekly report
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Students" value={students.data?.length ?? 0} />
        <StatTile label="Classes (8 weeks)" value={completed.length} />
        <StatTile label="Homework corrected" value={corrected.length} />
        <StatTile
          label="This week's report"
          value={thisWeek ? "Submitted" : "Pending"}
          tone={thisWeek ? "good" : "warning"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <WeeklyDetailCard
          key={thisWeek?.id ?? "new"}
          trainerId={profile.id}
          weekEndingDate={thisWeekEnding}
          existing={thisWeek ?? null}
          studentsCount={students.data?.length ?? 0}
          classesThisWeek={
            completed.filter((session) => session.scheduled_date >= weekStart).length
          }
        />

        <LineChart
          title="Classes completed per week"
          subtitle="Last 8 weeks"
          data={weeklyClasses}
          valueLabel="Classes"
        />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Submission history</CardTitle>
        </CardHeader>
        {(details.data ?? []).length === 0 ? (
          <EmptyState title="No weekly reports submitted yet" />
        ) : (
          <ul className="divide-y divide-line">
            {(details.data ?? []).map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-2 px-4 py-2.5 sm:px-5">
                <span className="text-sm text-ink">Week ending {formatDate(row.week_ending_date)}</span>
                <span className="text-xs text-muted">
                  {row.videos_posted} videos · {row.students_count} students
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <WeeklyEmailModal open={emailOpen} onClose={() => setEmailOpen(false)} profile={profile} />
    </>
  );
}

/**
 * A trainer's own weekly submission. Remounted when the stored row changes, so
 * the fields track the server without a syncing effect.
 */
function WeeklyDetailCard({
  trainerId,
  weekEndingDate,
  existing,
  studentsCount,
  classesThisWeek,
}: {
  trainerId: string;
  weekEndingDate: string;
  existing: TrainerDetail | null;
  studentsCount: number;
  classesThisWeek: number;
}) {
  const [videos, setVideos] = React.useState(existing?.videos_posted ?? 0);
  const [issues, setIssues] = React.useState(existing?.issues_notes ?? "");
  const submitDetail = useSubmitTrainerDetail();
  const { toast } = useToast();

  const submit = async () => {
    try {
      await submitDetail.mutateAsync({
        trainer_id: trainerId,
        week_ending_date: weekEndingDate,
        videos_posted: videos,
        students_count: studentsCount,
        classes_conducted: classesThisWeek,
        issues_notes: issues || null,
      });
      toast("Weekly report submitted");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not submit the report", "error");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly trainer details</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <Field label="Videos posted this week" htmlFor="videos">
          <Input
            id="videos"
            type="number"
            min={0}
            value={videos}
            onChange={(event) => setVideos(Number(event.target.value))}
          />
        </Field>
        <Field label="Issues or support needed" htmlFor="issues">
          <Textarea
            id="issues"
            rows={4}
            value={issues}
            onChange={(event) => setIssues(event.target.value)}
            placeholder="Anything the team head should know about"
          />
        </Field>
        <Button onClick={submit} disabled={submitDetail.isPending}>
          {submitDetail.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {existing ? "Update submission" : "Submit"}
        </Button>
      </CardBody>
    </Card>
  );
}
