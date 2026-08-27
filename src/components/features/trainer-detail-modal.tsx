"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useSubmitTrainerDetail } from "@/lib/queries/trainers";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { trainerDetailSchema, type TrainerDetailInput, type TrainerDetailFormValues } from "@/lib/validations";
import type { TrainerSummary } from "@/lib/types";

export function TrainerDetailModal({
  summary,
  weekEndingDate,
  open,
  onClose,
}: {
  summary: TrainerSummary | null;
  weekEndingDate: string;
  open: boolean;
  onClose: () => void;
}) {
  const submitDetail = useSubmitTrainerDetail();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TrainerDetailFormValues, unknown, TrainerDetailInput>({ resolver: zodResolver(trainerDetailSchema) });

  React.useEffect(() => {
    if (!open || !summary) return;
    reset({
      trainer_id: summary.trainer.id,
      week_ending_date: weekEndingDate,
      videos_posted: summary.latestReport?.videos_posted ?? 0,
      students_count: summary.latestReport?.students_count ?? summary.studentCount,
      classes_conducted: summary.latestReport?.classes_conducted ?? 0,
      issues_notes: summary.latestReport?.issues_notes ?? "",
    } as TrainerDetailFormValues);
  }, [open, summary, weekEndingDate, reset]);

  if (!summary) return null;

  const onSubmit = async (values: TrainerDetailInput) => {
    try {
      await submitDetail.mutateAsync(values);
      toast("Weekly details saved");
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save the details", "error");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Weekly details — ${summary.trainer.full_name}`}
      description={`Week ending ${weekEndingDate}`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register("trainer_id")} />
        <input type="hidden" {...register("week_ending_date")} />

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Videos posted" htmlFor="videos_posted" error={errors.videos_posted?.message}>
            <Input id="videos_posted" type="number" min={0} {...register("videos_posted")} />
          </Field>
          <Field label="Students" htmlFor="students_count" error={errors.students_count?.message}>
            <Input id="students_count" type="number" min={0} {...register("students_count")} />
          </Field>
          <Field label="Classes" htmlFor="classes_conducted">
            <Input id="classes_conducted" type="number" min={0} {...register("classes_conducted")} />
          </Field>
        </div>

        <Field label="Issues or support needed" htmlFor="issues_notes">
          <Textarea
            id="issues_notes"
            rows={4}
            placeholder="Anything the team head should follow up on"
            {...register("issues_notes")}
          />
        </Field>
      </form>
    </Modal>
  );
}
