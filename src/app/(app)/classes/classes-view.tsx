"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, Check, NotebookPen, Plus, Trash2, X } from "lucide-react";
import { useClasses, useDeleteClass, useUpdateClassStatus } from "@/lib/queries/classes";
import { ClassFormModal } from "@/components/features/class-form-modal";
import { ClassNotesModal } from "@/components/features/class-notes-modal";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState, ErrorState, LoadingRows } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { ATTENDANCE_LABELS } from "@/lib/constants";
import { formatDate, formatTime, startOfWeek, toISODate, weekEnding } from "@/lib/utils";
import type { ClassWithStudent } from "@/lib/types";

type RangeKey = "today" | "week" | "month" | "custom";

export function ClassesView() {
  const [range, setRange] = React.useState<RangeKey>("week");
  const [customFrom, setCustomFrom] = React.useState(toISODate());
  const [customTo, setCustomTo] = React.useState(toISODate());
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [notesSession, setNotesSession] = React.useState<ClassWithStudent | null>(null);

  const { from, to } = React.useMemo(() => resolveRange(range, customFrom, customTo), [
    range,
    customFrom,
    customTo,
  ]);

  const { data, isLoading, error } = useClasses({ from, to });
  const updateStatus = useUpdateClassStatus();
  const removeClass = useDeleteClass();
  const { toast } = useToast();

  const grouped = React.useMemo(() => groupByDate(data ?? []), [data]);

  const markAttendance = async (session: ClassWithStudent, present: boolean) => {
    await updateStatus.mutateAsync({
      id: session.id,
      status: present ? "completed" : "cancelled",
      attendance: present ? "present" : "absent",
    });
    toast(present ? "Marked present" : "Marked absent");
  };

  return (
    <>
      <PageHeader
        title="Classes"
        description="Schedule sessions, mark attendance and write up notes."
        actions={
          <Button onClick={() => setScheduleOpen(true)}>
            <Plus className="h-4 w-4" /> Schedule class
          </Button>
        }
      />

      <div className="mb-4 space-y-2">
        <Tabs
          className="sm:max-w-md"
          items={[
            { value: "today", label: "Today" },
            { value: "week", label: "This week" },
            { value: "month", label: "This month" },
            { value: "custom", label: "Custom" },
          ]}
          value={range}
          onChange={(value) => setRange(value as RangeKey)}
        />
        {range === "custom" ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              className="w-auto"
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
              aria-label="From date"
            />
            <span className="text-sm text-muted">to</span>
            <Input
              type="date"
              className="w-auto"
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
              aria-label="To date"
            />
          </div>
        ) : null}
      </div>

      {error ? (
        <ErrorState message={(error as Error).message} />
      ) : isLoading ? (
        <Card>
          <LoadingRows rows={4} />
        </Card>
      ) : grouped.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarDays}
            title="No classes in this range"
            action={<Button size="sm" onClick={() => setScheduleOpen(true)}>Schedule a class</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, sessions]) => (
            <Card key={date}>
              <div className="flex items-center justify-between border-b border-line px-4 py-2.5 sm:px-5">
                <h2 className="text-sm font-semibold text-ink">{formatDate(date)}</h2>
                <span className="text-xs text-muted">
                  {sessions.length} session{sessions.length === 1 ? "" : "s"}
                </span>
              </div>
              <ul className="divide-y divide-line">
                {sessions.map((session) => (
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
                        className="text-sm font-medium text-ink hover:text-brand"
                      >
                        {session.student?.name ?? "Student"}
                      </Link>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                        <span>{session.duration_minutes} min</span>
                        {session.attendance ? (
                          <Badge tone={session.attendance === "absent" ? "critical" : "good"}>
                            {ATTENDANCE_LABELS[session.attendance]}
                          </Badge>
                        ) : null}
                        {(session.topics_covered ?? []).slice(0, 3).map((topic) => (
                          <Badge key={topic} tone="brand">
                            {topic}
                          </Badge>
                        ))}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Mark present"
                        onClick={() => markAttendance(session, true)}
                      >
                        <Check className="h-4 w-4 text-good" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Mark absent"
                        onClick={() => markAttendance(session, false)}
                      >
                        <X className="h-4 w-4 text-critical" />
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setNotesSession(session)}>
                        <NotebookPen className="h-3.5 w-3.5" /> Notes
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Delete class"
                        onClick={async () => {
                          await removeClass.mutateAsync(session.id);
                          toast("Class removed");
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-muted" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      <ClassFormModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
      <ClassNotesModal
        session={notesSession}
        open={Boolean(notesSession)}
        onClose={() => setNotesSession(null)}
      />
    </>
  );
}

function resolveRange(range: RangeKey, customFrom: string, customTo: string) {
  const today = new Date();

  if (range === "today") return { from: toISODate(today), to: toISODate(today) };
  if (range === "week") return { from: toISODate(startOfWeek(today)), to: toISODate(weekEnding(today)) };
  if (range === "month") {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: toISODate(first), to: toISODate(last) };
  }
  return { from: customFrom, to: customTo };
}

function groupByDate(sessions: ClassWithStudent[]) {
  const groups = new Map<string, ClassWithStudent[]>();
  for (const session of sessions) {
    const bucket = groups.get(session.scheduled_date) ?? [];
    bucket.push(session);
    groups.set(session.scheduled_date, bucket);
  }
  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a));
}
