import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { monthlyReportSchema } from "@/lib/validations";
import type { MonthlySummary } from "@/lib/types";

/**
 * Aggregates a month into monthly_reports.summary_data.
 *
 * Runs with the caller's own session — RLS already restricts monthly_reports to
 * the team head, so no service-role key is involved.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "team_head") {
    return NextResponse.json({ error: "Team head access only" }, { status: 403 });
  }

  const parsed = monthlyReportSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Pick a valid month" }, { status: 400 });
  }

  const { year, month } = parsed.data;
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const [trainers, students, classes, details, homework, feedback] = await Promise.all([
    supabase.from("users").select("id, full_name").eq("role", "trainer").eq("is_active", true),
    supabase.from("students").select("id, trainer_id").eq("is_active", true),
    supabase.from("classes").select("id, trainer_id, student_id, status, attendance").gte("scheduled_date", from).lte("scheduled_date", to),
    supabase.from("trainer_details").select("trainer_id, videos_posted").gte("week_ending_date", from).lte("week_ending_date", to),
    supabase.from("homework").select("id, status").gte("assigned_date", from).lte("assigned_date", to),
    supabase.from("parent_feedback").select("id").gte("submission_date", from).lte("submission_date", to),
  ]);

  const firstError = [trainers, students, classes, details, homework, feedback].find(
    (result) => result.error,
  )?.error;
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const classRows = classes.data ?? [];
  const studentRows = students.data ?? [];
  const detailRows = details.data ?? [];

  // Classes carry their own trainer_id only when set — fall back to the
  // student's current trainer so per-trainer totals stay complete.
  const trainerByStudent = new Map(studentRows.map((row) => [row.id, row.trainer_id]));
  const trainerOf = (row: { trainer_id: string | null; student_id: string }) =>
    row.trainer_id ?? trainerByStudent.get(row.student_id) ?? null;

  const marked = classRows.filter((row) => row.attendance !== null);
  const attended = marked.filter((row) => row.attendance !== "absent");

  const summary: MonthlySummary = {
    year,
    month,
    activeTrainers: (trainers.data ?? []).length,
    activeStudents: studentRows.length,
    classesCompleted: classRows.filter((row) => row.status === "completed").length,
    classesCancelled: classRows.filter((row) => row.status === "cancelled").length,
    attendanceRate: marked.length === 0 ? 0 : Math.round((attended.length / marked.length) * 100),
    videosPosted: detailRows.reduce((sum, row) => sum + (row.videos_posted ?? 0), 0),
    homeworkCorrected: (homework.data ?? []).filter((row) => row.status === "corrected").length,
    parentFeedbackCount: (feedback.data ?? []).length,
    perTrainer: (trainers.data ?? []).map((trainer) => ({
      trainerId: trainer.id,
      name: trainer.full_name,
      students: studentRows.filter((row) => row.trainer_id === trainer.id).length,
      videosPosted: detailRows
        .filter((row) => row.trainer_id === trainer.id)
        .reduce((sum, row) => sum + (row.videos_posted ?? 0), 0),
      classesCompleted: classRows.filter(
        (row) => row.status === "completed" && trainerOf(row) === trainer.id,
      ).length,
      weeklyReportsSubmitted: detailRows.filter((row) => row.trainer_id === trainer.id).length,
    })),
  };

  const { data, error } = await supabase
    .from("monthly_reports")
    .upsert(
      {
        year,
        month,
        summary_data: summary as never,
        notes: parsed.data.notes,
        generated_by: user.id,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "year,month" },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
