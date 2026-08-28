"use client";

import * as React from "react";
import { Lock, Palette, Users as UsersIcon } from "lucide-react";
import {
  useAllUsers,
  useMenuPermissions,
  useSetMenuPermission,
  useSetUserActive,
} from "@/lib/queries/config";
import { useUpdateReportsTo, useUpdateUserRole } from "@/lib/queries/trainers";
import { ThemePicker } from "@/components/theme-picker";
import { PageHeader } from "@/components/layout/page-header";
import { NAV_ITEMS, defaultVisible } from "@/components/layout/nav-items";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState, ErrorState, LoadingRows } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@/lib/constants";
import { initials } from "@/lib/utils";
import type { UserRole } from "@/lib/database.types";
import type { Profile } from "@/lib/types";

const MENU_ROLES: UserRole[] = ["team_head", "lead_trainer", "trainer"];

export function ConfigurationView({ profile }: { profile: Profile }) {
  const [tab, setTab] = React.useState("users");

  return (
    <>
      <PageHeader
        title="Configuration"
        description="Roles, reporting lines, navigation and appearance."
      />

      <Tabs
        className="mb-4 sm:max-w-md"
        items={[
          { value: "users", label: "Users" },
          { value: "menus", label: "Menus" },
          { value: "appearance", label: "Appearance" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "users" ? <UsersPanel profile={profile} /> : null}
      {tab === "menus" ? <MenusPanel /> : null}
      {tab === "appearance" ? <AppearancePanel /> : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Users — roles, reporting lines, activation
// ---------------------------------------------------------------------------
function UsersPanel({ profile }: { profile: Profile }) {
  const { data, isLoading, error } = useAllUsers();
  const updateRole = useUpdateUserRole();
  const updateReportsTo = useUpdateReportsTo();
  const setActive = useSetUserActive();
  const { toast } = useToast();

  const users = data ?? [];
  const leads = users.filter((user) => user.role === "lead_trainer");

  const act = async (label: string, run: () => Promise<unknown>) => {
    try {
      await run();
      toast(label);
    } catch (mutationError) {
      toast(mutationError instanceof Error ? mutationError.message : "Update failed", "error");
    }
  };

  if (error) return <ErrorState message={(error as Error).message} />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>All accounts</CardTitle>
        <span className="text-xs text-muted">{users.length} users</span>
      </CardHeader>

      {isLoading ? (
        <LoadingRows rows={4} />
      ) : users.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No accounts yet" />
      ) : (
        <ul className="divide-y divide-line">
          {users.map((user) => {
            const isSelf = user.id === profile.id;
            return (
              <li key={user.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-plane text-xs font-semibold text-ink-2">
                  {initials(user.full_name || user.email)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-ink">
                    {user.full_name}
                    {isSelf ? <Badge tone="brand">You</Badge> : null}
                    {!user.is_active ? <Badge tone="neutral">Disabled</Badge> : null}
                  </p>
                  <p className="truncate text-xs text-muted">{user.email}</p>
                </div>

                <Select
                  className="h-8 w-auto text-xs"
                  value={user.role}
                  aria-label={`Role for ${user.full_name}`}
                  disabled={isSelf}
                  title={isSelf ? "You cannot change your own role" : undefined}
                  onChange={(event) =>
                    act("Role updated", () =>
                      updateRole.mutateAsync({
                        id: user.id,
                        role: event.target.value as UserRole,
                      }),
                    )
                  }
                >
                  {ASSIGNABLE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                  {user.role === "parent" ? <option value="parent">Parent</option> : null}
                </Select>

                {user.role === "trainer" ? (
                  <Select
                    className="h-8 w-auto text-xs"
                    value={user.reports_to ?? ""}
                    aria-label={`Reports to, for ${user.full_name}`}
                    onChange={(event) =>
                      act("Reporting line updated", () =>
                        updateReportsTo.mutateAsync({
                          id: user.id,
                          reportsTo: event.target.value || null,
                        }),
                      )
                    }
                  >
                    <option value="">Reports to: Head</option>
                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        Reports to: {lead.full_name}
                      </option>
                    ))}
                  </Select>
                ) : null}

                <label className="flex items-center gap-1.5 text-xs text-ink-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-line accent-[#2a78d6]"
                    checked={user.is_active}
                    disabled={isSelf}
                    onChange={(event) =>
                      act(event.target.checked ? "Account enabled" : "Account disabled", () =>
                        setActive.mutateAsync({ id: user.id, isActive: event.target.checked }),
                      )
                    }
                  />
                  Active
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Menus — which nav items each role sees
// ---------------------------------------------------------------------------
function MenusPanel() {
  const { data, isLoading, error } = useMenuPermissions();
  const setPermission = useSetMenuPermission();
  const { toast } = useToast();

  const overrides = React.useMemo(() => {
    const map = new Map<string, boolean>();
    for (const row of data ?? []) map.set(`${row.role}:${row.item_key}`, row.visible);
    return map;
  }, [data]);

  const isVisible = (role: UserRole, key: string) => {
    const item = NAV_ITEMS.find((candidate) => candidate.key === key)!;
    const override = overrides.get(`${role}:${key}`);
    if (item.locked || override === undefined) return defaultVisible(item, role);
    return override;
  };

  const toggle = async (role: UserRole, key: string, next: boolean) => {
    try {
      await setPermission.mutateAsync({ role, itemKey: key, visible: next });
      toast("Menu updated — users see it after their next page load");
    } catch (mutationError) {
      toast(mutationError instanceof Error ? mutationError.message : "Update failed", "error");
    }
  };

  if (error) return <ErrorState message={(error as Error).message} />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Navigation by role</CardTitle>
        <span className="text-xs text-muted">Unticked items are hidden from that role</span>
      </CardHeader>

      {isLoading ? (
        <LoadingRows rows={5} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium sm:px-5">Menu item</th>
                {MENU_ROLES.map((role) => (
                  <th key={role} scope="col" className="px-3 py-2 text-center font-medium">
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NAV_ITEMS.map((item) => (
                <tr key={item.key} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 sm:px-5">
                    <span className="flex items-center gap-2 text-ink">
                      <item.icon className="h-4 w-4 text-muted" />
                      {item.label}
                      {item.locked ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs text-muted"
                          title="This item cannot be hidden"
                        >
                          <Lock className="h-3 w-3" />
                        </span>
                      ) : null}
                    </span>
                  </td>
                  {MENU_ROLES.map((role) => (
                    <td key={role} className="px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-line accent-[#2a78d6] disabled:opacity-40"
                        aria-label={`${item.label} visible to ${ROLE_LABELS[role]}`}
                        checked={isVisible(role, item.key)}
                        disabled={item.locked}
                        onChange={(event) => toggle(role, item.key, event.target.checked)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CardBody className="border-t border-line text-xs text-ink-2">
        Hiding a menu item removes the link, not the permission — row-level security still decides
        what each role can read. Configuration always stays visible to the Head, so this screen can
        never lock itself away.
      </CardBody>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Appearance
// ---------------------------------------------------------------------------
function AppearancePanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme</CardTitle>
        <Palette className="h-4 w-4 text-muted" />
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="text-sm text-ink-2">
          Applies to your account on this device. Everyone can switch themes from the palette icon
          beside their name in the sidebar.
        </p>
        <ThemePicker />
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-card border border-line bg-surface px-3 py-2.5">
            <p className="text-xs text-muted">Surface</p>
            <p className="mt-1 text-sm font-medium text-ink">Card background</p>
          </div>
          <div className="rounded-card border border-line bg-plane px-3 py-2.5">
            <p className="text-xs text-muted">Plane</p>
            <p className="mt-1 text-sm font-medium text-ink">Page background</p>
          </div>
          <div className="rounded-card border border-brand-ring bg-brand-soft px-3 py-2.5">
            <p className="text-xs text-brand-strong">Brand</p>
            <p className="mt-1 text-sm font-medium text-brand-strong">Accent</p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
