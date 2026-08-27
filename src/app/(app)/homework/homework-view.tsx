"use client";

import * as React from "react";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { useHomework, useSetHomeworkStatus } from "@/lib/queries/homework";
import { HomeworkFormModal } from "@/components/features/homework-form-modal";
import { HomeworkCorrectionModal } from "@/components/features/homework-correction-modal";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/charts/stat-tile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState, ErrorState, LoadingRows } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { formatDate, toISODate } from "@/lib/utils";
import type { HomeworkStatus } from "@/lib/database.types";
import type { HomeworkWithStudent } from "@/lib/types";

export function HomeworkView() {
  const [tab, setTab] = React.useState<HomeworkStatus | "all">("all");
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [correcting, setCorrecting] = React.useState<HomeworkWithStudent | null>(null);

  const { data, isLoading, error } = useHomework();
  const setStatus = useSetHomeworkStatus();
  const { toast } = useToast();

  const items = data ?? [];
  const today = toISODate();

  const counts = {
    assigned: items.filter((item) => item.status === "assigned").length,
    submitted: items.filter((item) => item.status === "submitted").length,
    corrected: items.filter((item) => item.status === "corrected").length,
  };
  const overdue = items.filter((item) => item.status !== "corrected" && item.due_date < today);

  const visible = tab === "all" ? items : items.filter((item) => item.status === tab);

  return (
    <>
      <PageHeader
        title="Homework"
        description="Assign work, collect submissions and send corrections back."
        actions={
          <Button onClick={() => setAssignOpen(true)}>
            <Plus className="h-4 w-4" /> Assign homework
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Assigned" value={counts.assigned} />
        <StatTile label="Awaiting correction" value={counts.submitted} tone={counts.submitted > 0 ? "warning" : "neutral"} />
        <StatTile label="Corrected" value={counts.corrected} tone="good" />
        <StatTile label="Overdue" value={overdue.length} tone={overdue.length > 0 ? "critical" : "neutral"} />
      </div>

      <div className="my-4">
        <Tabs
          className="sm:max-w-lg"
          items={[
            { value: "all", label: "All", count: items.length },
            { value: "assigned", label: "Assigned", count: counts.assigned },
            { value: "submitted", label: "Submitted", count: counts.submitted },
            { value: "corrected", label: "Corrected", count: counts.corrected },
          ]}
          value={tab}
          onChange={(value) => setTab(value as HomeworkStatus | "all")}
        />
      </div>

      {error ? (
        <ErrorState message={(error as Error).message} />
      ) : isLoading ? (
        <Card>
          <LoadingRows rows={4} />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="Nothing here"
            description="Assign homework from a class or straight from a student's profile."
            action={<Button size="sm" onClick={() => setAssignOpen(true)}>Assign homework</Button>}
          />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {visible.map((item) => {
              const isOverdue = item.status !== "corrected" && item.due_date < today;
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{item.topic}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                      <Link
                        href={`/students/${item.student_id}`}
                        className="hover:text-brand hover:underline"
                      >
                        {item.student?.name ?? "Student"}
                      </Link>
                      <span>· due {formatDate(item.due_date)}</span>
                      {isOverdue ? <Badge tone="critical">Overdue</Badge> : null}
                      {item.score !== null ? <Badge tone="neutral">{item.score}/100</Badge> : null}
                    </p>
                  </div>

                  <Badge
                    tone={
                      item.status === "corrected"
                        ? "good"
                        : item.status === "submitted"
                          ? "brand"
                          : "warning"
                    }
                  >
                    {item.status}
                  </Badge>

                  <div className="flex items-center gap-1">
                    {item.status === "assigned" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await setStatus.mutateAsync({ id: item.id, status: "submitted" });
                          toast("Marked as submitted");
                        }}
                      >
                        Mark submitted
                      </Button>
                    ) : null}
                    <Button size="sm" variant="secondary" onClick={() => setCorrecting(item)}>
                      {item.status === "corrected" ? "View" : "Correct"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <HomeworkFormModal open={assignOpen} onClose={() => setAssignOpen(false)} />
      <HomeworkCorrectionModal
        homework={correcting}
        open={Boolean(correcting)}
        onClose={() => setCorrecting(null)}
      />
    </>
  );
}
