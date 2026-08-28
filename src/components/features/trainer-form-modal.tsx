"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, KeyRound, Loader2 } from "lucide-react";
import { useCreateTrainer, type ProvisionedTrainer } from "@/lib/queries/trainers";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { trainerSchema, type TrainerInput, type TrainerFormValues } from "@/lib/validations";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@/lib/constants";
import type { Profile } from "@/lib/types";

/**
 * The outer component only decides whether the modal exists. Mounting the form
 * fresh is what clears it between uses — no state-syncing effect, and no chance
 * of a previous trainer's password lingering on screen.
 */
export function TrainerFormModal({
  open,
  onClose,
  leads,
}: {
  open: boolean;
  onClose: () => void;
  leads: Profile[];
}) {
  if (!open) return null;
  return <TrainerForm onClose={onClose} leads={leads} />;
}

function TrainerForm({ onClose, leads }: { onClose: () => void; leads: Profile[] }) {
  const createTrainer = useCreateTrainer();
  const { toast } = useToast();
  const [result, setResult] = React.useState<ProvisionedTrainer | null>(null);
  const [copied, setCopied] = React.useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TrainerFormValues, unknown, TrainerInput>({
    resolver: zodResolver(trainerSchema),
    defaultValues: { full_name: "", email: "", phone: "", role: "trainer", reports_to: "" },
  });

  // useWatch subscribes without returning a fresh function each render, which
  // is what keeps the React Compiler able to memoize this component.
  const role = useWatch({ control, name: "role" });

  const onSubmit = async (values: TrainerInput) => {
    try {
      setResult(await createTrainer.mutateAsync(values));
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not create the account", "error");
    }
  };

  const copyPassword = async () => {
    if (!result) return;
    await navigator.clipboard?.writeText(result.password);
    setCopied(true);
    toast("Temporary password copied");
  };

  // --- after creation: show the password once ------------------------------
  if (result) {
    return (
      <Modal
        open
        onClose={onClose}
        title="Account created"
        description={`${result.full_name} can sign in with the details below.`}
        size="sm"
        footer={<Button onClick={onClose}>Done</Button>}
      >
        <div className="space-y-3">
          <div className="rounded-lg border border-line bg-plane px-3 py-2">
            <p className="text-xs text-muted">Email</p>
            <p className="text-sm font-medium text-ink">{result.email}</p>
          </div>

          <div className="rounded-lg border border-brand-ring bg-brand-soft px-3 py-2">
            <p className="text-xs text-brand-strong">Temporary password</p>
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <code className="font-mono text-base font-semibold tracking-wide text-ink">
                {result.password}
              </code>
              <Button size="sm" variant="secondary" onClick={copyPassword}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          <p className="flex gap-2 rounded-lg bg-[#fdf3dd] px-3 py-2 text-xs text-[#7a5300]">
            <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              This is shown once and is not stored anywhere you can read it back. Pass it on
              directly — they must choose their own password at first sign-in.
            </span>
          </p>
        </div>
      </Modal>
    );
  }

  // --- the form ------------------------------------------------------------
  return (
    <Modal
      open
      onClose={onClose}
      title="Add trainer"
      description="Creates the sign-in account and the profile together."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create account
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Full name" htmlFor="t_name" error={errors.full_name?.message} required>
          <Input id="t_name" placeholder="Priya Raman" {...register("full_name")} />
        </Field>

        <Field label="Email" htmlFor="t_email" error={errors.email?.message} required>
          <Input id="t_email" type="email" placeholder="priya@alphics.com" {...register("email")} />
        </Field>

        <Field label="Phone" htmlFor="t_phone">
          <Input id="t_phone" inputMode="tel" {...register("phone")} />
        </Field>

        <Field label="Role" htmlFor="t_role">
          <Select id="t_role" {...register("role")}>
            {ASSIGNABLE_ROLES.map((value) => (
              <option key={value} value={value}>
                {ROLE_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>

        {role === "trainer" ? (
          <Field label="Reports to" htmlFor="t_reports" hint="Leave as Head if they report directly to you">
            <Select id="t_reports" {...register("reports_to")}>
              <option value="">Head</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.full_name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </form>
    </Modal>
  );
}
