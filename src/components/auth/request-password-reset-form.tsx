"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { requestPasswordResetAction, type AuthActionResult } from "@/app/(auth)/actions";
import { ActionMessage } from "@/components/auth/action-message";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  requestPasswordResetSchema,
  type RequestPasswordResetInput,
} from "@/lib/validation/auth";

export function RequestPasswordResetForm() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<AuthActionResult>(undefined);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestPasswordResetInput>({ resolver: zodResolver(requestPasswordResetSchema) });

  function onSubmit(values: RequestPasswordResetInput) {
    setResult(undefined);
    startTransition(async () => {
      setResult(await requestPasswordResetAction(values));
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField id="email" label="Email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" {...register("email")} />
      </FormField>
      <ActionMessage result={result} />
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
