import type { Metadata } from "next";
import { StudentDetailView } from "./student-detail-view";

export const metadata: Metadata = { title: "Student" };

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StudentDetailView studentId={id} />;
}
