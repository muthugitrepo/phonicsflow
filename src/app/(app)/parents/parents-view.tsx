"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Link2, MessageSquareHeart, Phone, Plus } from "lucide-react";
import {
  useAcknowledgeFeedback,
  useCreateFeedbackLink,
  useParentContacts,
  useParentFeedback,
} from "@/lib/queries/parents";
import { useStudents } from "@/lib/queries/students";
import { useSession } from "@/components/session-provider";
import { ParentContactModal } from "@/components/features/parent-contact-modal";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/charts/stat-tile";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingRows } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { CONTACT_METHOD_LABELS } from "@/lib/constants";
import { formatDate, startOfWeek, toISODate } from "@/lib/utils";

export function ParentsView() {
  const profile = useSession();
  const students = useStudents();
  const contacts = useParentContacts();
  const feedback = useParentFeedback();
  const acknowledge = useAcknowledgeFeedback();
  const createLink = useCreateFeedbackLink();
  const { toast } = useToast();

  const [contactOpen, setContactOpen] = React.useState(false);
  const [contactStudent, setContactStudent] = React.useState<string | undefined>();

  const weekStart = React.useMemo(() => toISODate(startOfWeek()), []);
  const contactList = React.useMemo(() => contacts.data ?? [], [contacts.data]);
  const feedbackList = feedback.data ?? [];

  const lastContactByStudent = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const contact of contactList) {
      const existing = map.get(contact.student_id);
      if (!existing || contact.contact_date > existing) map.set(contact.student_id, contact.contact_date);
    }
    return map;
  }, [contactList]);

  const contactedThisWeek = contactList.filter((contact) => contact.contact_date >= weekStart);
  const pendingFeedback = feedbackList.filter((item) => !item.acknowledged_at);
  const dueThisWeek = (students.data ?? []).filter((student) => {
    const last = lastContactByStudent.get(student.id);
    return !last || last < weekStart;
  });

  const shareLink = async (studentId: string, studentName: string) => {
    try {
      const { url } = await createLink.mutateAsync(studentId);
      await navigator.clipboard?.writeText(url);
      toast(`Feedback link for ${studentName} copied`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not create the link", "error");
    }
  };

  return (
    <>
      <PageHeader
        title="Parent communication"
        description="Weekly check-ins, feedback links and the reply history."
        actions={
          <Button
            onClick={() => {
              setContactStudent(undefined);
              setContactOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Log contact
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Contacts this week" value={contactedThisWeek.length} icon={Phone} />
        <StatTile
          label="Check-ins due"
          value={dueThisWeek.length}
          tone={dueThisWeek.length > 0 ? "warning" : "good"}
        />
        <StatTile label="Feedback received" value={feedbackList.length} icon={MessageSquareHeart} />
        <StatTile
          label="Awaiting review"
          value={pendingFeedback.length}
          tone={pendingFeedback.length > 0 ? "warning" : "neutral"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly check-ins</CardTitle>
            <span className="text-xs text-muted">Sorted by longest since contact</span>
          </CardHeader>
          {students.isLoading ? (
            <LoadingRows />
          ) : (students.data ?? []).length === 0 ? (
            <EmptyState title="No students yet" />
          ) : (
            <ul className="divide-y divide-line">
              {[...(students.data ?? [])]
                .sort((a, b) =>
                  (lastContactByStudent.get(a.id) ?? "").localeCompare(
                    lastContactByStudent.get(b.id) ?? "",
                  ),
                )
                .map((student) => {
                  const last = lastContactByStudent.get(student.id);
                  const due = !last || last < weekStart;
                  return (
                    <li
                      key={student.id}
                      className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-5"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/students/${student.id}`}
                          className="text-sm font-medium text-ink hover:text-brand"
                        >
                          {student.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted">
                          {student.parent_name ? `${student.parent_name} · ` : ""}
                          {last ? `last contact ${formatDate(last)}` : "never contacted"}
                        </p>
                      </div>
                      {due ? <Badge tone="warning">Due</Badge> : <Badge tone="good">Done</Badge>}
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => shareLink(student.id, student.name)}
                          disabled={createLink.isPending}
                        >
                          <Link2 className="h-3.5 w-3.5" /> Link
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setContactStudent(student.id);
                            setContactOpen(true);
                          }}
                        >
                          Log
                        </Button>
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Parent feedback</CardTitle>
            </CardHeader>
            {feedback.isLoading ? (
              <LoadingRows />
            ) : feedbackList.length === 0 ? (
              <EmptyState
                icon={MessageSquareHeart}
                title="No feedback yet"
                description="Share a feedback link with a parent — they can reply with text or a video, no login needed."
              />
            ) : (
              <ul className="divide-y divide-line">
                {feedbackList.map((item) => (
                  <li key={item.id} className="px-4 py-3 sm:px-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">{item.student?.name}</p>
                        <p className="text-xs text-muted">{formatDate(item.submission_date)}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {item.rating ? <Badge tone="brand">{item.rating}/5</Badge> : null}
                        {item.acknowledged_at ? (
                          <Badge tone="good">Reviewed</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={async () => {
                              await acknowledge.mutateAsync({ id: item.id, userId: profile.id });
                              toast("Marked as reviewed");
                            }}
                          >
                            <Check className="h-3.5 w-3.5" /> Acknowledge
                          </Button>
                        )}
                      </div>
                    </div>
                    {item.written_feedback ? (
                      <p className="mt-1.5 rounded-lg bg-plane px-3 py-2 text-sm text-ink-2">
                        {item.written_feedback}
                      </p>
                    ) : null}
                    {item.video_url ? (
                      <p className="mt-1.5 text-xs text-muted">Video response attached</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent contact log</CardTitle>
            </CardHeader>
            {contactList.length === 0 ? (
              <EmptyState title="Nothing logged yet" />
            ) : (
              <ul className="divide-y divide-line">
                {contactList.slice(0, 8).map((contact) => (
                  <li key={contact.id} className="px-4 py-2.5 sm:px-5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm text-ink">
                        {contact.student?.name}
                        <span className="ml-1.5 text-xs text-muted">
                          {formatDate(contact.contact_date)}
                        </span>
                      </p>
                      <Badge tone="neutral">{CONTACT_METHOD_LABELS[contact.method]}</Badge>
                    </div>
                    {contact.summary ? (
                      <p className="mt-0.5 truncate text-xs text-ink-2">{contact.summary}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <ParentContactModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        defaultStudentId={contactStudent}
      />
    </>
  );
}
