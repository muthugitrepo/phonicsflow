/**
 * Hand-maintained mirror of supabase/schema.sql.
 * Regenerate with:
 *   npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type UserRole = "team_head" | "lead_trainer" | "trainer" | "parent";
export type StudentLevel = "beginner" | "intermediate" | "advanced";
export type ClassStatus = "scheduled" | "completed" | "cancelled";
export type AttendanceStatus = "present" | "absent" | "late";
export type HomeworkStatus = "assigned" | "submitted" | "corrected";
export type SoundCategory = "consonant" | "consonant_digraph" | "vowel_digraph";
export type ContactMethod = "call" | "whatsapp" | "email" | "in_person" | "video_call";
export type ReportStatus = "draft" | "submitted";

export type ExampleWord = {
  word: string;
  example_sentence: string;
}

type UsersRow = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  /** The lead trainer this user reports to. Null for the Head. */
  reports_to: string | null;
  phone: string | null;
  is_active: boolean;
  /** True until a Head-provisioned user replaces their temporary password. */
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}

type StudentsRow = {
  id: string;
  name: string;
  age: number | null;
  trainer_id: string | null;
  parent_user_id: string | null;
  level: StudentLevel;
  parent_name: string | null;
  parent_email: string | null;
  parent_phone: string | null;
  class_day: number | null;
  class_time: string | null;
  start_date: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type ClassesRow = {
  id: string;
  student_id: string;
  trainer_id: string | null;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  topics_covered: string[];
  status: ClassStatus;
  attendance: AttendanceStatus | null;
  revision_notes: string | null;
  dictation_notes: string | null;
  reading_notes: string | null;
  pronunciation_notes: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type PhonicsSoundsRow = {
  id: string;
  category: SoundCategory;
  sound_name: string;
  description: string | null;
  example_words: ExampleWord[];
  display_order: number;
  created_at: string;
  updated_at: string;
}

type HomeworkRow = {
  id: string;
  student_id: string;
  class_id: string | null;
  assigned_date: string;
  due_date: string;
  topic: string;
  description: string | null;
  status: HomeworkStatus;
  submission_url: string | null;
  corrections: string | null;
  score: number | null;
  created_at: string;
  updated_at: string;
}

type ParentContactsRow = {
  id: string;
  student_id: string;
  trainer_id: string | null;
  contact_date: string;
  method: ContactMethod;
  summary: string | null;
  next_contact_date: string | null;
  created_at: string;
}

type ParentFeedbackRow = {
  id: string;
  student_id: string;
  submission_date: string;
  video_url: string | null;
  written_feedback: string | null;
  rating: number | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  created_at: string;
}

type FeedbackLinksRow = {
  id: string;
  token: string;
  student_id: string;
  expires_at: string;
  created_by: string | null;
  used_at: string | null;
  created_at: string;
}

type TrainerDetailsRow = {
  id: string;
  trainer_id: string;
  week_ending_date: string;
  videos_posted: number;
  students_count: number;
  classes_conducted: number;
  issues_notes: string | null;
  submitted_at: string;
}

type MonthlyReportsRow = {
  id: string;
  year: number;
  month: number;
  summary_data: Json;
  notes: string | null;
  status: ReportStatus;
  generated_by: string | null;
  generated_at: string;
  submitted_at: string | null;
}

type MenuPermissionsRow = {
  id: string;
  role: UserRole;
  item_key: string;
  visible: boolean;
  updated_at: string;
};

type Insert<T, Optional extends keyof T> = Omit<T, Optional> & Partial<Pick<T, Optional>>;
type Timestamps = "id" | "created_at" | "updated_at";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UsersRow;
        Insert: Insert<UsersRow, Timestamps | "phone" | "is_active" | "reports_to" | "must_change_password">;
        Update: Partial<UsersRow>;
        Relationships: [];
      };
      students: {
        Row: StudentsRow;
        Insert: Insert<StudentsRow, Timestamps | keyof Omit<StudentsRow, "name">>;
        Update: Partial<StudentsRow>;
        Relationships: [];
      };
      classes: {
        Row: ClassesRow;
        Insert: Insert<
          ClassesRow,
          Timestamps | keyof Omit<ClassesRow, "student_id" | "scheduled_date" | "scheduled_time">
        >;
        Update: Partial<ClassesRow>;
        Relationships: [];
      };
      phonics_sounds: {
        Row: PhonicsSoundsRow;
        Insert: Insert<PhonicsSoundsRow, Timestamps | "description" | "display_order">;
        Update: Partial<PhonicsSoundsRow>;
        Relationships: [];
      };
      homework: {
        Row: HomeworkRow;
        Insert: Insert<
          HomeworkRow,
          Timestamps | keyof Omit<HomeworkRow, "student_id" | "due_date" | "topic">
        >;
        Update: Partial<HomeworkRow>;
        Relationships: [];
      };
      parent_contacts: {
        Row: ParentContactsRow;
        Insert: Insert<
          ParentContactsRow,
          "id" | "created_at" | "trainer_id" | "summary" | "next_contact_date"
        >;
        Update: Partial<ParentContactsRow>;
        Relationships: [];
      };
      parent_feedback: {
        Row: ParentFeedbackRow;
        Insert: Insert<
          ParentFeedbackRow,
          "id" | "created_at" | keyof Omit<ParentFeedbackRow, "student_id">
        >;
        Update: Partial<ParentFeedbackRow>;
        Relationships: [];
      };
      feedback_links: {
        Row: FeedbackLinksRow;
        Insert: Insert<FeedbackLinksRow, "id" | "created_at" | "used_at" | "created_by">;
        Update: Partial<FeedbackLinksRow>;
        Relationships: [];
      };
      trainer_details: {
        Row: TrainerDetailsRow;
        Insert: Insert<
          TrainerDetailsRow,
          "id" | "submitted_at" | "issues_notes" | "classes_conducted"
        >;
        Update: Partial<TrainerDetailsRow>;
        Relationships: [];
      };
      menu_permissions: {
        Row: MenuPermissionsRow;
        Insert: Insert<MenuPermissionsRow, "id" | "updated_at" | "visible">;
        Update: Partial<MenuPermissionsRow>;
        Relationships: [];
      };
      monthly_reports: {
        Row: MonthlyReportsRow;
        Insert: Insert<
          MonthlyReportsRow,
          "id" | "generated_at" | "notes" | "status" | "generated_by" | "submitted_at"
        >;
        Update: Partial<MonthlyReportsRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      user_role: UserRole;
      student_level: StudentLevel;
      class_status: ClassStatus;
      attendance_status: AttendanceStatus;
      homework_status: HomeworkStatus;
      sound_category: SoundCategory;
      contact_method: ContactMethod;
      report_status: ReportStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
}

type PublicTables = Database["public"]["Tables"];
export type Tables<T extends keyof PublicTables> = PublicTables[T]["Row"];
export type TablesInsert<T extends keyof PublicTables> = PublicTables[T]["Insert"];
export type TablesUpdate<T extends keyof PublicTables> = PublicTables[T]["Update"];
