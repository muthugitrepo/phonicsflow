"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/database.types";
import type { Profile } from "@/lib/types";

/** Every account, including parents — the Head's roster view. */
export function useAllUsers() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["all-users"],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase.from("users").select("*").order("full_name");
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });
}

export interface MenuPermission {
  role: UserRole;
  item_key: string;
  visible: boolean;
}

export function useMenuPermissions() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["menu-permissions"],
    queryFn: async (): Promise<MenuPermission[]> => {
      const { data, error } = await supabase
        .from("menu_permissions")
        .select("role, item_key, visible");
      if (error) throw error;
      return (data ?? []) as MenuPermission[];
    },
  });
}

export function useSetMenuPermission() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ role, itemKey, visible }: { role: UserRole; itemKey: string; visible: boolean }) => {
      // One row per (role, item) — toggling again updates in place.
      const { error } = await supabase
        .from("menu_permissions")
        .upsert(
          { role, item_key: itemKey, visible, updated_at: new Date().toISOString() },
          { onConflict: "role,item_key" },
        );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["menu-permissions"] }),
  });
}

export function useSetUserActive() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from("users").update({ is_active: isActive }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      queryClient.invalidateQueries({ queryKey: ["trainers"] });
    },
  });
}
