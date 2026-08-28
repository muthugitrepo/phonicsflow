import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Profile } from "@/lib/types";
import type { MenuOverrides } from "@/components/layout/nav-items";

/**
 * Resolves the signed-in user's profile for a Server Component.
 * Redirects to /setup or /login rather than throwing, so layouts stay simple.
 */
export async function requireProfile(): Promise<Profile> {
  if (!isSupabaseConfigured) redirect("/setup");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();

  if (!profile) {
    // Auth row exists but the profile trigger has not run — treat as new signup.
    return {
      id: user.id,
      email: user.email ?? "",
      full_name: user.email?.split("@")[0] ?? "Trainer",
      role: "trainer",
      reports_to: null,
      phone: null,
      is_active: true,
      must_change_password: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return profile as Profile;
}

/**
 * The Head's menu overrides for one role. Returns an empty map when the table
 * has not been created yet, so the app keeps working before migration 0005.
 */
export async function getMenuOverrides(role: Profile["role"]): Promise<MenuOverrides> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_permissions")
    .select("item_key, visible")
    .eq("role", role);

  if (error || !data) return {};
  return Object.fromEntries(data.map((row) => [row.item_key, row.visible]));
}
