import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveFeedbackToken } from "@/lib/feedback-links";
import { parentFeedbackSchema } from "@/lib/validations";

/**
 * Public endpoint: a parent submits feedback with nothing but the link.
 * The token is the only credential, so it is validated (exists, unused, unexpired)
 * before the service-role client touches anything.
 */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const context = await resolveFeedbackToken(token);

  if (!context) {
    return NextResponse.json({ error: "This link is no longer valid." }, { status: 404 });
  }

  const parsed = parentFeedbackSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form and try again." }, { status: 400 });
  }

  const { written_feedback, rating, video_url } = parsed.data;
  if (!written_feedback && !video_url) {
    return NextResponse.json(
      { error: "Add a written note or a video before sending." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { error } = await admin.from("parent_feedback").insert({
    student_id: context.studentId,
    written_feedback,
    rating: rating ?? null,
    video_url,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Single use — the link stops working once feedback lands.
  await admin.from("feedback_links").update({ used_at: new Date().toISOString() }).eq("token", token);

  return NextResponse.json({ ok: true });
}
