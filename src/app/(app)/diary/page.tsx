import type { Metadata } from "next";
import { DiaryView } from "./diary-view";

export const metadata: Metadata = { title: "Phonics diary" };

export default function DiaryPage() {
  return <DiaryView />;
}
