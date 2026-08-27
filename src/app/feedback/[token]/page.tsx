import type { Metadata } from "next";
import { resolveFeedbackToken } from "@/lib/feedback-links";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { FeedbackForm } from "./feedback-form";

export const metadata: Metadata = {
  title: "Share your feedback",
  robots: { index: false, follow: false },
};

export default async function FeedbackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const context = isSupabaseConfigured ? await resolveFeedbackToken(token) : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-10">
      <div className="mb-5 text-center">
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-brand text-lg font-bold text-white">
          Pf
        </div>
        <h1 className="text-xl font-semibold text-ink">
          {context ? `How is ${context.studentName} getting on?` : "Feedback link"}
        </h1>
        {context ? (
          <p className="mt-1 text-sm text-ink-2">
            {context.trainerName
              ? `${context.trainerName} would love to hear from you.`
              : "Your trainer would love to hear from you."}{" "}
            It takes a minute — no account needed.
          </p>
        ) : null}
      </div>

      {context ? (
        <FeedbackForm token={token} studentName={context.studentName} />
      ) : (
        <div className="rounded-card border border-line bg-surface px-5 py-6 text-center">
          <p className="text-sm font-medium text-ink">This link is no longer valid.</p>
          <p className="mt-1 text-sm text-ink-2">
            Feedback links expire after two weeks and can only be used once. Ask your trainer for a
            fresh one.
          </p>
        </div>
      )}
    </main>
  );
}
