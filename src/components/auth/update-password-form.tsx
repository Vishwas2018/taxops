"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { updatePasswordAction, type AuthActionResult } from "@/app/(auth)/actions";
import { ActionMessage } from "@/components/auth/action-message";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { updatePasswordSchema, type UpdatePasswordInput } from "@/lib/validation/auth";

export function UpdatePasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<AuthActionResult>(undefined);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdatePasswordInput>({ resolver: zodResolver(updatePasswordSchema) });

  function onSubmit(values: UpdatePasswordInput) {
    setResult(undefined);
    startTransition(async () => {
      setResult(await updatePasswordAction(values));
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField id="password" label="New password" error={errors.password?.message}>
        <Input type="password" autoComplete="new-password" {...register("password")} />
      </FormField>
      <FormField
        id="confirmPassword"
        label="Confirm new password"
        error={errors.confirmPassword?.message}
      >
        <Input type="password" autoComplete="new-password" {...register("confirmPassword")} />
      </FormField>
      <ActionMessage result={result} />
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
