import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { composeWeeklyEmail } from "@/lib/email/compose-weekly";
import { sendEmail } from "@/lib/email/send";

// Aggregating a week of classes is slower than the default edge budget.
export const maxDuration = 60;

/**
 * Decides whether a request may send the report.
 *
 * Two callers are allowed: Vercel Cron, which presents CRON_SECRET as a bearer
 * token, and a signed-in Head pressing "Send now". Anything else is refused —
 * the endpoint reads the whole academy and sends mail, so it is not public.
 */
async function authorize(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");

  if (secret && header === `Bearer ${secret}`) return { ok: true as const, via: "cron" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: "Not signed in" };

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "team_head") {
    return { ok: false as const, status: 403, error: "Team head access only" };
  }
  return { ok: true as const, via: "manual" };
}

async function run(request: Request) {
  const auth = await authorize(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Default to the week just finished; ?week=yyyy-mm-dd re-runs an older one.
  const requested = new URL(request.url).searchParams.get("week");
  const { subject, html, text, week } = await composeWeeklyEmail(requested);

  const admin = createAdminClient();
  const { data: heads, error } = await admin
    .from("users")
    .select("email")
    .eq("role", "team_head")
    .eq("is_active", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const recipients = (heads ?? []).map((head) => head.email).filter(Boolean);
  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "No active account holds the Head role, so there is nobody to send to." },
      { status: 409 },
    );
  }

  try {
    const result = await sendEmail({
      to: recipients,
      subject,
      html,
      text,
      fromName: "PhonicsFlow",
    });
    return NextResponse.json({ sent: true, id: result.id, week, recipients });
  } catch (sendError) {
    return NextResponse.json(
      { error: sendError instanceof Error ? sendError.message : "Could not send the email" },
      { status: 502 },
    );
  }
}

// Vercel Cron issues GET; the in-app "Send now" button posts.
export const GET = run;
export const POST = run;
