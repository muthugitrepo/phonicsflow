import type {
  AttendanceStatus,
  ClassStatus,
  ContactMethod,
  HomeworkStatus,
  SoundCategory,
  StudentLevel,
  UserRole,
} from "@/lib/database.types";

export const ROLE_LABELS: Record<UserRole, string> = {
  team_head: "Team Head",
  trainer: "Trainer",
  parent: "Parent",
};

export const LEVEL_LABELS: Record<StudentLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const CLASS_STATUS_LABELS: Record<ClassStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
};

export const HOMEWORK_STATUS_LABELS: Record<HomeworkStatus, string> = {
  assigned: "Assigned",
  submitted: "Submitted",
  corrected: "Corrected",
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
