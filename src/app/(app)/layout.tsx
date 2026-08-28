import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/session";
import { AppShell } from "@/components/layout/app-shell";

// Every page in this group is per-user; never prerender the shell.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  // A Head-provisioned account holds a temporary password that was read aloud
  // or messaged. Nothing else in the app is reachable until it is replaced.
  if (profile.must_change_password) redirect("/change-password");

  return <AppShell profile={profile}>{children}</AppShell>;
}
