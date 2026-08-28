"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "./keys";
import type { UserRole } from "@/lib/database.types";
import type { TrainerDetailInput, TrainerInput } from "@/lib/validations";
import type { Profile, TrainerDetailWithTrainer, TrainerSummary } from "@/lib/types";

export function useTrainers() {
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.trainers(),
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .in("role", ["trainer", "lead_trainer", "team_head"])
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });
}

export function useTrainerDetails(filters: { weekEnding?: string; trainerId?: string } = {}) {
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.trainerDetails(filters),
    queryFn: async (): Promise<TrainerDetailWithTrainer[]> => {
      let query = supabase
        .from("trainer_details")
        .select("*, trainer:users!trainer_details_trainer_id_fkey(id, full_name, email)")
        .order("week_ending_date", { ascending: false });

      if (filters.weekEnding) query = query.eq("week_ending_date", filters.weekEnding);
      if (filters.trainerId) query = query.eq("trainer_id", filters.trainerId);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as TrainerDetailWithTrainer[];
    },
  });
}

/**
 * The team head's weekly view: every trainer with their live student count and
 * this week's submitted report (or the absence of one).
 */
export function useTrainerSummaries(weekEnding: string, enabled = true) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["trainer-summaries", weekEnding],
    enabled,
    queryFn: async (): Promise<TrainerSummary[]> => {
      const [trainersResult, studentsResult, detailsResult] = await Promise.all([
        supabase
          .from("users")
          .select("*")
          .in("role", ["trainer", "lead_trainer"])
          .order("full_name"),
        supabase.from("students").select("id, trainer_id").eq("is_active", true),
        supabase.from("trainer_details").select("*").eq("week_ending_date", weekEnding),
      ]);

      if (trainersResult.error) throw trainersResult.error;
      if (studentsResult.error) throw studentsResult.error;
      if (detailsResult.error) throw detailsResult.error;

      const counts = new Map<string, number>();
      for (const student of studentsResult.data ?? []) {
        if (!student.trainer_id) continue;
        counts.set(student.trainer_id, (counts.get(student.trainer_id) ?? 0) + 1);
      }

      const details = new Map((detailsResult.data ?? []).map((row) => [row.trainer_id, row]));

      return (trainersResult.data ?? []).map((trainer) => {
        const latestReport = details.get(trainer.id) ?? null;
        return {
          trainer: trainer as Profile,
          studentCount: counts.get(trainer.id) ?? 0,
          latestReport,
          videosPosted: latestReport?.videos_posted ?? 0,
        };
      });
    },
  });
}

export function useSubmitTrainerDetail() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: TrainerDetailInput) => {
      // One row per trainer per week — resubmitting updates in place.
      const { error } = await supabase
        .from("trainer_details")
        .upsert({ ...values, submitted_at: new Date().toISOString() }, {
          onConflict: "trainer_id,week_ending_date",
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-details"] });
      queryClient.invalidateQueries({ queryKey: ["trainer-summaries"] });
    },
  });
}

/** Head-only: change someone's role. Enforced by a trigger, not just the UI. */
export function useUpdateUserRole() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      const { error } = await supabase.from("users").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trainers() });
      queryClient.invalidateQueries({ queryKey: ["trainer-summaries"] });
    },
  });
}

/** Head-only: set which lead trainer someone reports to. */
export function useUpdateReportsTo() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reportsTo }: { id: string; reportsTo: string | null }) => {
      const { error } = await supabase.from("users").update({ reports_to: reportsTo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trainers() });
      queryClient.invalidateQueries({ queryKey: ["trainer-summaries"] });
    },
  });
}

export interface ProvisionedTrainer {
  email: string;
  password: string;
  full_name: string;
}

/** Head-only: create an auth account plus profile in one call. */
export function useCreateTrainer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: TrainerInput): Promise<ProvisionedTrainer> => {
      const response = await fetch("/api/trainers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not create the account");
      return payload as ProvisionedTrainer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trainers() });
      queryClient.invalidateQueries({ queryKey: ["trainer-summaries"] });
    },
  });
}
