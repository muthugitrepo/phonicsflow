"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "./keys";
import { BUCKETS } from "@/lib/constants";
import type { HomeworkCorrectionInput, HomeworkInput } from "@/lib/validations";
import type { HomeworkStatus } from "@/lib/database.types";
import type { HomeworkWithStudent } from "@/lib/types";

const HOMEWORK_SELECT = "*, student:students(id, name)";

export function useHomework(filters: { studentId?: string; status?: HomeworkStatus } = {}) {
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.homework(filters),
    queryFn: async (): Promise<HomeworkWithStudent[]> => {
      let query = supabase
        .from("homework")
        .select(HOMEWORK_SELECT)
        .order("due_date", { ascending: false });

      if (filters.studentId) query = query.eq("student_id", filters.studentId);
      if (filters.status) query = query.eq("status", filters.status);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as HomeworkWithStudent[];
    },
  });
}

export function useAssignHomework() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: HomeworkInput) => {
      const { error } = await supabase.from("homework").insert(values);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["homework"] }),
  });
}

export function useCorrectHomework() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: HomeworkCorrectionInput }) => {
      const { error } = await supabase
        .from("homework")
        .update({ ...values, score: values.score ?? null, status: "corrected" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["homework"] }),
  });
}

export function useSetHomeworkStatus() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: HomeworkStatus }) => {
      const { error } = await supabase.from("homework").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["homework"] }),
  });
}

/**
 * Uploads a submission to the private `homework` bucket. The object key starts
 * with the student id — that first path segment is what the storage RLS policy
 * checks.
 */
export function useUploadSubmission() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      homeworkId,
      studentId,
      file,
    }: {
      homeworkId: string;
      studentId: string;
      file: File;
    }) => {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${studentId}/${homeworkId}-${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKETS.homework)
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;

      const { error } = await supabase
        .from("homework")
        .update({ submission_url: path, status: "submitted" })
        .eq("id", homeworkId);
      if (error) throw error;
      return path;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["homework"] }),
  });
}

/** Private buckets need a signed URL before anything can be opened. */
export function useSignedUrl() {
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ bucket, path }: { bucket: string; path: string }) => {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}
