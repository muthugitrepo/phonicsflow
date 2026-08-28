import type { Metadata } from "next";
import { requireProfile } from "@/lib/session";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Choose a password" };

export default async function ChangePasswordPage() {
  const profile = await requireProfile();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-brand text-lg font-bold text-white">
            Pf
          </div>
          <h1 className="text-xl font-semibold text-ink">Choose your password</h1>
          <p className="mt-1 text-sm text-ink-2">
            {profile.must_change_password
              ? "Your account was set up with a temporary password. Pick your own to continue."
              : "Update the password you use to sign in."}
          </p>
        </div>
        <ChangePasswordForm required={profile.must_change_password} />
      </div>
    </main>
  );
}
