import {
  BookOpenText,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  MessageSquareHeart,
  Settings,
  TrendingUp,
  Users,
  UserCog,
} from "lucide-react";
import type { UserRole } from "@/lib/database.types";

export interface NavItem {
  /** Stable identifier — menu overrides are stored against this, not the href. */
  key: string;
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Roles that see this item by default. Undefined means every role. */
  roles?: UserRole[];
  /** Cannot be hidden, or the Head loses the screen that manages menus. */
  locked?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "students", href: "/students", label: "Students", icon: Users },
  { key: "classes", href: "/classes", label: "Classes", icon: CalendarDays },
  { key: "homework", href: "/homework", label: "Homework", icon: ClipboardList },
  { key: "diary", href: "/diary", label: "Phonics diary", icon: BookOpenText },
  { key: "parents", href: "/parents", label: "Parents", icon: MessageSquareHeart },
  {
    key: "trainers",
    href: "/trainers",
    label: "Trainers",
    icon: UserCog,
    roles: ["team_head", "lead_trainer"],
  },
  { key: "reports", href: "/reports", label: "Reports", icon: TrendingUp },
  {
    key: "configuration",
    href: "/configuration",
    label: "Configuration",
    icon: Settings,
    roles: ["team_head"],
    locked: true,
  },
];

/** role -> item_key -> visible. Only deliberate overrides are present. */
export type MenuOverrides = Partial<Record<string, boolean>>;

export function defaultVisible(item: NavItem, role: UserRole) {
  return !item.roles || item.roles.includes(role);
}

/**
 * Resolves the menu for a role: the built-in default, with the Head's stored
 * overrides applied on top. Locked items always survive.
 */
export function navItemsForRole(role: UserRole, overrides: MenuOverrides = {}) {
  return NAV_ITEMS.filter((item) => {
    if (item.locked) return defaultVisible(item, role);
    const override = overrides[item.key];
    return override === undefined ? defaultVisible(item, role) : override;
  });
}
