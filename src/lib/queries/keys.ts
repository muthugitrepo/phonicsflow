export const queryKeys = {
  students: (scope: unknown = "all") => ["students", scope] as const,
  student: (id: string) => ["student", id] as const,
  classes: (filters: unknown = {}) => ["classes", filters] as const,
  homework: (filters: unknown = {}) => ["homework", filters] as const,
  sounds: () => ["sounds"] as const,
  parentContacts: (filters: unknown = {}) => ["parent-contacts", filters] as const,
  parentFeedback: (filters: unknown = {}) => ["parent-feedback", filters] as const,
  trainers: () => ["trainers"] as const,
  trainerDetails: (filters: unknown = {}) => ["trainer-details", filters] as const,
  monthlyReports: () => ["monthly-reports"] as const,
};
