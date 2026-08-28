"use client";

import * as React from "react";
import { Loader2, Mail, X } from "lucide-react";
import { useSendWeeklyReport } from "@/lib/queries/reports";
import { useToday } from "@/lib/use-today";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { parseRecipients } from "@/lib/validations";
import { formatDate, toISODate, weekEnding } from "@/lib/utils";
import type { Profile } from "@/lib/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function WeeklyEmailModal({
  open,
  onClose,
  profile,
}: {
  open: boolean;
  onClose: () => void;
  profile: Profile;
}) {
  if (!open) return null;
  return <WeeklyEmailForm onClose={onClose} profile={profile} />;
}

function WeeklyEmailForm({ onClose, profile }: { onClose: () => void; profile: Profile }) {
  const [raw, setRaw] = React.useState("");
  const send = useSendWeeklyReport();
  const { toast } = useToast();
  const viewerToday = useToday();

  const recipients = parseRecipients(raw);
  const invalid = recipients.filter((address) => !EMAIL_PATTERN.test(address));
  const canSend = recipients.length > 0 && invalid.length === 0;

  // Mirrors weeklyReportSubject() on the server so the preview is honest.
  const weekEndsOn = viewerToday
    ? toISODate(weekEnding(new Date(`${viewerToday}T00:00:00`)))
    : null;
  const subject = weekEndsOn
    ? `PhonicsFlow weekly report — week ending ${formatDate(weekEndsOn)}`
    : "PhonicsFlow weekly report";

  const submit = async () => {
    try {
      const result = await send.mutateAsync({ to: recipients });
      toast(`Report sent to ${result.recipients.length} recipient${result.recipients.length === 1 ? "" : "s"}`);
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not send the report", "error");
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Email the weekly report"
      description="The subject and contents are generated from this week's data."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSend || send.isPending}>
            {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Send report
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <dl className="rounded-lg border border-line bg-plane px-3 py-2.5 text-sm">
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-muted">From</dt>
            <dd className="min-w-0 text-ink">{profile.full_name} via PhonicsFlow</dd>
          </div>
          <div className="mt-1 flex gap-2">
            <dt className="w-16 shrink-0 text-muted">Reply to</dt>
            <dd className="min-w-0 break-all text-ink">{profile.email}</dd>
          </div>
          <div className="mt-1 flex gap-2">
            <dt className="w-16 shrink-0 text-muted">Subject</dt>
            <dd className="min-w-0 text-ink">{subject}</dd>
          </div>
        </dl>

        <Field
          label="To"
          htmlFor="recipients"
          required
          error={
            invalid.length > 0
              ? `Not a valid address: ${invalid.join(", ")}`
              : undefined
          }
          hint="Separate several addresses with commas, spaces or new lines."
        >
          <Textarea
            id="recipients"
            rows={3}
            autoFocus
            placeholder="head@alphics.com, director@alphics.com"
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
          />
        </Field>

        {recipients.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {recipients.map((address) => {
              const bad = !EMAIL_PATTERN.test(address);
              return (
                <li
                  key={address}
                  className={
                    bad
                      ? "inline-flex items-center gap-1 rounded-full bg-[#fbeaea] px-2 py-0.5 text-xs font-medium text-[#a02525] ring-1 ring-[#f2c7c7]"
                      : "inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-strong ring-1 ring-brand-ring"
                  }
                >
                  {address}
                  <button
                    type="button"
                    aria-label={`Remove ${address}`}
                    onClick={() =>
                      setRaw(recipients.filter((item) => item !== address).join(", "))
                    }
                    className="opacity-70 hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        <p className="rounded-lg bg-plane px-3 py-2 text-xs text-ink-2">
          Sent from your verified domain so it passes spam checks — your name appears as the
          sender and replies come back to you. The scheduled Sunday email still goes to everyone
          holding the Head role.
        </p>
      </div>
    </Modal>
  );
}
