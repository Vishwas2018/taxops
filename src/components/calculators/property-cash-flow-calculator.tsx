"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { calculatePropertyCashFlow } from "@/lib/calculators/property-cash-flow";
import type { PropertyCashFlowResult } from "@/lib/calculators/property-cash-flow";
import { fy2025_26 } from "@/lib/tax-config/fy2025-26";
import {
  propertyCashFlowFormSchema,
  type PropertyCashFlowFormInput,
  type PropertyCashFlowFormRawInput,
} from "@/lib/validation/calculators";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PropertyCashFlowResults } from "./property-cash-flow-results";

const DEFAULT_VALUES: PropertyCashFlowFormRawInput = {
  weeklyRent: 550,
  vacancyWeeksPerYear: 2,
  annualLoanInterest: 22_000,
  rates: 2_500,
  insurance: 1_500,
  management: 2_200,
  maintenance: 1_800,
  annualDepreciation: 6_000,
  marginalTaxRate: 0.3,
};

// This UI asks the investor to pick their marginal rate directly (from the same brackets
// calculateIncomeTax uses) rather than entering their whole taxable income - a single bracket
// rate covers a wide income range, so there's no one "right" income value to derive it from.
const MARGINAL_RATE_OPTIONS = fy2025_26.incomeTaxBrackets.value.map((bracket) => ({
  rate: bracket.rate,
  label:
    bracket.max === null
      ? `${Math.round(bracket.rate * 100)}% (over $${bracket.min.toLocaleString()})`
      : `${Math.round(bracket.rate * 100)}% ($${bracket.min.toLocaleString()}-$${bracket.max.toLocaleString()})`,
}));

export function PropertyCashFlowCalculator({
  suggestedMarginalRate = null,
  incomeBandLabel = null,
}: {
  /** From the user's tax profile (household income band -> a representative bracket via
   * `marginalRateAt` - never a separately inlined rate). `null` when there's no profile or no
   * income band answered yet, in which case the form falls back to its own static default. */
  suggestedMarginalRate?: number | null;
  incomeBandLabel?: string | null;
}) {
  const [result, setResult] = useState<PropertyCashFlowResult | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PropertyCashFlowFormRawInput, unknown, PropertyCashFlowFormInput>({
    resolver: zodResolver(propertyCashFlowFormSchema),
    defaultValues: {
      ...DEFAULT_VALUES,
      ...(suggestedMarginalRate !== null ? { marginalTaxRate: suggestedMarginalRate } : {}),
    },
  });

  function onSubmit(values: PropertyCashFlowFormInput) {
    const weeksLet = Math.max(0, 52 - values.vacancyWeeksPerYear);
    const annualRentalIncome = values.weeklyRent * weeksLet;
    const annualExpenses =
      values.rates + values.insurance + values.management + values.maintenance;

    setResult(
      calculatePropertyCashFlow(
        {
          annualRentalIncome,
          annualExpenses,
          annualLoanInterest: values.annualLoanInterest,
          annualDepreciation: values.annualDepreciation,
          marginalTaxRate: values.marginalTaxRate,
        },
        fy2025_26,
      ),
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField id="weeklyRent" label="Weekly rent ($)" error={errors.weeklyRent?.message}>
          <Input type="number" step="1" inputMode="decimal" {...register("weeklyRent")} />
        </FormField>

        <FormField
          id="vacancyWeeksPerYear"
          label="Vacancy weeks per year"
          description="Defaults to 2 weeks - adjust to match your own expectations for the property."
          error={errors.vacancyWeeksPerYear?.message}
        >
          <Input
            type="number"
            step="1"
            inputMode="decimal"
            {...register("vacancyWeeksPerYear")}
          />
        </FormField>

        <FormField
          id="annualLoanInterest"
          label="Loan interest ($/year)"
          error={errors.annualLoanInterest?.message}
        >
          <Input
            type="number"
            step="1"
            inputMode="decimal"
            {...register("annualLoanInterest")}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField id="rates" label="Rates ($/year)" error={errors.rates?.message}>
            <Input type="number" step="1" inputMode="decimal" {...register("rates")} />
          </FormField>
          <FormField id="insurance" label="Insurance ($/year)" error={errors.insurance?.message}>
            <Input type="number" step="1" inputMode="decimal" {...register("insurance")} />
          </FormField>
          <FormField
            id="management"
            label="Management fees ($/year)"
            error={errors.management?.message}
          >
            <Input type="number" step="1" inputMode="decimal" {...register("management")} />
          </FormField>
          <FormField
            id="maintenance"
            label="Maintenance ($/year)"
            error={errors.maintenance?.message}
          >
            <Input type="number" step="1" inputMode="decimal" {...register("maintenance")} />
          </FormField>
        </div>

        <FormField
          id="annualDepreciation"
          label="Depreciation ($/year)"
          description="From a quantity surveyor's depreciation schedule - not a guess."
          error={errors.annualDepreciation?.message}
        >
          <Input
            type="number"
            step="1"
            inputMode="decimal"
            {...register("annualDepreciation")}
          />
        </FormField>

        <FormField
          id="marginalTaxRate"
          label="Your marginal tax rate"
          description={
            suggestedMarginalRate !== null
              ? `Defaulted from your tax profile (household income: ${incomeBandLabel}) - edit if this doesn't match your individual marginal rate.`
              : undefined
          }
          error={errors.marginalTaxRate?.message}
        >
          <select
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            {...register("marginalTaxRate")}
          >
            {MARGINAL_RATE_OPTIONS.map((option) => (
              <option key={option.rate} value={option.rate}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        <Button type="submit" className="w-full">
          Calculate
        </Button>
      </form>

      <div>
        {result ? (
          <PropertyCashFlowResults data={result} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Fill in the form and select Calculate to see your estimated cash flow.
          </p>
        )}
      </div>
    </div>
  );
}
