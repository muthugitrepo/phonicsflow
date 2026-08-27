"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useLogParentContact } from "@/lib/queries/parents";
import { useStudents } from "@/lib/queries/students";
import { useSession } from "@/components/session-provider";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { parentContactSchema, type ParentContactInput, type ParentContactFormValues } from "@/lib/validations";
import { CONTACT_METHOD_LABELS } from "@/lib/constants";
import { toISODate } from "@/lib/utils";

export function ParentContactModal({
  open,
  onClose,
  defaultStudentId,
}: {
  open: boolean;
  onClose: () => void;
  defaultStudentId?: string;
}) {
  const profile = useSession();
  const { data: students } = useStudents();
  const logContact = useLogParentContact();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ParentContactFormValues, unknown, ParentContactInput>({ resolver: zodResolver(parentContactSchema) });

  React.useEffect(() => {
    if (!open) return;
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    reset({
      student_id: defaultStudentId ?? "",
      contact_date: toISODate(),
      method: "call",
      summary: "",
      next_contact_date: toISODate(nextWeek),
    } as ParentContactFormValues);
  }, [open, defaultStudentId, reset]);

  const onSubmit = async (values: ParentContactInput) => {
    try {
      await logContact.mutateAsync({ ...values, trainer_id: profile.id });
      toast("Contact logged");
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not log the contact", "error");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log a parent contact"
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
        <Field label="Student" htmlFor="pc_student" error={errors.student_id?.message} required>
          <Select id="pc_student" {...register("student_id")}>
            <option value="">Select a student</option>
            {(students ?? []).map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
                {student.parent_name ? ` — ${student.parent_name}` : ""}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" htmlFor="pc_date" error={errors.contact_date?.message} required>
            <Input id="pc_date" type="date" {...register("contact_date")} />
          </Field>
          <Field label="Method" htmlFor="pc_method">
            <Select id="pc_method" {...register("method")}>
              {Object.entries(CONTACT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="What was discussed" htmlFor="pc_summary">
          <Textarea id="pc_summary" rows={3} placeholder="Progress shared, concerns raised, agreed actions" {...register("summary")} />
        </Field>

        <Field label="Next check-in" htmlFor="pc_next" hint="Weekly is the default cadence">
          <Input id="pc_next" type="date" {...register("next_contact_date")} />
        </Field>
      </form>
    </Modal>
  );
}
