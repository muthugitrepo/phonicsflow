import type { Metadata } from "next";
import { ParentsView } from "./parents-view";

export const metadata: Metadata = { title: "Parents" };

export default function ParentsPage() {
  return <ParentsView />;
}
