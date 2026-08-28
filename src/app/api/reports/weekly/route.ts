import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { composeWeeklyEmail } from "@/lib/email/compose-weekly";
import { sendEmail } from "@/lib/email/send";
import { weeklyEmailSchema } from "@/lib/validations";

export const maxDuration = 60;

/**
 * Sends the weekly report to recipients the user chooses.
 *
 * The Head sends an academy-wide report. A lead trainer sends the same report
 * scoped to their own team — themselves plus their direct reports — so the
 * email can never contain more than their role already lets them see.
 *
 * The From address stays the verified sending domain — providers reject mail
 * from domains they cannot authenticate. The sender's identity travels as the
 * display name and Reply-To instead, so replies reach them directly.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "team_head" && profile?.role !== "lead_trainer") {
    return NextResponse.json(
      { error: "Only the Head or a lead trainer can send this report" },
      { status: 403 },
    );
  }

  const parsed = weeklyEmailSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the recipients and try again" },
      { status: 400 },
    );
  }

  // The scope is derived from the caller's own row, never from the request.
  let scope: { trainerIds: string[]; label: string } | undefined;
  if (profile.role === "lead_trainer") {
    const admin = createAdminClient();
    const { data: reports, error: reportsError } = await admin
      .from("users")
      .select("id")
      .eq("reports_to", user.id);

    if (reportsError) {
      return NextResponse.json({ error: reportsError.message }, { status: 500 });
    }

    scope = {
      trainerIds: [user.id, ...(reports ?? []).map((row) => row.id)],
      label: `${profile.full_name}'s team`,
    };
  }

  const { subject, html, text, week } = await composeWeeklyEmail(parsed.data.week, scope);

  try {
    const result = await sendEmail({
      to: parsed.data.to,
      subject,
      html,
      text,
      fromName: `${profile.full_name} via PhonicsFlow`,
      replyTo: profile.email,
    });
    return NextResponse.json({
      sent: true,
      id: result.id,
      week,
      recipients: parsed.data.to,
      replyTo: profile.email,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send the email" },
      { status: 502 },
    );
  }
}
