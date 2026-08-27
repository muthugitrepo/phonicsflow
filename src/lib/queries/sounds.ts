"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "./keys";
import type { SoundInput } from "@/lib/validations";
import type { PhonicsSound } from "@/lib/types";

export function useSounds() {
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.sounds(),
    // Reference material changes rarely — keep it cached across navigations.
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<PhonicsSound[]> => {
      const { data, error } = await supabase
        .from("phonics_sounds")
        .select("*")
        .order("category")
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as PhonicsSound[];
    },
  });
}

export function useSaveSound() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: SoundInput }) => {
      if (id) {
        const { error } = await supabase.from("phonics_sounds").update(values).eq("id", id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("phonics_sounds").insert(values);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.sounds() }),
  });
}

export function useDeleteSound() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("phonics_sounds").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.sounds() }),
  });
}
