import type { Metadata } from "next";
import { requireProfile } from "@/lib/session";
import { ReportsView } from "./reports-view";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const profile = await requireProfile();
  return <ReportsView profile={profile} />;
}
