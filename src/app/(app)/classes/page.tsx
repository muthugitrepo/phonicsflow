import type { Metadata } from "next";
import { ClassesView } from "./classes-view";

export const metadata: Metadata = { title: "Classes" };

export default function ClassesPage() {
  return <ClassesView />;
}
