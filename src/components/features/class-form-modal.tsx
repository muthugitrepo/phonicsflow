"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useSaveClass } from "@/lib/queries/classes";
import { useStudents } from "@/lib/queries/students";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { classSchema, type ClassInput, type ClassFormValues } from "@/lib/validations";
import { DEFAULT_CLASS_MINUTES } from "@/lib/constants";
import { toISODate } from "@/lib/utils";

export function ClassFormModal({
  open,
  onClose,
  defaultStudentId,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  defaultStudentId?: string;
  defaultDate?: string;
}) {
  const { data: students } = useStudents();
  const saveClass = useSaveClass();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClassFormValues, unknown, ClassInput>({ resolver: zodResolver(classSchema) });

  React.useEffect(() => {
    if (!open) return;
    reset({
      student_id: defaultStudentId ?? "",
      scheduled_date: defaultDate ?? toISODate(),
      scheduled_time: "16:00",
      duration_minutes: DEFAULT_CLASS_MINUTES,
      status: "scheduled",
    });
  }, [open, defaultStudentId, defaultDate, reset]);

  const onSubmit = async (values: ClassInput) => {
    try {
      await saveClass.mutateAsync({ values });
      toast("Class scheduled");
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not schedule the class", "error");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Schedule a class"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Schedule
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Student" htmlFor="student_id" error={errors.student_id?.message} required>
          <Select id="student_id" {...register("student_id")}>
            <option value="">Select a student</option>
            {(students ?? []).map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" htmlFor="scheduled_date" error={errors.scheduled_date?.message} required>
            <Input id="scheduled_date" type="date" {...register("scheduled_date")} />
          </Field>
          <Field label="Time" htmlFor="scheduled_time" error={errors.scheduled_time?.message} required>
            <Input id="scheduled_time" type="time" {...register("scheduled_time")} />
          </Field>
        </div>

        <Field label="Duration (minutes)" htmlFor="duration_minutes">
          <Input id="duration_minutes" type="number" min={10} max={180} step={5} {...register("duration_minutes")} />
        </Field>
      </form>
    </Modal>
  );
}
