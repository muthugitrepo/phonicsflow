"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "./keys";
import type { ClassInput, ClassNotesInput } from "@/lib/validations";
import type { ClassWithStudent } from "@/lib/types";

const CLASS_SELECT = "*, student:students(id, name, level)";

export interface ClassFilters {
  date?: string;
  from?: string;
  to?: string;
  studentId?: string;
  status?: "scheduled" | "completed" | "cancelled";
  limit?: number;
}

export function useClasses(filters: ClassFilters = {}) {
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.classes(filters),
    queryFn: async (): Promise<ClassWithStudent[]> => {
      let query = supabase
        .from("classes")
        .select(CLASS_SELECT)
        .order("scheduled_date", { ascending: false })
        .order("scheduled_time", { ascending: true });

      if (filters.date) query = query.eq("scheduled_date", filters.date);
      if (filters.from) query = query.gte("scheduled_date", filters.from);
      if (filters.to) query = query.lte("scheduled_date", filters.to);
      if (filters.studentId) query = query.eq("student_id", filters.studentId);
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.limit) query = query.limit(filters.limit);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as ClassWithStudent[];
    },
  });
}

export function useSaveClass() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: ClassInput }) => {
      if (id) {
        const { error } = await supabase.from("classes").update(values).eq("id", id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("classes").insert(values);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  });
}

/** Saves the four note sections plus attendance, and closes out the session. */
export function useSaveClassNotes() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ClassNotesInput }) => {
      const { error } = await supabase
        .from("classes")
        .update({ ...values, attendance: values.attendance ?? null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["student"] });
    },
  });
}

export function useUpdateClassStatus() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      attendance,
    }: {
      id: string;
      status: "scheduled" | "completed" | "cancelled";
      attendance?: "present" | "absent" | "late" | null;
    }) => {
      const { error } = await supabase
        .from("classes")
        .update({ status, ...(attendance !== undefined ? { attendance } : {}) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  });
}

export function useDeleteClass() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("classes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  });
}
