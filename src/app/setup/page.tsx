import type { Metadata } from "next";
import { configProblem, isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Setup" };

const STEPS = [
  {
    title: "Create a Supabase project",
    body: "supabase.com → New project. Copy the project URL and the anon key from Project Settings → API.",
  },
  {
    title: "Add environment variables",
    body: "Copy .env.local.example to .env.local and fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.",
  },
  {
    title: "Run the schema",
    body: "Paste supabase/schema.sql into the Supabase SQL editor and run it, then run supabase/seed.sql to load the phonics diary.",
  },
  {
    title: "Restart the dev server",
    body: "npm run dev — then create the first account and promote it to team_head (see README).",
  },
];

export default function SetupPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-xl font-semibold text-ink">Finish setting up PhonicsFlow</h1>
      <p className="mt-1 text-sm text-ink-2">
        {isSupabaseConfigured
          ? "Supabase is configured. If pages still fail, check that the schema has been applied."
          : "The app has not been connected to a Supabase project yet."}
      </p>

      {configProblem ? (
        <p className="mt-4 rounded-lg border border-[#f2c7c7] bg-[#fbeaea] px-4 py-3 text-sm text-[#a02525]">
          <span className="font-semibold">What&rsquo;s wrong: </span>
          {configProblem}
        </p>
      ) : null}

      <ol className="mt-6 space-y-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="rounded-card border border-line bg-surface px-4 py-3.5">
            <div className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand-strong">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-ink">{step.title}</p>
                <p className="mt-0.5 text-sm text-ink-2">{step.body}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
