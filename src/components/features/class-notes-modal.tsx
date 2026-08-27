"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useSaveClassNotes } from "@/lib/queries/classes";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { TopicPicker } from "./topic-picker";
import { ATTENDANCE_LABELS } from "@/lib/constants";
import { cn, formatDate, formatTime } from "@/lib/utils";
import type { AttendanceStatus } from "@/lib/database.types";
import type { ClassWithStudent } from "@/lib/types";

const NOTE_SECTIONS = [
  { key: "revision_notes", label: "Daily revision", placeholder: "What was revised from last class?" },
  { key: "dictation_notes", label: "Dictation", placeholder: "Words dictated, spelling accuracy…" },
  { key: "reading_notes", label: "Reading", placeholder: "Passage read, fluency, blending…" },
  {
    key: "pronunciation_notes",
    label: "Pronunciation",
    placeholder: "Sounds to correct, mouth position…",
  },
] as const;

/**
 * The outer component only decides *which* session is open. Remounting the form
 * on a new session id is what resets the fields — no state-syncing effect.
 */
export function ClassNotesModal({
  session,
  open,
  onClose,
}: {
  session: ClassWithStudent | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!session || !open) return null;
  return <ClassNotesForm key={session.id} session={session} onClose={onClose} />;
}

function ClassNotesForm({
  session,
  onClose,
}: {
  session: ClassWithStudent;
  onClose: () => void;
}) {
  const saveNotes = useSaveClassNotes();
  const { toast } = useToast();

  const [attendance, setAttendance] = React.useState<AttendanceStatus | null>(session.attendance);
  const [topics, setTopics] = React.useState<string[]>(session.topics_covered ?? []);
  const [notes, setNotes] = React.useState<Record<string, string>>({
    revision_notes: session.revision_notes ?? "",
    dictation_notes: session.dictation_notes ?? "",
    reading_notes: session.reading_notes ?? "",
    pronunciation_notes: session.pronunciation_notes ?? "",
    notes: session.notes ?? "",
  });

  const submit = async () => {
    try {
      await saveNotes.mutateAsync({
        id: session.id,
        values: {
          topics_covered: topics,
          attendance,
          revision_notes: notes.revision_notes || null,
          dictation_notes: notes.dictation_notes || null,
          reading_notes: notes.reading_notes || null,
          pronunciation_notes: notes.pronunciation_notes || null,
          notes: notes.notes || null,
          status: attendance === "absent" ? "cancelled" : "completed",
        },
      });
      toast("Class notes saved");
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save the notes", "error");
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Class notes — ${session.student?.name ?? "Student"}`}
      description={`${formatDate(session.scheduled_date)} at ${formatTime(session.scheduled_time)}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saveNotes.isPending}>
            {saveNotes.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save notes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Attendance">
          <div className="flex gap-1 rounded-lg bg-plane p-1">
            {(Object.keys(ATTENDANCE_LABELS) as AttendanceStatus[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setAttendance(attendance === option ? null : option)}
                aria-pressed={attendance === option}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  attendance === option
                    ? "bg-surface text-ink shadow-xs"
                    : "text-ink-2 hover:text-ink",
                )}
              >
                {ATTENDANCE_LABELS[option]}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Topics covered">
          <TopicPicker value={topics} onChange={setTopics} />
        </Field>

        {NOTE_SECTIONS.map((section) => (
          <Field key={section.key} label={section.label} htmlFor={section.key}>
            <Textarea
              id={section.key}
              rows={2}
              placeholder={section.placeholder}
              value={notes[section.key] ?? ""}
              onChange={(event) =>
                setNotes((current) => ({ ...current, [section.key]: event.target.value }))
              }
            />
          </Field>
        ))}

        <Field label="Other observations" htmlFor="notes">
          <Textarea
            id="notes"
            rows={2}
            placeholder="Anything to flag for the parent or next class"
            value={notes.notes ?? ""}
            onChange={(event) => setNotes((current) => ({ ...current, notes: event.target.value }))}
          />
        </Field>
      </div>
    </Modal>
  );
}
