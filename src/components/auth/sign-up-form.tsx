"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { signUpAction, type AuthActionResult } from "@/app/(auth)/actions";
import { ActionMessage } from "@/components/auth/action-message";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { signUpSchema, type SignUpInput } from "@/lib/validation/auth";

export function SignUpForm() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<AuthActionResult>(undefined);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) });

  function onSubmit(values: SignUpInput) {
    setResult(undefined);
    startTransition(async () => {
      setResult(await signUpAction(values));
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField id="email" label="Email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" {...register("email")} />
      </FormField>
      <FormField id="password" label="Password" error={errors.password?.message}>
        <Input type="password" autoComplete="new-password" {...register("password")} />
      </FormField>
      <FormField
        id="confirmPassword"
        label="Confirm password"
        error={errors.confirmPassword?.message}
      >
        <Input type="password" autoComplete="new-password" {...register("confirmPassword")} />
      </FormField>
      <ActionMessage result={result} />
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}
