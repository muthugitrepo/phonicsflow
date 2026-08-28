import { z } from "zod";

/**
 * Each schema exports two types:
 *   <Name>FormValues — what the inputs hold before parsing (react-hook-form)
 *   <Name>Input      — what the schema produces after coercion and transforms
 * Forms are typed useForm<FormValues, unknown, Input> so handleSubmit hands the
 * mutation the parsed shape.
 */

/**
 * An empty number input arrives as "", which z.coerce turns into 0 — wrong for
 * "not answered". Normalise to null before coercion.
 */
const optionalNumber = (min: number, max: number) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    z.coerce.number().int().min(min).max(max).nullable(),
  );

const optionalText = (max = 2000) =>
  z
    .string()
    .max(max)
    .trim()
    .optional()
    .transform((value) => (value ? value : null));

export const signInSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const studentSchema = z.object({
  name: z.string().min(2, "Name is required").max(120),
  age: optionalNumber(2, 99).optional(),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  trainer_id: z.string().uuid().nullable().optional(),
  parent_name: optionalText(120),
  parent_email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : null)),
  parent_phone: optionalText(40),
  class_day: optionalNumber(0, 6).optional(),
  class_time: optionalText(10),
  notes: optionalText(),
});
export type StudentFormValues = z.input<typeof studentSchema>;
export type StudentInput = z.output<typeof studentSchema>;

export const classSchema = z.object({
  student_id: z.string().uuid("Select a student"),
  scheduled_date: z.string().min(1, "Pick a date"),
  scheduled_time: z.string().min(1, "Pick a time"),
  duration_minutes: z.coerce.number().int().min(10).max(180).default(30),
  status: z.enum(["scheduled", "completed", "cancelled"]).default("scheduled"),
});
export type ClassFormValues = z.input<typeof classSchema>;
export type ClassInput = z.output<typeof classSchema>;

export const classNotesSchema = z.object({
  topics_covered: z.array(z.string().min(1)).default([]),
  attendance: z.enum(["present", "absent", "late"]).nullable().optional(),
  revision_notes: optionalText(),
  dictation_notes: optionalText(),
  reading_notes: optionalText(),
  pronunciation_notes: optionalText(),
  notes: optionalText(),
  status: z.enum(["scheduled", "completed", "cancelled"]).default("completed"),
});
export type ClassNotesInput = z.infer<typeof classNotesSchema>;

export const homeworkSchema = z.object({
  student_id: z.string().uuid("Select a student"),
  topic: z.string().min(2, "Topic is required").max(160),
  description: optionalText(),
  assigned_date: z.string().min(1),
  due_date: z.string().min(1, "Pick a due date"),
});
export type HomeworkFormValues = z.input<typeof homeworkSchema>;
export type HomeworkInput = z.output<typeof homeworkSchema>;

export const homeworkCorrectionSchema = z.object({
  corrections: z.string().min(1, "Add a correction note").max(4000),
  score: optionalNumber(0, 100).optional(),
});
export type HomeworkCorrectionFormValues = z.input<typeof homeworkCorrectionSchema>;
export type HomeworkCorrectionInput = z.output<typeof homeworkCorrectionSchema>;

export const soundSchema = z.object({
  category: z.enum(["consonant", "consonant_digraph", "vowel_digraph"]),
  sound_name: z.string().min(1, "Sound is required").max(40),
  description: optionalText(400),
  example_words: z
    .array(
      z.object({
        word: z.string().min(1, "Word is required").max(60),
        example_sentence: z.string().max(240).default(""),
      }),
    )
    .min(1, "Add at least one example word"),
});
export type SoundFormValues = z.input<typeof soundSchema>;
export type SoundInput = z.output<typeof soundSchema>;

export const parentContactSchema = z.object({
  student_id: z.string().uuid("Select a student"),
  contact_date: z.string().min(1, "Pick a date"),
  method: z.enum(["call", "whatsapp", "email", "in_person", "video_call"]),
  summary: optionalText(),
  next_contact_date: optionalText(10),
});
export type ParentContactFormValues = z.input<typeof parentContactSchema>;
export type ParentContactInput = z.output<typeof parentContactSchema>;

export const parentFeedbackSchema = z.object({
  written_feedback: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .transform((value) => (value ? value : null)),
  rating: optionalNumber(1, 5).optional(),
  video_url: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value ? value : null)),
});
export type ParentFeedbackInput = z.infer<typeof parentFeedbackSchema>;

export const trainerDetailSchema = z.object({
  trainer_id: z.string().uuid(),
  week_ending_date: z.string().min(1, "Pick the week ending date"),
  videos_posted: z.coerce.number().int().min(0).max(500),
  students_count: z.coerce.number().int().min(0).max(500),
  classes_conducted: z.coerce.number().int().min(0).max(1000).default(0),
  issues_notes: optionalText(),
});
export type TrainerDetailFormValues = z.input<typeof trainerDetailSchema>;
export type TrainerDetailInput = z.output<typeof trainerDetailSchema>;

export const trainerSchema = z.object({
  full_name: z.string().min(2, "Name is required").max(120),
  email: z.string().email("Enter a valid email address"),
  phone: optionalText(40),
  role: z.enum(["team_head", "lead_trainer", "trainer"]).default("trainer"),
  reports_to: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : null)),
});
export type TrainerFormValues = z.input<typeof trainerSchema>;
export type TrainerInput = z.output<typeof trainerSchema>;

export const changePasswordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters"),
    confirm: z.string().min(8, "Re-enter the password"),
  })
  .refine((values) => values.password === values.confirm, {
    message: "The passwords do not match",
    path: ["confirm"],
  });
export type ChangePasswordFormValues = z.input<typeof changePasswordSchema>;
export type ChangePasswordInput = z.output<typeof changePasswordSchema>;

export const monthlyReportSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  notes: optionalText(),
});
export type MonthlyReportInput = z.infer<typeof monthlyReportSchema>;

/** Recipients for a manually sent report. Accepts commas, spaces or newlines. */
export const weeklyEmailSchema = z.object({
  to: z
    .array(z.string().email("That is not a valid email address"))
    .min(1, "Add at least one recipient")
    .max(20, "Twenty recipients at most"),
  week: z.string().nullable().optional(),
});
export type WeeklyEmailInput = z.output<typeof weeklyEmailSchema>;

export function parseRecipients(value: string): string[] {
  return [...new Set(value.split(/[,;\s]+/).map((item) => item.trim()).filter(Boolean))];
}
