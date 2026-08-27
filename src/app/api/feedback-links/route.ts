import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({ studentId: z.string().uuid() });

/** Mints an expiring feedback link for a student's parent. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid student" }, { status: 400 });

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);

  // The insert policy calls can_access_student(), so an unrelated student fails here.
  const { error } = await supabase.from("feedback_links").insert({
    token,
    student_id: parsed.data.studentId,
    expires_at: expiresAt.toISOString(),
    created_by: user.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });

  const origin = new URL(request.url).origin;
  return NextResponse.json({
    url: `${origin}/feedback/${token}`,
    expiresAt: expiresAt.toISOString(),
  });
}
