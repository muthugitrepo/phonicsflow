"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  MessageSquareHeart,
  NotebookPen,
  Plus,
  Users,
} from "lucide-react";
import { useToday } from "@/lib/use-today";
import { useClasses } from "@/lib/queries/classes";
import { useStudents } from "@/lib/queries/students";
import { useHomework } from "@/lib/queries/homework";
import { useParentFeedback } from "@/lib/queries/parents";
import { useTrainerSummaries } from "@/lib/queries/trainers";
import { ClassNotesModal } from "@/components/features/class-notes-modal";
import { ClassFormModal } from "@/components/features/class-form-modal";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/charts/stat-tile";
import { BarChart } from "@/components/charts/bar-chart";
import { LineChart } from "@/components/charts/line-chart";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingRows } from "@/components/ui/states";
import { LEVEL_LABELS } from "@/lib/constants";
import { formatDate, formatShortDate, formatTime, toISODate, weekEnding } from "@/lib/utils";
import type { ClassWithStudent, Profile } from "@/lib/types";

const WEEKS_OF_HISTORY = 8;

export function DashboardView({ profile }: { profile: Profile }) {
  // Query filters may safely use the server's date (nothing is hydrated from
  // them); the *rendered* date must come from the viewer's clock.
  const viewerToday = useToday();
  const today = React.useMemo(() => toISODate(), []);
  const thisWeekEnding = React.useMemo(() => toISODate(weekEnding()), []);
  const historyStart = React.useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - WEEKS_OF_HISTORY * 7);
    return toISODate(start);
  }, []);

  const isTeamHead = profile.role === "team_head";

  const todayClasses = useClasses({ date: today });
  const students = useStudents();
  const homework = useHomework();
  const feedback = useParentFeedback({ limit: 5 });
  const history = useClasses({ from: historyStart, to: today });
  const trainerSummaries = useTrainerSummaries(thisWeekEnding, isTeamHead);

  const [notesSession, setNotesSession] = React.useState<ClassWithStudent | null>(null);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);

  const pendingHomework = (homework.data ?? []).filter((item) => item.status !== "corrected");
  const awaitingFeedback = (feedback.data ?? []).filter((item) => !item.acknowledged_at);

  const attendanceTrend = React.useMemo(
    () => buildAttendanceTrend(history.data ?? []),
    [history.data],
  );

  const trainerBars = React.useMemo(
    () =>
      (trainerSummaries.data ?? [])
        .map((row) => ({
          label: row.trainer.full_name,
          value: row.videosPosted,
          hint: `${row.studentCount} students`,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    [trainerSummaries.data],
  );

  const missingReports = (trainerSummaries.data ?? []).filter((row) => !row.latestReport).length;

  return (
    <>
      <PageHeader
        title={`Good day, ${profile.full_name.split(" ")[0] || "there"}`}
        description={viewerToday ? formatDate(viewerToday) : ""}
        actions={
          <>
            <Button variant="secondary" onClick={() => setScheduleOpen(true)}>
              <Plus className="h-4 w-4" /> Schedule class
            </Button>
            <Link href="/students">
              <Button variant="primary">
                <Users className="h-4 w-4" /> Students
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Classes today"
          value={todayClasses.data?.length ?? 0}
          hint={`${(todayClasses.data ?? []).filter((c) => c.status === "completed").length} completed`}
          icon={CalendarDays}
        />
        <StatTile
          label="Active students"
          value={students.data?.length ?? 0}
          icon={Users}
        />
        <StatTile
          label="Homework open"
          value={pendingHomework.length}
          hint={`${pendingHomework.filter((item) => item.status === "submitted").length} to correct`}
          icon={ClipboardList}
          tone={pendingHomework.length > 0 ? "warning" : "neutral"}
        />
        <StatTile
          label="Feedback to review"
          value={awaitingFeedback.length}
          icon={MessageSquareHeart}
          tone={awaitingFeedback.length > 0 ? "warning" : "neutral"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today&rsquo;s classes</CardTitle>
            <Link href="/classes" className="text-xs font-medium text-brand hover:underline">
              View schedule
            </Link>
          </CardHeader>
          {todayClasses.isLoading ? (
            <LoadingRows />
          ) : (todayClasses.data ?? []).length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Nothing scheduled today"
              description="Add a session to start tracking notes and homework."
              action={
                <Button size="sm" onClick={() => setScheduleOpen(true)}>
                  Schedule a class
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {(todayClasses.data ?? []).map((session) => (
                <li
                  key={session.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5"
                >
                  <span className="w-16 shrink-0 text-sm font-semibold tabular-nums text-ink">
                    {formatTime(session.scheduled_time)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/students/${session.student_id}`}
                      className="truncate text-sm font-medium text-ink hover:text-brand"
                    >
                      {session.student?.name ?? "Student"}
                    </Link>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                      <span>{session.duration_minutes} min</span>
                      {session.student?.level ? (
                        <Badge tone="neutral">{LEVEL_LABELS[session.student.level]}</Badge>
                      ) : null}
                      {session.status === "completed" ? (
                        <Badge tone="good">Completed</Badge>
                      ) : session.status === "cancelled" ? (
                        <Badge tone="critical">Cancelled</Badge>
                      ) : null}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setNotesSession(session)}>
                    <NotebookPen className="h-3.5 w-3.5" />
                    {session.status === "completed" ? "Edit notes" : "Add notes"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Needs your attention</CardTitle>
          </CardHeader>
          {homework.isLoading ? (
            <LoadingRows rows={2} />
          ) : pendingHomework.length === 0 && awaitingFeedback.length === 0 ? (
            <EmptyState title="All clear" description="No open homework or unread parent feedback." />
          ) : (
            <ul className="divide-y divide-line">
              {pendingHomework.slice(0, 4).map((item) => (
                <li key={item.id} className="px-4 py-3 sm:px-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{item.topic}</p>
                      <p className="text-xs text-muted">
                        {item.student?.name} · due {formatShortDate(item.due_date)}
                      </p>
                    </div>
                    <Badge tone={item.status === "submitted" ? "brand" : "warning"}>
                      {item.status === "submitted" ? "To correct" : "Assigned"}
                    </Badge>
                  </div>
                </li>
              ))}
              {awaitingFeedback.slice(0, 3).map((item) => (
                <li key={item.id} className="px-4 py-3 sm:px-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        Parent feedback · {item.student?.name}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {item.written_feedback ?? "Video response"}
                      </p>
                    </div>
                    <Link href="/parents" className="text-xs font-medium text-brand hover:underline">
                      Review
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <LineChart
          title="Attendance rate"
          subtitle={`Completed vs scheduled, last ${WEEKS_OF_HISTORY} weeks`}
          data={attendanceTrend}
          valueLabel="Attendance %"
          maxValue={100}
          formatValue={(value) => `${value}%`}
        />

        {isTeamHead ? (
          <BarChart
            title="Videos posted this week"
            subtitle={
              missingReports > 0
                ? `${missingReports} trainer${missingReports === 1 ? "" : "s"} yet to report`
                : "All weekly reports are in"
            }
            data={trainerBars}
            valueLabel="Videos"
            series={2}
            emptyMessage="No weekly reports submitted yet"
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Your students</CardTitle>
              <Link href="/students" className="text-xs font-medium text-brand hover:underline">
                Manage
              </Link>
            </CardHeader>
            <CardBody className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(students.data ?? []).slice(0, 6).map((student) => (
                <Link
                  key={student.id}
                  href={`/students/${student.id}`}
                  className="rounded-lg border border-line px-3 py-2 hover:border-brand-ring hover:bg-brand-soft"
                >
                  <p className="truncate text-sm font-medium text-ink">{student.name}</p>
                  <p className="text-xs text-muted">{LEVEL_LABELS[student.level]}</p>
                </Link>
              ))}
            </CardBody>
          </Card>
        )}
      </div>

      <ClassNotesModal
        session={notesSession}
        open={Boolean(notesSession)}
        onClose={() => setNotesSession(null)}
      />
      <ClassFormModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
    </>
  );
}

/** Weekly attendance rate: completed sessions as a share of everything booked. */
function buildAttendanceTrend(sessions: ClassWithStudent[]) {
  const buckets = new Map<string, { total: number; attended: number }>();

  for (const session of sessions) {
    const date = new Date(`${session.scheduled_date}T00:00:00`);
    const monday = new Date(date);
    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    const key = toISODate(monday);

    const bucket = buckets.get(key) ?? { total: 0, attended: 0 };
    bucket.total += 1;
    if (session.attendance === "present" || session.attendance === "late") bucket.attended += 1;
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-WEEKS_OF_HISTORY)
    .map(([week, bucket]) => ({
      label: formatShortDate(week),
      value: bucket.total === 0 ? 0 : Math.round((bucket.attended / bucket.total) * 100),
    }));
}
