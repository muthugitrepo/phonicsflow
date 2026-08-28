import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { composeWeeklyEmail } from "@/lib/email/compose-weekly";
import { sendEmail } from "@/lib/email/send";
import { weeklyEmailSchema } from "@/lib/validations";

export const maxDuration = 60;

/**
 * Sends the weekly report to recipients the user chooses.
 *
 * Head-only: the report aggregates every trainer and student in the academy,
 * so a lead trainer sending it would hand over data their own role cannot see.
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

  if (profile?.role !== "team_head") {
    return NextResponse.json({ error: "Team head access only" }, { status: 403 });
  }

  const parsed = weeklyEmailSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the recipients and try again" },
      { status: 400 },
    );
  }

  const { subject, html, text, week } = await composeWeeklyEmail(parsed.data.week);

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
