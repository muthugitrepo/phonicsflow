"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "./keys";
import type { ParentContactInput } from "@/lib/validations";
import type { ContactWithStudent, FeedbackWithStudent } from "@/lib/types";

export function useParentContacts(filters: { studentId?: string; limit?: number } = {}) {
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.parentContacts(filters),
    queryFn: async (): Promise<ContactWithStudent[]> => {
      let query = supabase
        .from("parent_contacts")
        .select("*, student:students(id, name, parent_name)")
        .order("contact_date", { ascending: false });

      if (filters.studentId) query = query.eq("student_id", filters.studentId);
      if (filters.limit) query = query.limit(filters.limit);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as ContactWithStudent[];
    },
  });
}

export function useLogParentContact() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: ParentContactInput & { trainer_id?: string | null }) => {
      const { error } = await supabase.from("parent_contacts").insert(values);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["parent-contacts"] }),
  });
}

export function useParentFeedback(filters: { studentId?: string; limit?: number } = {}) {
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.parentFeedback(filters),
    queryFn: async (): Promise<FeedbackWithStudent[]> => {
      let query = supabase
        .from("parent_feedback")
        .select("*, student:students(id, name)")
        .order("submission_date", { ascending: false });

      if (filters.studentId) query = query.eq("student_id", filters.studentId);
      if (filters.limit) query = query.limit(filters.limit);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as FeedbackWithStudent[];
    },
  });
}

export function useAcknowledgeFeedback() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { error } = await supabase
        .from("parent_feedback")
        .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: userId })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["parent-feedback"] }),
  });
}

/** Mints a shareable, expiring feedback link for a student's parent. */
export function useCreateFeedbackLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (studentId: string): Promise<{ url: string; expiresAt: string }> => {
      const response = await fetch("/api/feedback-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not create the link");
      return payload;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["parent-feedback"] }),
  });
}
