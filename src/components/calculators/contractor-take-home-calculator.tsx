"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { calculateContractorTakeHome } from "@/lib/calculators/contractor-take-home";
import { calculateHelpRepayment } from "@/lib/calculators/help-repayment";
import { fy2025_26 } from "@/lib/tax-config/fy2025-26";
import {
  contractorTakeHomeFormSchema,
  type ContractorTakeHomeFormInput,
  type ContractorTakeHomeFormRawInput,
} from "@/lib/validation/calculators";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ContractorTakeHomeResults,
  type ContractorTakeHomeResultsData,
} from "./contractor-take-home-results";

const DEFAULT_VALUES: ContractorTakeHomeFormRawInput = {
  dayRate: 800,
  daysPerWeek: 4,
  weeksWorkedPerYear: 46,
  superTreatment: "exclusive",
  hasHelpDebt: false,
};

export function ContractorTakeHomeCalculator() {
  const [results, setResults] = useState<ContractorTakeHomeResultsData | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ContractorTakeHomeFormRawInput, unknown, ContractorTakeHomeFormInput>({
    resolver: zodResolver(contractorTakeHomeFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  function onSubmit(values: ContractorTakeHomeFormInput) {
    const takeHome = calculateContractorTakeHome(
      {
        dayRate: values.dayRate,
        daysPerWeek: values.daysPerWeek,
        weeksWorkedPerYear: values.weeksWorkedPerYear,
        superTreatment: values.superTreatment,
      },
      fy2025_26,
    );

    // HELP repayment income isn't modeled separately in this calculator - assessable
    // income is used as an approximation. See the assumption surfaced in the results panel.
    const help = values.hasHelpDebt
      ? calculateHelpRepayment(takeHome.assessableIncome, fy2025_26)
      : null;

    const finalNetAnnual = takeHome.netTakeHome - (help?.repaymentAmount ?? 0);
    const finalNetPerWeek = finalNetAnnual / values.weeksWorkedPerYear;

    setResults({ takeHome, help, finalNetAnnual, finalNetPerWeek });
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

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">
            Is your day rate inclusive or exclusive of super?
          </legend>
          <Controller
            control={control}
            name="superTreatment"
            render={({ field }) => (
              <RadioGroup value={field.value} onValueChange={field.onChange} className="gap-3">
                <label className="flex items-center gap-2 text-sm font-normal">
                  <RadioGroupItem value="exclusive" aria-label="Exclusive - super is paid on top" /> Exclusive
                  - super is paid on top
                </label>
                <label className="flex items-center gap-2 text-sm font-normal">
                  <RadioGroupItem value="inclusive" aria-label="Inclusive - super comes out of the rate" />{" "}
                  Inclusive - super comes out of the rate
                </label>
              </RadioGroup>
            )}
          />
        </fieldset>

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
        {results ? (
          <ContractorTakeHomeResults data={results} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Fill in the form and select Calculate to see your estimated take-home pay.
          </p>
        )}
      </div>
    </div>
  );
}
