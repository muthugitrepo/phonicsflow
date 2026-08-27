import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/session";
import { TrainersView } from "./trainers-view";

export const metadata: Metadata = { title: "Trainers" };

export default async function TrainersPage() {
  const profile = await requireProfile();
  // Belt and braces: RLS already hides other trainers' rows.
  if (profile.role !== "team_head") redirect("/dashboard");

  return <TrainersView />;
}
