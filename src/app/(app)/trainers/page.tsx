import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/session";
import { TrainersView } from "./trainers-view";

export const metadata: Metadata = { title: "Trainers" };

export default async function TrainersPage() {
  const profile = await requireProfile();
  // Belt and braces: RLS already limits the rows each role can read.
  if (profile.role !== "team_head" && profile.role !== "lead_trainer") redirect("/dashboard");

  return <TrainersView profile={profile} />;
}
