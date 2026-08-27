"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { useStudents } from "@/lib/queries/students";
import { useSession } from "@/components/session-provider";
import { StudentFormModal } from "@/components/features/student-form-modal";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingRows } from "@/components/ui/states";
import { LEVEL_LABELS, WEEKDAYS } from "@/lib/constants";
import { formatTime, initials } from "@/lib/utils";
import type { StudentLevel } from "@/lib/database.types";

export function StudentsView() {
  const profile = useSession();
  const [search, setSearch] = React.useState("");
  const [level, setLevel] = React.useState<StudentLevel | "">("");
  const [includeInactive, setIncludeInactive] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);

  const { data, isLoading, error } = useStudents({ includeInactive });

  const students = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((student) => {
      if (level && student.level !== level) return false;
      if (!term) return true;
      return (
        student.name.toLowerCase().includes(term) ||
        (student.parent_name ?? "").toLowerCase().includes(term)
      );
    });
  }, [data, search, level]);

  return (
    <>
      <PageHeader
        title="Students"
        description={
          profile.role === "team_head"
            ? "Everyone across the academy."
            : "The students assigned to you."
        }
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" /> Add student
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            className="pl-9"
            placeholder="Search students or parents"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search students"
          />
        </div>
        <Select
          className="w-auto"
          value={level}
          onChange={(event) => setLevel(event.target.value as StudentLevel | "")}
          aria-label="Filter by level"
        >
          <option value="">All levels</option>
          {Object.entries(LEVEL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-line accent-[#2a78d6]"
            checked={includeInactive}
            onChange={(event) => setIncludeInactive(event.target.checked)}
          />
          Show archived
        </label>
      </div>

      {error ? (
        <ErrorState message={(error as Error).message} />
      ) : isLoading ? (
        <Card>
          <LoadingRows rows={4} />
        </Card>
      ) : students.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No students yet"
            description="Add your first student to start scheduling classes and tracking progress."
            action={<Button size="sm" onClick={() => setFormOpen(true)}>Add student</Button>}
          />
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {students.map((student) => (
            <li key={student.id}>
              <Link
                href={`/students/${student.id}`}
                className="flex h-full items-start gap-3 rounded-card border border-line bg-surface px-4 py-3.5 transition-colors hover:border-brand-ring hover:bg-brand-soft/40"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-plane text-sm font-semibold text-ink-2">
                  {initials(student.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink">{student.name}</p>
                    {!student.is_active ? <Badge tone="neutral">Archived</Badge> : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {student.age ? `${student.age} yrs · ` : ""}
                    {LEVEL_LABELS[student.level]}
                  </p>
                  <p className="mt-1.5 text-xs text-ink-2">
                    {student.class_day !== null && student.class_time
                      ? `${WEEKDAYS[student.class_day]} · ${formatTime(student.class_time)}`
                      : "No weekly slot set"}
                  </p>
                  {profile.role === "team_head" && student.trainer ? (
                    <p className="mt-1 truncate text-xs text-muted">{student.trainer.full_name}</p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <StudentFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </>
  );
}
