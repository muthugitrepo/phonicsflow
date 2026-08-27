"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Archive,
  CalendarPlus,
  ClipboardList,
  Mail,
  NotebookPen,
  Pencil,
  Phone,
} from "lucide-react";
import { useArchiveStudent, useStudent } from "@/lib/queries/students";
import { useClasses } from "@/lib/queries/classes";
import { useHomework } from "@/lib/queries/homework";
import { useParentContacts, useParentFeedback } from "@/lib/queries/parents";
import { StudentFormModal } from "@/components/features/student-form-modal";
import { ClassFormModal } from "@/components/features/class-form-modal";
import { ClassNotesModal } from "@/components/features/class-notes-modal";
import { HomeworkFormModal } from "@/components/features/homework-form-modal";
import { HomeworkCorrectionModal } from "@/components/features/homework-correction-modal";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile, ProgressMeter } from "@/components/charts/stat-tile";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState, ErrorState, LoadingRows } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import {
  ATTENDANCE_LABELS,
  CONTACT_METHOD_LABELS,
  LEVEL_LABELS,
  WEEKDAYS,
} from "@/lib/constants";
import { formatDate, formatTime } from "@/lib/utils";
import type { ClassWithStudent, HomeworkWithStudent } from "@/lib/types";

const NOTE_FIELDS = [
  ["revision_notes", "Revision"],
  ["dictation_notes", "Dictation"],
  ["reading_notes", "Reading"],
  ["pronunciation_notes", "Pronunciation"],
  ["notes", "Other"],
] as const;

export function StudentDetailView({ studentId }: { studentId: string }) {
  const { data: student, isLoading, error } = useStudent(studentId);
  const classes = useClasses({ studentId });
  const homework = useHomework({ studentId });
  const contacts = useParentContacts({ studentId });
  const feedback = useParentFeedback({ studentId });
  const archive = useArchiveStudent();
  const { toast } = useToast();

  const [tab, setTab] = React.useState("classes");
  const [editOpen, setEditOpen] = React.useState(false);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [homeworkOpen, setHomeworkOpen] = React.useState(false);
  const [notesSession, setNotesSession] = React.useState<ClassWithStudent | null>(null);
  const [correcting, setCorrecting] = React.useState<HomeworkWithStudent | null>(null);

  const sessions = React.useMemo(() => classes.data ?? [], [classes.data]);
  const assignments = homework.data ?? [];

  const completed = sessions.filter((session) => session.status === "completed");
  const attended = sessions.filter(
    (session) => session.attendance === "present" || session.attendance === "late",
  );
  const withAttendance = sessions.filter((session) => session.attendance !== null);
  const corrected = assignments.filter((item) => item.status === "corrected");
  const soundsCovered = React.useMemo(
    () => [...new Set(sessions.flatMap((session) => session.topics_covered ?? []))],
    [sessions],
  );

  if (error) return <ErrorState message={(error as Error).message} />;
  if (isLoading || !student) {
    return (
      <Card>
        <LoadingRows rows={4} />
      </Card>
    );
  }

  const toggleArchive = async () => {
    await archive.mutateAsync({ id: student.id, isActive: !student.is_active });
    toast(student.is_active ? "Student archived" : "Student restored");
  };

  return (
    <>
      <Link
        href="/students"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> All students
      </Link>

      <PageHeader
        title={student.name}
        description={[
          student.age ? `${student.age} years` : null,
          LEVEL_LABELS[student.level],
          student.class_day !== null && student.class_time
            ? `${WEEKDAYS[student.class_day]} at ${formatTime(student.class_time)}`
            : null,
          student.trainer?.full_name ? `Trainer: ${student.trainer.full_name}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
            <Button variant="secondary" onClick={() => setScheduleOpen(true)}>
              <CalendarPlus className="h-4 w-4" /> Schedule
            </Button>
            <Button onClick={() => setHomeworkOpen(true)}>
              <ClipboardList className="h-4 w-4" /> Assign homework
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Classes completed" value={completed.length} hint={`${sessions.length} scheduled`} />
        <StatTile
          label="Attendance"
          value={`${withAttendance.length === 0 ? 0 : Math.round((attended.length / withAttendance.length) * 100)}%`}
          hint={`${attended.length} of ${withAttendance.length} marked`}
          tone={
            withAttendance.length > 0 && attended.length / withAttendance.length < 0.8
              ? "warning"
              : "neutral"
          }
        />
        <StatTile
          label="Homework corrected"
          value={`${assignments.length === 0 ? 0 : Math.round((corrected.length / assignments.length) * 100)}%`}
          hint={`${corrected.length} of ${assignments.length}`}
        />
        <StatTile label="Sounds covered" value={soundsCovered.length} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Tabs
            items={[
              { value: "classes", label: "Classes", count: sessions.length },
              { value: "homework", label: "Homework", count: assignments.length },
              { value: "parent", label: "Parent", count: contacts.data?.length ?? 0 },
            ]}
            value={tab}
            onChange={setTab}
          />

          {tab === "classes" ? (
            <Card>
              <CardHeader>
                <CardTitle>Class history</CardTitle>
              </CardHeader>
              {classes.isLoading ? (
                <LoadingRows />
              ) : sessions.length === 0 ? (
                <EmptyState
                  title="No classes yet"
                  description="Schedule a session to start recording notes."
                />
              ) : (
                <ul className="divide-y divide-line">
                  {sessions.map((session) => (
                    <li key={session.id} className="px-4 py-3 sm:px-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-ink">
                            {formatDate(session.scheduled_date)} · {formatTime(session.scheduled_time)}
                          </p>
                          <p className="mt-1 flex flex-wrap items-center gap-1.5">
                            {session.attendance ? (
                              <Badge tone={session.attendance === "absent" ? "critical" : "good"}>
                                {ATTENDANCE_LABELS[session.attendance]}
                              </Badge>
                            ) : (
                              <Badge tone="neutral">Not marked</Badge>
                            )}
                            {(session.topics_covered ?? []).map((topic) => (
                              <Badge key={topic} tone="brand">
                                {topic}
                              </Badge>
                            ))}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setNotesSession(session)}
                        >
                          <NotebookPen className="h-3.5 w-3.5" /> Notes
                        </Button>
                      </div>

                      <dl className="mt-2 grid gap-1.5 sm:grid-cols-2">
                        {NOTE_FIELDS.map(([key, label]) =>
                          session[key] ? (
                            <div key={key} className="rounded-lg bg-plane px-3 py-2">
                              <dt className="text-xs font-medium text-muted">{label}</dt>
                              <dd className="mt-0.5 text-sm text-ink-2">{session[key]}</dd>
                            </div>
                          ) : null,
                        )}
                      </dl>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}

          {tab === "homework" ? (
            <Card>
              <CardHeader>
                <CardTitle>Homework</CardTitle>
                <Button size="sm" variant="secondary" onClick={() => setHomeworkOpen(true)}>
                  Assign
                </Button>
              </CardHeader>
              {homework.isLoading ? (
                <LoadingRows />
              ) : assignments.length === 0 ? (
                <EmptyState title="No homework assigned yet" />
              ) : (
                <ul className="divide-y divide-line">
                  {assignments.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{item.topic}</p>
                        <p className="text-xs text-muted">
                          Due {formatDate(item.due_date)}
                          {item.score !== null ? ` · scored ${item.score}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          tone={
                            item.status === "corrected"
                              ? "good"
                              : item.status === "submitted"
                                ? "brand"
                                : "warning"
                          }
                        >
                          {item.status}
                        </Badge>
                        <Button size="sm" variant="ghost" onClick={() => setCorrecting(item)}>
                          Open
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}

          {tab === "parent" ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Contact log</CardTitle>
                  <Link href="/parents" className="text-xs font-medium text-brand hover:underline">
                    Log a contact
                  </Link>
                </CardHeader>
                {(contacts.data ?? []).length === 0 ? (
                  <EmptyState title="No parent contacts logged" />
                ) : (
                  <ul className="divide-y divide-line">
                    {(contacts.data ?? []).map((contact) => (
                      <li key={contact.id} className="px-4 py-3 sm:px-5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-ink">
                            {formatDate(contact.contact_date)}
                          </p>
                          <Badge tone="neutral">{CONTACT_METHOD_LABELS[contact.method]}</Badge>
                        </div>
                        {contact.summary ? (
                          <p className="mt-1 text-sm text-ink-2">{contact.summary}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Feedback received</CardTitle>
                </CardHeader>
                {(feedback.data ?? []).length === 0 ? (
                  <EmptyState title="No feedback submitted yet" />
                ) : (
                  <ul className="divide-y divide-line">
                    {(feedback.data ?? []).map((item) => (
                      <li key={item.id} className="px-4 py-3 sm:px-5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-ink">
                            {formatDate(item.submission_date)}
                          </p>
                          {item.rating ? <Badge tone="brand">{item.rating}/5</Badge> : null}
                        </div>
                        {item.written_feedback ? (
                          <p className="mt-1 text-sm text-ink-2">{item.written_feedback}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <ProgressMeter
                label="Attendance"
                value={
                  withAttendance.length === 0
                    ? 0
                    : (attended.length / withAttendance.length) * 100
                }
                caption={`${attended.length} of ${withAttendance.length} sessions attended`}
              />
              <ProgressMeter
                label="Homework completion"
                value={assignments.length === 0 ? 0 : (corrected.length / assignments.length) * 100}
                series={3}
                caption={`${corrected.length} corrected`}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Parent</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-sm">
              <p className="font-medium text-ink">{student.parent_name ?? "Not recorded"}</p>
              {student.parent_phone ? (
                <a
                  href={`tel:${student.parent_phone}`}
                  className="flex items-center gap-2 text-ink-2 hover:text-brand"
                >
                  <Phone className="h-3.5 w-3.5" /> {student.parent_phone}
                </a>
              ) : null}
              {student.parent_email ? (
                <a
                  href={`mailto:${student.parent_email}`}
                  className="flex items-center gap-2 break-all text-ink-2 hover:text-brand"
                >
                  <Mail className="h-3.5 w-3.5" /> {student.parent_email}
                </a>
              ) : null}
            </CardBody>
          </Card>

          {student.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>Trainer notes</CardTitle>
              </CardHeader>
              <CardBody className="text-sm text-ink-2">{student.notes}</CardBody>
            </Card>
          ) : null}

          <Button variant="secondary" className="w-full" onClick={toggleArchive}>
            <Archive className="h-4 w-4" />
            {student.is_active ? "Archive student" : "Restore student"}
          </Button>
        </div>
      </div>

      <StudentFormModal student={student} open={editOpen} onClose={() => setEditOpen(false)} />
      <ClassFormModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        defaultStudentId={student.id}
      />
      <HomeworkFormModal
        open={homeworkOpen}
        onClose={() => setHomeworkOpen(false)}
        defaultStudentId={student.id}
      />
      <ClassNotesModal
        session={notesSession}
        open={Boolean(notesSession)}
        onClose={() => setNotesSession(null)}
      />
      <HomeworkCorrectionModal
        homework={correcting}
        open={Boolean(correcting)}
        onClose={() => setCorrecting(null)}
      />
    </>
  );
}
