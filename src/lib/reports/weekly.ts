import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { toISODate, startOfWeek, weekEnding } from "@/lib/utils";

export interface WeeklyTrainerRow {
  trainerId: string;
  name: string;
  students: number;
  classesCompleted: number;
  classesCancelled: number;
  attendanceRate: number | null;
  videosPosted: number;
  homeworkCorrected: number;
  reportSubmitted: boolean;
  issues: string | null;
}

export interface WeeklySummary {
  from: string;
  to: string;
  activeStudents: number;
  activeTrainers: number;
  classesScheduled: number;
  classesCompleted: number;
  classesCancelled: number;
  attendanceRate: number | null;
  homeworkAssigned: number;
  homeworkCorrected: number;
  homeworkOverdue: number;
  parentContacts: number;
  parentFeedback: number;
  feedbackUnreviewed: number;
  missingReports: string[];
  studentsWithoutContact: string[];
  trainers: WeeklyTrainerRow[];
}

/** The Sunday-ending week containing `reference` (defaults to today). */
export function resolveWeek(reference = new Date()) {
  return { from: toISODate(startOfWeek(reference)), to: toISODate(weekEnding(reference)) };
}

/**
 * Aggregates one week across the whole academy.
 *
 * Runs with the service-role client because the caller is a cron invocation
 * with no user session. The endpoint that calls it is what checks authority.
 */
export async function buildWeeklySummary(from: string, to: string): Promise<WeeklySummary> {
  const admin = createAdminClient();

  const [users, students, classes, homework, contacts, feedback, details] = await Promise.all([
    admin.from("users").select("id, full_name, role").eq("is_active", true),
    admin.from("students").select("id, name, trainer_id").eq("is_active", true),
    admin
      .from("classes")
      .select("id, trainer_id, student_id, status, attendance")
      .gte("scheduled_date", from)
      .lte("scheduled_date", to),
    admin.from("homework").select("id, student_id, status, due_date, assigned_date"),
    admin
      .from("parent_contacts")
      .select("id, student_id")
      .gte("contact_date", from)
      .lte("contact_date", to),
    admin
      .from("parent_feedback")
      .select("id, acknowledged_at")
      .gte("submission_date", from)
      .lte("submission_date", to),
    admin
      .from("trainer_details")
      .select("trainer_id, videos_posted, issues_notes")
      .eq("week_ending_date", to),
  ]);

  const failed = [users, students, classes, homework, contacts, feedback, details].find(
    (result) => result.error,
  );
  if (failed?.error) throw new Error(failed.error.message);

  const userRows = users.data ?? [];
  const studentRows = students.data ?? [];
  const classRows = classes.data ?? [];
  const homeworkRows = homework.data ?? [];
  const detailRows = details.data ?? [];

  const trainers = userRows.filter((u) => u.role === "trainer" || u.role === "lead_trainer");
  const trainerByStudent = new Map(studentRows.map((s) => [s.id, s.trainer_id]));
  const trainerOf = (row: { trainer_id: string | null; student_id: string }) =>
    row.trainer_id ?? trainerByStudent.get(row.student_id) ?? null;

  const rate = (rows: { attendance: string | null }[]) => {
    const marked = rows.filter((r) => r.attendance !== null);
    if (marked.length === 0) return null;
    return Math.round((marked.filter((r) => r.attendance !== "absent").length / marked.length) * 100);
  };

  const weekHomework = homeworkRows.filter(
    (h) => h.assigned_date >= from && h.assigned_date <= to,
  );
  const detailByTrainer = new Map(detailRows.map((d) => [d.trainer_id, d]));
  const contactedStudents = new Set((contacts.data ?? []).map((c) => c.student_id));

  const trainerRows: WeeklyTrainerRow[] = trainers
    .map((trainer) => {
      const own = studentRows.filter((s) => s.trainer_id === trainer.id);
      const ownIds = new Set(own.map((s) => s.id));
      const sessions = classRows.filter((c) => trainerOf(c) === trainer.id);
      const detail = detailByTrainer.get(trainer.id);

      return {
        trainerId: trainer.id,
        name: trainer.full_name,
        students: own.length,
        classesCompleted: sessions.filter((c) => c.status === "completed").length,
        classesCancelled: sessions.filter((c) => c.status === "cancelled").length,
        attendanceRate: rate(sessions),
        videosPosted: detail?.videos_posted ?? 0,
        homeworkCorrected: weekHomework.filter(
          (h) => ownIds.has(h.student_id) && h.status === "corrected",
        ).length,
        reportSubmitted: Boolean(detail),
        issues: detail?.issues_notes ?? null,
      };
    })
    .sort((a, b) => b.classesCompleted - a.classesCompleted);

  return {
    from,
    to,
    activeStudents: studentRows.length,
    activeTrainers: trainers.length,
    classesScheduled: classRows.length,
    classesCompleted: classRows.filter((c) => c.status === "completed").length,
    classesCancelled: classRows.filter((c) => c.status === "cancelled").length,
    attendanceRate: rate(classRows),
    homeworkAssigned: weekHomework.length,
    homeworkCorrected: weekHomework.filter((h) => h.status === "corrected").length,
    homeworkOverdue: homeworkRows.filter((h) => h.status !== "corrected" && h.due_date < to).length,
    parentContacts: (contacts.data ?? []).length,
    parentFeedback: (feedback.data ?? []).length,
    feedbackUnreviewed: (feedback.data ?? []).filter((f) => !f.acknowledged_at).length,
    missingReports: trainerRows.filter((t) => !t.reportSubmitted).map((t) => t.name),
    studentsWithoutContact: studentRows
      .filter((s) => !contactedStudents.has(s.id))
      .map((s) => s.name),
    trainers: trainerRows,
  };
}
