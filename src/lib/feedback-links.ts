import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export interface FeedbackLinkContext {
  studentId: string;
  studentName: string;
  trainerName: string | null;
}

/**
 * Validates a public feedback token. Returns null for unknown, expired or
 * already-used links — the caller decides how to phrase the refusal.
 */
export async function resolveFeedbackToken(token: string): Promise<FeedbackLinkContext | null> {
  if (!token || token.length > 128) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("feedback_links")
    .select(
      "student_id, expires_at, used_at, student:students(name, trainer:users!students_trainer_id_fkey(full_name))",
    )
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return null;
  if (data.used_at) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;

  const student = data.student as unknown as
    | { name: string; trainer: { full_name: string } | null }
    | null;

  return {
    studentId: data.student_id,
    studentName: student?.name ?? "your child",
    trainerName: student?.trainer?.full_name ?? null,
  };
}
