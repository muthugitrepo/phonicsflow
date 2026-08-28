"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
  type ChangePasswordInput,
} from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export function ChangePasswordForm({ required }: { required: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues, unknown, ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async ({ password }: ChangePasswordInput) => {
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError("password", { message: error.message });
      return;
    }

    // Clearing the flag is what releases the redirect in the app layout.
    if (data.user) {
      const { error: profileError } = await supabase
        .from("users")
        .update({ must_change_password: false })
        .eq("id", data.user.id);
      if (profileError) {
        setError("password", { message: profileError.message });
        return;
      }
    }

    toast("Password updated");
    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <Card>
      <CardBody>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Field label="New password" htmlFor="password" error={errors.password?.message} required>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              autoFocus
              {...register("password")}
            />
          </Field>

          <Field label="Confirm password" htmlFor="confirm" error={errors.confirm?.message} required>
            <Input id="confirm" type="password" autoComplete="new-password" {...register("confirm")} />
          </Field>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save password
          </Button>

          {!required ? (
            <Button variant="ghost" className="w-full" onClick={() => router.back()}>
              Cancel
            </Button>
          ) : null}
        </form>
      </CardBody>
    </Card>
  );
}
