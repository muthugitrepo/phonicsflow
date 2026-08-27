import type { Tables } from "@/lib/database.types";

export type Profile = Tables<"users">;
export type Student = Tables<"students">;
export type ClassSession = Tables<"classes">;
export type PhonicsSound = Tables<"phonics_sounds">;
export type Homework = Tables<"homework">;
export type ParentContact = Tables<"parent_contacts">;
export type ParentFeedback = Tables<"parent_feedback">;
export type TrainerDetail = Tables<"trainer_details">;
export type MonthlyReport = Tables<"monthly_reports">;

/** Shapes returned by the joined selects in `lib/queries`. */
export type StudentWithTrainer = Student & {
  trainer: Pick<Profile, "id" | "full_name" | "email"> | null;
};

export type ClassWithStudent = ClassSession & {
  student: Pick<Student, "id" | "name" | "level"> | null;
};

export type HomeworkWithStudent = Homework & {
  student: Pick<Student, "id" | "name"> | null;
};

export type FeedbackWithStudent = ParentFeedback & {
  student: Pick<Student, "id" | "name"> | null;
};

export type ContactWithStudent = ParentContact & {
  student: Pick<Student, "id" | "name" | "parent_name"> | null;
};

export type TrainerDetailWithTrainer = TrainerDetail & {
  trainer: Pick<Profile, "id" | "full_name" | "email"> | null;
};

export interface TrainerSummary {
  trainer: Profile;
  studentCount: number;
  latestReport: TrainerDetail | null;
  videosPosted: number;
}

export interface StudentProgress {
  totalClasses: number;
  completedClasses: number;
  attendanceRate: number;
  homeworkAssigned: number;
  homeworkCorrected: number;
  homeworkCompletionRate: number;
  soundsCovered: string[];
  lastClassDate: string | null;
}

export interface MonthlySummary {
  year: number;
  month: number;
  activeTrainers: number;
  activeStudents: number;
  classesCompleted: number;
  classesCancelled: number;
  attendanceRate: number;
  videosPosted: number;
  homeworkCorrected: number;
  parentFeedbackCount: number;
  perTrainer: Array<{
    trainerId: string;
    name: string;
    students: number;
    videosPosted: number;
    classesCompleted: number;
    weeklyReportsSubmitted: number;
  }>;
}
