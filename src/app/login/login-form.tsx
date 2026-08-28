"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { signInSchema, type SignInInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  const onSubmit = async (values: SignInInput) => {
    setFormError(null);
    setNotice(null);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        // Display name only. The role is assigned server-side by the
        // handle_new_user trigger and cannot be influenced from here.
        options: { data: { full_name: fullName || values.email.split("@")[0] } },
      });
      if (error) {
        setFormError(error.message);
        return;
      }
      if (!data.session) {
        setNotice("Check your inbox to confirm the address, then sign in.");
        setMode("signin");
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword(values);
      if (error) {
        setFormError(error.message);
        return;
      }
    }

    const next = searchParams.get("next");
    router.replace(next && next.startsWith("/") ? next : "/dashboard");
    router.refresh();
  };

  return (
    <Card>
      <CardBody className="space-y-4">
        <Tabs
          items={[
            { value: "signin", label: "Sign in" },
            { value: "signup", label: "Create account" },
          ]}
          value={mode}
          onChange={(value) => {
            setMode(value as "signin" | "signup");
            setFormError(null);
          }}
        />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {mode === "signup" ? (
            <Field label="Full name" htmlFor="full_name" required>
              <Input
                id="full_name"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Ranjani"
              />
            </Field>
          ) : null}

          <Field label="Email" htmlFor="email" error={errors.email?.message} required>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@alphics.com"
              {...register("email")}
            />
          </Field>

          <Field label="Password" htmlFor="password" error={errors.password?.message} required>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="••••••••"
              {...register("password")}
            />
          </Field>

          {formError ? (
            <p role="alert" className="rounded-md bg-[#fbeaea] px-3 py-2 text-sm text-[#a02525]">
              {formError}
            </p>
          ) : null}
          {notice ? (
            <p className="rounded-md bg-brand-soft px-3 py-2 text-sm text-brand-strong">{notice}</p>
          ) : null}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === "signup" ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted">
          The first account becomes the Head. Later accounts start as trainers — the Head
          assigns roles and reporting lines from the Trainers page.
        </p>
      </CardBody>
    </Card>
  );
}
