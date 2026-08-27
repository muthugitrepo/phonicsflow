import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  if (!isSupabaseConfigured) redirect("/setup");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-brand text-lg font-bold text-white">
            Pf
          </div>
          <h1 className="text-xl font-semibold text-ink">PhonicsFlow</h1>
          <p className="mt-1 text-sm text-ink-2">Alphics Phonics training management</p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
