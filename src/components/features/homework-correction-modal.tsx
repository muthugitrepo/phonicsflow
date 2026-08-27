"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Paperclip } from "lucide-react";
import { useCorrectHomework, useSignedUrl, useUploadSubmission } from "@/lib/queries/homework";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { homeworkCorrectionSchema, type HomeworkCorrectionInput, type HomeworkCorrectionFormValues } from "@/lib/validations";
import { BUCKETS, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { HomeworkWithStudent } from "@/lib/types";

export function HomeworkCorrectionModal({
  homework,
  open,
  onClose,
}: {
  homework: HomeworkWithStudent | null;
  open: boolean;
  onClose: () => void;
}) {
  const correct = useCorrectHomework();
  const upload = useUploadSubmission();
  const signedUrl = useSignedUrl();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HomeworkCorrectionFormValues, unknown, HomeworkCorrectionInput>({ resolver: zodResolver(homeworkCorrectionSchema) });

  React.useEffect(() => {
    if (!open || !homework) return;
    reset({ corrections: homework.corrections ?? "", score: homework.score ?? undefined });
  }, [open, homework, reset]);

  if (!homework) return null;

  const onSubmit = async (values: HomeworkCorrectionInput) => {
    try {
      await correct.mutateAsync({ id: homework.id, values });
      toast("Correction saved");
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save the correction", "error");
    }
  };

  const onUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      toast("File is larger than 50 MB", "error");
      return;
    }
    try {
      await upload.mutateAsync({
        homeworkId: homework.id,
        studentId: homework.student_id,
        file,
      });
      toast("Submission uploaded");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Upload failed", "error");
    }
  };

  const openSubmission = async () => {
    if (!homework.submission_url) return;
    try {
      const url = await signedUrl.mutateAsync({
        bucket: BUCKETS.homework,
        path: homework.submission_url,
      });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast("Could not open the submission", "error");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Correct — ${homework.student?.name ?? "Student"}`}
      description={`${homework.topic} · due ${formatDate(homework.due_date)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Mark corrected
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {homework.description ? (
          <p className="rounded-lg bg-plane px-3 py-2 text-sm text-ink-2">{homework.description}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {homework.submission_url ? (
            <Button variant="secondary" size="sm" onClick={openSubmission}>
              <Paperclip className="h-3.5 w-3.5" />
              View submission
            </Button>
          ) : (
            <span className="text-sm text-muted">No submission uploaded yet.</span>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-plane">
            {upload.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Paperclip className="h-3.5 w-3.5" />
            )}
            Upload file
            <input
              type="file"
              className="sr-only"
              accept="image/*,application/pdf,audio/*"
              onChange={onUpload}
            />
          </label>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Corrections" htmlFor="corrections" error={errors.corrections?.message} required>
            <Textarea
              id="corrections"
              rows={5}
              placeholder="What was right, what to redo, which sounds to practise"
              {...register("corrections")}
            />
          </Field>
          <Field label="Score (optional)" htmlFor="score" error={errors.score?.message}>
            <Input id="score" type="number" min={0} max={100} {...register("score")} />
          </Field>
        </form>
      </div>
    </Modal>
  );
}
