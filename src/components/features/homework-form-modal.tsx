"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useAssignHomework } from "@/lib/queries/homework";
import { useStudents } from "@/lib/queries/students";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { homeworkSchema, type HomeworkInput, type HomeworkFormValues } from "@/lib/validations";
import { toISODate } from "@/lib/utils";

export function HomeworkFormModal({
  open,
  onClose,
  defaultStudentId,
}: {
  open: boolean;
  onClose: () => void;
  defaultStudentId?: string;
}) {
  const { data: students } = useStudents();
  const assign = useAssignHomework();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HomeworkFormValues, unknown, HomeworkInput>({ resolver: zodResolver(homeworkSchema) });

  React.useEffect(() => {
    if (!open) return;
    const inAWeek = new Date();
    inAWeek.setDate(inAWeek.getDate() + 7);
    reset({
      student_id: defaultStudentId ?? "",
      topic: "",
      description: "",
      assigned_date: toISODate(),
      due_date: toISODate(inAWeek),
    } as HomeworkFormValues);
  }, [open, defaultStudentId, reset]);

  const onSubmit = async (values: HomeworkInput) => {
    try {
      await assign.mutateAsync(values);
      toast("Homework assigned");
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not assign the homework", "error");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign homework"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Assign
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Student" htmlFor="hw_student" error={errors.student_id?.message} required>
          <Select id="hw_student" {...register("student_id")}>
            <option value="">Select a student</option>
            {(students ?? []).map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Topic" htmlFor="hw_topic" error={errors.topic?.message} required>
          <Input id="hw_topic" placeholder="Write 5 words with the /sh/ sound" {...register("topic")} />
        </Field>

        <Field label="Instructions" htmlFor="hw_description">
          <Textarea id="hw_description" placeholder="What the child should do, and how" {...register("description")} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Assigned" htmlFor="hw_assigned">
            <Input id="hw_assigned" type="date" {...register("assigned_date")} />
          </Field>
          <Field label="Due" htmlFor="hw_due" error={errors.due_date?.message} required>
            <Input id="hw_due" type="date" {...register("due_date")} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
