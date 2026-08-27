import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveFeedbackToken } from "@/lib/feedback-links";
import { BUCKETS } from "@/lib/constants";

/**
 * Hands the parent's browser a one-shot signed upload URL. The file goes
 * straight to Supabase Storage, so it never passes through the serverless
 * function's request body limit.
 */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const context = await resolveFeedbackToken(token);

  if (!context) {
    return NextResponse.json({ error: "This link is no longer valid." }, { status: 404 });
  }

  const body = (await request.json()) as { fileName?: string };
  const safeName = (body.fileName ?? "video").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = `${context.studentId}/${Date.now()}-${safeName}`;

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(BUCKETS.feedback).createSignedUploadUrl(path);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ path: data.path, token: data.token, bucket: BUCKETS.feedback });
}
