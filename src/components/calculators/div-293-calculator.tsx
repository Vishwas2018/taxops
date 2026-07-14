"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { calculateDiv293, type Div293Result } from "@/lib/calculators/div293";
import { fy2025_26 } from "@/lib/tax-config/fy2025-26";
import {
  div293FormSchema,
  type Div293FormInput,
  type Div293FormRawInput,
} from "@/lib/validation/calculators";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Div293Results } from "./div-293-results";

const DEFAULT_VALUES: Div293FormRawInput = {
  div293Income: 240_000,
  concessionalContributions: 25_000,
};

export function Div293Calculator() {
  const [result, setResult] = useState<Div293Result | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Div293FormRawInput, unknown, Div293FormInput>({
    resolver: zodResolver(div293FormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  function onSubmit(values: Div293FormInput) {
    setResult(calculateDiv293(values, fy2025_26));
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Card>
        <CardContent>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          id="div293Income"
          label="Income for Division 293 purposes ($)"
          description="Broader than taxable income - includes reportable fringe benefits and net investment losses. Don't include concessional super contributions here; enter those separately below."
          error={errors.div293Income?.message}
        >
          <Input type="number" step="1" inputMode="decimal" {...register("div293Income")} />
        </FormField>

        <FormField
          id="concessionalContributions"
          label="Concessional (before-tax) super contributions ($)"
          error={errors.concessionalContributions?.message}
        >
          <Input
            type="number"
            step="1"
            inputMode="decimal"
            {...register("concessionalContributions")}
          />
        </FormField>

        <Button type="submit" className="w-full">
          Calculate
        </Button>
      </form>
        </CardContent>
      </Card>

      <div>
        {result ? (
          <Div293Results data={result} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Fill in the form and select Calculate to see your estimated Division 293 position.
          </p>
        )}
      </div>
    </div>
  );
}
