"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "./keys";
import type { MonthlyReport } from "@/lib/types";

export function useMonthlyReports() {
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.monthlyReports(),
    queryFn: async (): Promise<MonthlyReport[]> => {
      const { data, error } = await supabase
        .from("monthly_reports")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MonthlyReport[];
    },
  });
}

/** Aggregation runs server-side so one request replaces a fan-out of queries. */
export function useGenerateMonthlyReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ year, month }: { year: number; month: number }) => {
      const response = await fetch("/api/reports/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not generate the report");
      return payload as MonthlyReport;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.monthlyReports() }),
  });
}

export function useSubmitMonthlyReport() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string | null }) => {
      const { error } = await supabase
        .from("monthly_reports")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
          ...(notes !== undefined ? { notes } : {}),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.monthlyReports() }),
  });
}

/** Head-only: send this week's report to chosen recipients. */
export function useSendWeeklyReport() {
  return useMutation({
    mutationFn: async (input: {
      to: string[];
      week?: string | null;
    }): Promise<{ recipients: string[]; replyTo: string }> => {
      const response = await fetch("/api/reports/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not send the report");
      return payload;
    },
  });
}
