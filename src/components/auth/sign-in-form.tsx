"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { signInAction, type AuthActionResult } from "@/app/(auth)/actions";
import { ActionMessage } from "@/components/auth/action-message";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { signInSchema, type SignInInput } from "@/lib/validation/auth";

export function SignInForm() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<AuthActionResult>(undefined);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  function onSubmit(values: SignInInput) {
    setResult(undefined);
    startTransition(async () => {
      setResult(await signInAction(values));
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField id="email" label="Email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" {...register("email")} />
      </FormField>
      <FormField id="password" label="Password" error={errors.password?.message}>
        <Input type="password" autoComplete="current-password" {...register("password")} />
      </FormField>
      <ActionMessage result={result} />
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
      <div className="flex justify-between text-sm text-muted-foreground">
        <Link href="/sign-up" className="underline underline-offset-4">
          Create an account
        </Link>
        <Link href="/reset-password" className="underline underline-offset-4">
          Forgot password?
        </Link>
      </div>
    </form>
  );
}
