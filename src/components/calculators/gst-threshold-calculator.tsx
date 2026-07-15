"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { projectGstThreshold, type GstThresholdProjectionResult } from "@/lib/calculators/gst-threshold";
import { fy2025_26 } from "@/lib/tax-config/fy2025-26";
import {
  gstThresholdFormSchema,
  type GstThresholdFormInput,
  type GstThresholdFormRawInput,
} from "@/lib/validation/calculators";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { GstThresholdResults } from "./gst-threshold-results";

const DEFAULT_VALUES: GstThresholdFormRawInput = {
  dayRate: 800,
  daysPerWeek: 4,
  weeksWorkedPerYear: 46,
  weeksAlreadyWorkedThisFY: 0,
};

export function GstThresholdCalculator() {
  const [result, setResult] = useState<GstThresholdProjectionResult | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GstThresholdFormRawInput, unknown, GstThresholdFormInput>({
    resolver: zodResolver(gstThresholdFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  function onSubmit(values: GstThresholdFormInput) {
    setResult(
      projectGstThreshold(
        {
          dayRate: values.dayRate,
          daysPerWeek: values.daysPerWeek,
          weeksWorkedPerYear: values.weeksWorkedPerYear,
          weeksAlreadyWorkedThisFY: values.weeksAlreadyWorkedThisFY,
        },
        fy2025_26,
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
              id="weeksWorkedPerYear"
              label="Weeks worked per year"
              description="Defaults to 46 (52 weeks minus an assumed 6 weeks unpaid leave/downtime) - adjust to match your own plans."
              error={errors.weeksWorkedPerYear?.message}
            >
              <Input
                type="number"
                step="1"
                inputMode="decimal"
                {...register("weeksWorkedPerYear")}
              />
            </FormField>

            <FormField
              id="weeksAlreadyWorkedThisFY"
              label="Weeks already worked this financial year"
              description="How far into the current financial year (from 1 July) you're starting this projection - leave at 0 to project from the start of the year."
              error={errors.weeksAlreadyWorkedThisFY?.message}
            >
              <Input
                type="number"
                step="1"
                inputMode="decimal"
                {...register("weeksAlreadyWorkedThisFY")}
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
          <GstThresholdResults data={result} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Fill in the form and select Calculate to see your projected GST turnover.
          </p>
        )}
      </div>
    </div>
  );
}
