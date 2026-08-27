import type { Metadata } from "next";
import { HomeworkView } from "./homework-view";

export const metadata: Metadata = { title: "Homework" };

export default function HomeworkPage() {
  return <HomeworkView />;
}
