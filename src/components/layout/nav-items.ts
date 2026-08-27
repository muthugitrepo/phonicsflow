import {
  BookOpenText,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  MessageSquareHeart,
  TrendingUp,
  Users,
  UserCog,
} from "lucide-react";
import type { UserRole } from "@/lib/database.types";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: UserRole[];
  primary?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, primary: true },
  { href: "/students", label: "Students", icon: Users, primary: true },
  { href: "/classes", label: "Classes", icon: CalendarDays, primary: true },
  { href: "/homework", label: "Homework", icon: ClipboardList, primary: true },
  { href: "/diary", label: "Phonics diary", icon: BookOpenText, primary: true },
  { href: "/parents", label: "Parents", icon: MessageSquareHeart },
  { href: "/trainers", label: "Trainers", icon: UserCog, roles: ["team_head"] },
  { href: "/reports", label: "Reports", icon: TrendingUp },
];

export function navItemsForRole(role: UserRole) {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
