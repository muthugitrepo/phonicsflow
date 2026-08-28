import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/session";
import { ConfigurationView } from "./configuration-view";

export const metadata: Metadata = { title: "Configuration" };

export default async function ConfigurationPage() {
  const profile = await requireProfile();
  // RLS blocks the writes anyway; this keeps the page itself out of reach.
  if (profile.role !== "team_head") redirect("/dashboard");

  return <ConfigurationView profile={profile} />;
}
