"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-picker";
import { createClient } from "@/lib/supabase/client";
import { SessionProvider } from "@/components/session-provider";
import { navItemsForRole, type MenuOverrides } from "./nav-items";
import { ROLE_LABELS } from "@/lib/constants";
import { cn, initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/types";

export function AppShell({
  profile,
  menuOverrides,
  children,
}: {
  profile: Profile;
  menuOverrides?: MenuOverrides;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const items = navItemsForRole(profile.role, menuOverrides);

  const signOut = async () => {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  const nav = (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setDrawerOpen(false)}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-brand-soft text-brand-strong" : "text-ink-2 hover:bg-plane hover:text-ink",
            )}
            aria-current={active ? "page" : undefined}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <SessionProvider profile={profile}>
      <div className="flex min-h-dvh">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface px-3 py-4 lg:flex">
          <Link href="/dashboard" className="mb-5 flex items-center gap-2 px-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-sm font-bold text-white">
              Pf
            </span>
            <span className="text-sm font-semibold text-ink">PhonicsFlow</span>
          </Link>
          {nav}
          <div className="mt-auto border-t border-line pt-3">
            <UserBlock profile={profile} onSignOut={signOut} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar */}
          <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur lg:hidden">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-xs font-bold text-white">
                Pf
              </span>
              <span className="text-sm font-semibold text-ink">PhonicsFlow</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open menu"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </header>

          {drawerOpen ? (
            <div className="fixed inset-0 z-40 lg:hidden">
              <div
                className="absolute inset-0 bg-ink/40"
                onClick={() => setDrawerOpen(false)}
                aria-hidden
              />
              <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-surface px-3 py-4 shadow-xl">
                <div className="mb-4 flex items-center justify-between px-2">
                  <span className="text-sm font-semibold text-ink">Menu</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Close menu"
                    onClick={() => setDrawerOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {nav}
                <div className="mt-auto border-t border-line pt-3">
                  <UserBlock profile={profile} onSignOut={signOut} />
                </div>
              </div>
            </div>
          ) : null}

          <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-6">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}

function UserBlock({ profile, onSignOut }: { profile: Profile; onSignOut: () => void }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-plane text-xs font-semibold text-ink-2">
        {initials(profile.full_name || profile.email)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{profile.full_name}</p>
        <p className="truncate text-xs text-muted">{ROLE_LABELS[profile.role]}</p>
      </div>
      <ThemeToggle />
      <Button variant="ghost" size="icon" aria-label="Sign out" onClick={onSignOut}>
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
