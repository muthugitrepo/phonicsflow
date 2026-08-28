import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { trainerSchema } from "@/lib/validations";

// Ambiguous glyphs removed — this password gets read aloud and retyped.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function temporaryPassword() {
  const groups = Array.from({ length: 3 }, () =>
    Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join(""),
  );
  return groups.join("-");
}

/**
 * Provision a sign-in account plus profile.
 *
 * public.users.id is a foreign key to auth.users, so a profile cannot exist
 * without an auth account — which only the service-role key can create. The
 * caller's own session is checked first; the admin client is used strictly
 * after that.
 *
 * Who may call it:
 *   Head         — any role, any reporting line
 *   Lead trainer — plain trainers reporting to themselves, and nothing else
 *
 * The clamp below is the ONLY thing enforcing that second rule. The profile
 * update runs through the admin client, which bypasses guard_user_role(), so
 * a lead trainer posting {"role":"team_head"} would otherwise be obeyed.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  const callerRole = profile?.role;

  if (callerRole !== "team_head" && callerRole !== "lead_trainer") {
    return NextResponse.json(
      { error: "Only the Head or a lead trainer can create accounts" },
      { status: 403 },
    );
  }

  const parsed = trainerSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the form and try again" },
      { status: 400 },
    );
  }

  const { full_name, email, phone } = parsed.data;
  const isHead = callerRole === "team_head";

  // Never trust the submitted role/reporting line from a lead trainer.
  const role = isHead ? parsed.data.role : "trainer";
  const reportsTo = isHead
    ? (role === "trainer" ? (parsed.data.reports_to ?? null) : null)
    : user.id;
  const password = temporaryPassword();
  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // provisioned by the Head; no confirmation round-trip
    user_metadata: { full_name },
  });

  if (createError || !created.user) {
    const alreadyExists = createError?.message?.toLowerCase().includes("already");
    return NextResponse.json(
      {
        error: alreadyExists
          ? "An account already exists for that email address."
          : (createError?.message ?? "Could not create the account"),
      },
      { status: alreadyExists ? 409 : 500 },
    );
  }

  // handle_new_user has already inserted the profile as a plain trainer; apply
  // what the Head actually asked for. The role guard exempts service-role
  // sessions, so this is allowed to set role and reports_to.
  const { error: profileError } = await admin
    .from("users")
    .update({
      full_name,
      phone: phone ?? null,
      role,
      reports_to: reportsTo,
      must_change_password: true,
    })
    .eq("id", created.user.id);

  if (profileError) {
    // Don't strand an auth account with no usable profile.
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ email, password, full_name });
}
