import { requireProfile } from "@/lib/session";
import { AppShell } from "@/components/layout/app-shell";

// Every page in this group is per-user; never prerender the shell.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  return <AppShell profile={profile}>{children}</AppShell>;
}
