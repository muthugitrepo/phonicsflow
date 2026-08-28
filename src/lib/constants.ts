import type {
  AttendanceStatus,
  ContactMethod,
  SoundCategory,
  StudentLevel,
  UserRole,
} from "@/lib/database.types";

export const ROLE_LABELS: Record<UserRole, string> = {
  team_head: "Head",
  lead_trainer: "Lead Trainer",
  trainer: "Trainer",
  parent: "Parent",
};

/** Roles that can be assigned from the Trainers page, in seniority order. */
export const ASSIGNABLE_ROLES: UserRole[] = ["team_head", "lead_trainer", "trainer"];

export const LEVEL_LABELS: Record<StudentLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
};

export const SOUND_CATEGORY_LABELS: Record<SoundCategory, string> = {
  consonant: "Consonants",
  consonant_digraph: "Consonant digraphs",
  vowel_digraph: "Vowel digraphs",
};

export const CONTACT_METHOD_LABELS: Record<ContactMethod, string> = {
  call: "Phone call",
  whatsapp: "WhatsApp",
  email: "Email",
  in_person: "In person",
  video_call: "Video call",
};

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const DEFAULT_CLASS_MINUTES = 30;

/** Supabase Storage buckets created by supabase/schema.sql. */
export const BUCKETS = {
  homework: "homework",
  feedback: "feedback-videos",
} as const;

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
