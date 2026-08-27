import type { Metadata } from "next";
import { requireProfile } from "@/lib/session";
import { DashboardView } from "./dashboard-view";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const profile = await requireProfile();
  return <DashboardView profile={profile} />;
}
