"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { calculateSetAside, type TaxSetAsideResult } from "@/lib/calculators/tax-set-aside";
import { fy2026_27 } from "@/lib/tax-config/fy2026-27";
import {
  taxSetAsideFormSchema,
  type TaxSetAsideFormInput,
  type TaxSetAsideFormRawInput,
} from "@/lib/validation/calculators";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { TaxSetAsideResults } from "./tax-set-aside-results";

const DEFAULT_VALUES: TaxSetAsideFormRawInput = {
  dayRate: 800,
  daysPerWeek: 4,
  weeksPerYear: 46,
  gstRegistered: false,
  hasHelpDebt: false,
};

export function TaxSetAsideCalculator() {
  const [result, setResult] = useState<TaxSetAsideResult | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<TaxSetAsideFormRawInput, unknown, TaxSetAsideFormInput>({
    resolver: zodResolver(taxSetAsideFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  function onSubmit(values: TaxSetAsideFormInput) {
    setResult(
      calculateSetAside(
        {
          dayRate: values.dayRate,
          daysPerWeek: values.daysPerWeek,
          weeksPerYear: values.weeksPerYear,
          gstRegistered: values.gstRegistered,
          hasHelpDebt: values.hasHelpDebt,
        },
        fy2026_27,
      ),
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField id="dayRate" label="Day rate ($)" error={errors.dayRate?.message}>
              <Input type="number" step="0.01" inputMode="decimal" {...register("dayRate")} />
            </FormField>

            <FormField
              id="daysPerWeek"
              label="Billable days per week"
              error={errors.daysPerWeek?.message}
            >
              <Input type="number" step="0.5" inputMode="decimal" {...register("daysPerWeek")} />
            </FormField>

            <FormField
              id="weeksPerYear"
              label="Weeks worked per year"
              description="Defaults to 46 (52 weeks minus an assumed 6 weeks unpaid leave/downtime) - adjust to match your own plans."
              error={errors.weeksPerYear?.message}
            >
              <Input type="number" step="1" inputMode="decimal" {...register("weeksPerYear")} />
            </FormField>

            <label className="flex items-center gap-2 text-sm font-medium">
              <Controller
                control={control}
                name="gstRegistered"
                render={({ field }) => (
                  <Checkbox
                    aria-label="I am registered for GST"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              I am registered for GST
            </label>

            <label className="flex items-center gap-2 text-sm font-medium">
              <Controller
                control={control}
                name="hasHelpDebt"
                render={({ field }) => (
                  <Checkbox
                    aria-label="I have a HELP/STSL debt"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              I have a HELP/STSL debt
            </label>

            <Button type="submit" className="w-full">
              Calculate
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        {result ? (
          <TaxSetAsideResults data={result} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Fill in the form and select Calculate to see your suggested tax set-aside.
          </p>
        )}
      </div>
    </div>
  );
}
