"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useSaveStudent } from "@/lib/queries/students";
import { useTrainers } from "@/lib/queries/trainers";
import { useSession } from "@/components/session-provider";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { studentSchema, type StudentInput, type StudentFormValues } from "@/lib/validations";
import { LEVEL_LABELS, WEEKDAYS } from "@/lib/constants";
import type { StudentWithTrainer } from "@/lib/types";

export function StudentFormModal({
  student,
  open,
  onClose,
}: {
  student?: StudentWithTrainer | null;
  open: boolean;
  onClose: () => void;
}) {
  const profile = useSession();
  // Anyone with people reporting to them can assign a student to one of them.
  // RLS scopes `trainers` to exactly that set, so the options need no filtering
  // here: the Head sees everyone, a lead trainer sees self + direct reports.
  const canAssignTrainer = profile.role === "team_head" || profile.role === "lead_trainer";
  const { data: trainers } = useTrainers();
  const saveStudent = useSaveStudent();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormValues, unknown, StudentInput>({
    resolver: zodResolver(studentSchema),
  });

  React.useEffect(() => {
    if (!open) return;
    reset({
      name: student?.name ?? "",
      age: student?.age ?? undefined,
      level: student?.level ?? "beginner",
      trainer_id: student?.trainer_id ?? profile.id,
      parent_name: student?.parent_name ?? "",
      parent_email: student?.parent_email ?? "",
      parent_phone: student?.parent_phone ?? "",
      class_day: student?.class_day ?? undefined,
      class_time: student?.class_time?.slice(0, 5) ?? "",
      notes: student?.notes ?? "",
    } as StudentFormValues);
  }, [open, student, profile.id, reset]);

  const onSubmit = async (values: StudentInput) => {
    try {
      await saveStudent.mutateAsync({ id: student?.id, values });
      toast(student ? "Student updated" : "Student added");
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save the student", "error");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={student ? "Edit student" : "Add student"}
      description="Profile, weekly slot and the parent's contact details."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {student ? "Save changes" : "Add student"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" error={errors.name?.message} required>
            <Input id="name" placeholder="Aarav" {...register("name")} />
          </Field>
          <Field label="Age" htmlFor="age" error={errors.age?.message}>
            <Input id="age" type="number" min={2} max={99} {...register("age")} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Level" htmlFor="level">
            <Select id="level" {...register("level")}>
              {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          {canAssignTrainer ? (
            <Field label="Trainer" htmlFor="trainer_id">
              <Select id="trainer_id" {...register("trainer_id")}>
                <option value="">Unassigned</option>
                {(trainers ?? []).map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.full_name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <input type="hidden" {...register("trainer_id")} />
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Class day" htmlFor="class_day">
            <Select id="class_day" {...register("class_day")}>
              <option value="">Not set</option>
              {WEEKDAYS.map((day, index) => (
                <option key={day} value={index}>
                  {day}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Class time" htmlFor="class_time" hint="30-minute session by default">
            <Input id="class_time" type="time" {...register("class_time")} />
          </Field>
        </div>

        <fieldset className="space-y-4 rounded-lg border border-line p-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
            Parent contact
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Parent name" htmlFor="parent_name">
              <Input id="parent_name" {...register("parent_name")} />
            </Field>
            <Field label="Phone" htmlFor="parent_phone">
              <Input id="parent_phone" inputMode="tel" {...register("parent_phone")} />
            </Field>
          </div>
          <Field label="Email" htmlFor="parent_email" error={errors.parent_email?.message}>
            <Input id="parent_email" type="email" {...register("parent_email")} />
          </Field>
        </fieldset>

        <Field label="Notes" htmlFor="notes">
          <Textarea id="notes" placeholder="Starting point, goals, things to watch" {...register("notes")} />
        </Field>
      </form>
    </Modal>
  );
}
