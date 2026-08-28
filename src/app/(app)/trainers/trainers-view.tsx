"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Plus, UserCog, Video } from "lucide-react";
import { useToday } from "@/lib/use-today";
import {
  useTrainerSummaries,
  useUpdateReportsTo,
  useUpdateUserRole,
} from "@/lib/queries/trainers";
import { TrainerDetailModal } from "@/components/features/trainer-detail-modal";
import { TrainerFormModal } from "@/components/features/trainer-form-modal";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/charts/stat-tile";
import { BarChart } from "@/components/charts/bar-chart";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { EmptyState, ErrorState, LoadingRows } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@/lib/constants";
import { formatDate, initials, toISODate, weekEnding } from "@/lib/utils";
import type { Profile, TrainerSummary } from "@/lib/types";

export function TrainersView({ profile }: { profile: Profile }) {
  const isHead = profile.role === "team_head";
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [editing, setEditing] = React.useState<TrainerSummary | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);

  const viewerToday = useToday();
  const weekEndingDate = React.useMemo(() => {
    const date = viewerToday ? new Date(`${viewerToday}T00:00:00`) : new Date();
    date.setDate(date.getDate() + weekOffset * 7);
    return toISODate(weekEnding(date));
  }, [viewerToday, weekOffset]);

  const { data, isLoading, error } = useTrainerSummaries(weekEndingDate);
  const updateRole = useUpdateUserRole();
  const updateReportsTo = useUpdateReportsTo();
  const { toast } = useToast();

  const summaries = data ?? [];
  const leads = summaries
    .filter((row) => row.trainer.role === "lead_trainer")
    .map((row) => row.trainer);
  const submitted = summaries.filter((row) => row.latestReport);
  const totalStudents = summaries.reduce((sum, row) => sum + row.studentCount, 0);
  const totalVideos = summaries.reduce((sum, row) => sum + row.videosPosted, 0);

  const studentBars = summaries
    .map((row) => ({ label: row.trainer.full_name, value: row.studentCount }))
    .sort((a, b) => b.value - a.value);

  return (
    <>
      <PageHeader
        title="Trainers"
        description={
          isHead
            ? "The whole academy — roster, weekly reporting and where support is needed."
            : "The trainers reporting to you — their students, weekly reporting and issues."
        }
        actions={
          <>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add trainer
            </Button>
            <div className="flex items-center gap-1 rounded-lg border border-line bg-surface px-1 py-0.5">
            <Button
              size="icon"
              variant="ghost"
              aria-label="Previous week"
              onClick={() => setWeekOffset((current) => current - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-1 text-xs font-medium tabular-nums text-ink">
              Week ending {viewerToday ? formatDate(weekEndingDate) : ""}
            </span>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Next week"
              disabled={weekOffset >= 0}
              onClick={() => setWeekOffset((current) => Math.min(0, current + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            </div>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Trainers" value={summaries.length} icon={UserCog} />
        <StatTile label="Students covered" value={totalStudents} />
        <StatTile label="Videos posted" value={totalVideos} icon={Video} />
        <StatTile
          label="Reports submitted"
          value={`${submitted.length}/${summaries.length}`}
          tone={submitted.length === summaries.length && summaries.length > 0 ? "good" : "warning"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Weekly trainer details</CardTitle>
            <span className="text-xs text-muted">Videos posted · students · issues</span>
          </CardHeader>

          {error ? (
            <ErrorState message={(error as Error).message} />
          ) : isLoading ? (
            <LoadingRows rows={5} />
          ) : summaries.length === 0 ? (
            <EmptyState
              icon={UserCog}
              title="No trainers yet"
              description={
                isHead
                  ? "Create an account to get your first trainer set up."
                  : "Create a trainer account and they will report to you."
              }
              action={
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  Add trainer
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {summaries.map((row) => (
                <li key={row.trainer.id} className="px-4 py-3 sm:px-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-plane text-xs font-semibold text-ink-2">
                      {initials(row.trainer.full_name || row.trainer.email)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {row.trainer.full_name}
                      </p>
                      <p className="truncate text-xs text-muted">{row.trainer.email}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge tone={row.trainer.role === "lead_trainer" ? "brand" : "neutral"}>
                          {ROLE_LABELS[row.trainer.role]}
                        </Badge>
                        {row.trainer.role === "trainer" ? (
                          <span className="text-xs text-muted">
                            reports to{" "}
                            {leads.find((lead) => lead.id === row.trainer.reports_to)?.full_name ??
                              "Head"}
                          </span>
                        ) : null}
                      </p>
                    </div>

                    <dl className="flex items-center gap-4 text-center">
                      <div>
                        <dt className="text-xs text-muted">Students</dt>
                        <dd className="text-sm font-semibold tabular-nums text-ink">
                          {row.studentCount}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">Videos</dt>
                        <dd className="text-sm font-semibold tabular-nums text-ink">
                          {row.videosPosted}
                        </dd>
                      </div>
                    </dl>

                    {row.latestReport ? (
                      <Badge tone="good">Reported</Badge>
                    ) : (
                      <Badge tone="warning">Missing</Badge>
                    )}

                    <div className="flex items-center gap-1">
                      {isHead ? (
                        <>
                          <Select
                            className="h-8 w-auto text-xs"
                            value={row.trainer.role}
                            aria-label={`Role for ${row.trainer.full_name}`}
                            onChange={async (event) => {
                              await updateRole.mutateAsync({
                                id: row.trainer.id,
                                role: event.target.value as Profile["role"],
                              });
                              toast("Role updated");
                            }}
                          >
                            {ASSIGNABLE_ROLES.map((role) => (
                              <option key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </option>
                            ))}
                          </Select>

                          {row.trainer.role === "trainer" ? (
                            <Select
                              className="h-8 w-auto text-xs"
                              value={row.trainer.reports_to ?? ""}
                              aria-label={`Reports to, for ${row.trainer.full_name}`}
                              onChange={async (event) => {
                                await updateReportsTo.mutateAsync({
                                  id: row.trainer.id,
                                  reportsTo: event.target.value || null,
                                });
                                toast("Reporting line updated");
                              }}
                            >
                              <option value="">Reports to: Head</option>
                              {leads
                                .filter((lead) => lead.id !== row.trainer.id)
                                .map((lead) => (
                                  <option key={lead.id} value={lead.id}>
                                    Reports to: {lead.full_name}
                                  </option>
                                ))}
                            </Select>
                          ) : null}
                        </>
                      ) : null}
                      <Button size="sm" variant="secondary" onClick={() => setEditing(row)}>
                        {row.latestReport ? "Edit" : "Record"}
                      </Button>
                    </div>
                  </div>

                  {row.latestReport?.issues_notes ? (
                    <p className="mt-2 rounded-lg bg-plane px-3 py-2 text-sm text-ink-2">
                      {row.latestReport.issues_notes}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <BarChart
          title="Students per trainer"
          subtitle="Active students currently assigned"
          data={studentBars}
          valueLabel="Students"
          series={3}
          emptyMessage="No students assigned yet"
        />
      </div>

      <TrainerFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        leads={leads}
        isHead={isHead}
      />

      <TrainerDetailModal
        summary={editing}
        weekEndingDate={weekEndingDate}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
      />
    </>
  );
}
