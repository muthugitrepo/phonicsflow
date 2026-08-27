"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "./keys";
import type { StudentInput } from "@/lib/validations";
import type { Student, StudentWithTrainer } from "@/lib/types";

const STUDENT_SELECT = "*, trainer:users!students_trainer_id_fkey(id, full_name, email)";

export function useStudents(options: { trainerId?: string; includeInactive?: boolean } = {}) {
  const supabase = createClient();
  const { trainerId, includeInactive = false } = options;

  return useQuery({
    queryKey: queryKeys.students({ trainerId, includeInactive }),
    queryFn: async (): Promise<StudentWithTrainer[]> => {
      let query = supabase.from("students").select(STUDENT_SELECT).order("name");
      if (trainerId) query = query.eq("trainer_id", trainerId);
      if (!includeInactive) query = query.eq("is_active", true);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as StudentWithTrainer[];
    },
  });
}

export function useStudent(id?: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.student(id ?? ""),
    enabled: Boolean(id),
    queryFn: async (): Promise<StudentWithTrainer> => {
      const { data, error } = await supabase
        .from("students")
        .select(STUDENT_SELECT)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as unknown as StudentWithTrainer;
    },
  });
}

export function useSaveStudent() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: StudentInput }) => {
      const payload = {
        ...values,
        age: values.age ?? null,
        trainer_id: values.trainer_id ?? null,
        class_day: values.class_day ?? null,
      };

      if (id) {
        const { data, error } = await supabase
          .from("students")
          .update(payload)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data as Student;
      }

      const { data, error } = await supabase.from("students").insert(payload).select().single();
      if (error) throw error;
      return data as Student;
    },
    onSuccess: (student) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.student(student.id) });
    },
  });
}

export function useArchiveStudent() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from("students").update({ is_active: isActive }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student"] });
    },
  });
}
