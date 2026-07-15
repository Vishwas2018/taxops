import { z } from "zod";

export const contractorTakeHomeFormSchema = z.object({
  dayRate: z.coerce
    .number({ error: "Enter a day rate" })
    .positive("Day rate must be greater than zero")
    .max(50_000, "Enter a realistic day rate"),
  daysPerWeek: z.coerce
    .number({ error: "Enter billable days per week" })
    .positive("Must be greater than zero")
    .max(7, "Cannot exceed 7 days per week"),
  weeksWorkedPerYear: z.coerce
    .number({ error: "Enter weeks worked per year" })
    .positive("Must be greater than zero")
    .max(52, "Cannot exceed 52 weeks per year"),
  superTreatment: z.enum(["inclusive", "exclusive"]),
  hasHelpDebt: z.boolean(),
});

/** Parsed/output shape (after Zod's coercion has run). */
export type ContractorTakeHomeFormInput = z.output<typeof contractorTakeHomeFormSchema>;

/** Raw shape react-hook-form manages before validation (day rate etc. arrive as strings from
 * native inputs) - `z.coerce.number()` fields have a different input type than their output. */
export type ContractorTakeHomeFormRawInput = z.input<typeof contractorTakeHomeFormSchema>;

export const propertyCashFlowFormSchema = z.object({
  weeklyRent: z.coerce
    .number({ error: "Enter weekly rent" })
    .nonnegative("Cannot be negative")
    .max(10_000, "Enter a realistic weekly rent"),
  vacancyWeeksPerYear: z.coerce
    .number({ error: "Enter vacancy weeks" })
    .min(0, "Cannot be negative")
    .max(52, "Cannot exceed 52 weeks per year"),
  annualLoanInterest: z.coerce
    .number({ error: "Enter annual loan interest" })
    .nonnegative("Cannot be negative")
    .max(1_000_000, "Enter a realistic amount"),
  rates: z.coerce.number({ error: "Enter council/water rates" }).nonnegative("Cannot be negative").max(100_000),
  insurance: z.coerce.number({ error: "Enter insurance" }).nonnegative("Cannot be negative").max(100_000),
  management: z.coerce
    .number({ error: "Enter management fees" })
    .nonnegative("Cannot be negative")
    .max(100_000),
  maintenance: z.coerce
    .number({ error: "Enter maintenance costs" })
    .nonnegative("Cannot be negative")
    .max(100_000),
  annualDepreciation: z.coerce
    .number({ error: "Enter annual depreciation" })
    .nonnegative("Cannot be negative")
    .max(1_000_000, "Enter a realistic amount"),
  marginalTaxRate: z.coerce
    .number({ error: "Select your marginal tax rate" })
    .min(0, "Must be between 0 and 1")
    .max(1, "Must be between 0 and 1"),
});

export type PropertyCashFlowFormInput = z.output<typeof propertyCashFlowFormSchema>;
export type PropertyCashFlowFormRawInput = z.input<typeof propertyCashFlowFormSchema>;

export const div293FormSchema = z.object({
  div293Income: z.coerce
    .number({ error: "Enter your income for Division 293 purposes" })
    .nonnegative("Cannot be negative")
    .max(10_000_000, "Enter a realistic amount"),
  concessionalContributions: z.coerce
    .number({ error: "Enter concessional contributions" })
    .nonnegative("Cannot be negative")
    .max(1_000_000, "Enter a realistic amount"),
});

export type Div293FormInput = z.output<typeof div293FormSchema>;
export type Div293FormRawInput = z.input<typeof div293FormSchema>;

export const taxSetAsideFormSchema = z.object({
  dayRate: z.coerce
    .number({ error: "Enter a day rate" })
    .positive("Day rate must be greater than zero")
    .max(50_000, "Enter a realistic day rate"),
  daysPerWeek: z.coerce
    .number({ error: "Enter billable days per week" })
    .positive("Must be greater than zero")
    .max(7, "Cannot exceed 7 days per week"),
  weeksPerYear: z.coerce
    .number({ error: "Enter weeks worked per year" })
    .positive("Must be greater than zero")
    .max(52, "Cannot exceed 52 weeks per year"),
  gstRegistered: z.boolean(),
  hasHelpDebt: z.boolean(),
});

export type TaxSetAsideFormInput = z.output<typeof taxSetAsideFormSchema>;
export type TaxSetAsideFormRawInput = z.input<typeof taxSetAsideFormSchema>;

export const gstThresholdFormSchema = z.object({
  dayRate: z.coerce
    .number({ error: "Enter a day rate" })
    .positive("Day rate must be greater than zero")
    .max(50_000, "Enter a realistic day rate"),
  daysPerWeek: z.coerce
    .number({ error: "Enter billable days per week" })
    .positive("Must be greater than zero")
    .max(7, "Cannot exceed 7 days per week"),
  weeksWorkedPerYear: z.coerce
    .number({ error: "Enter weeks worked per year" })
    .positive("Must be greater than zero")
    .max(52, "Cannot exceed 52 weeks per year"),
  weeksAlreadyWorkedThisFY: z.coerce
    .number({ error: "Enter weeks already worked this financial year" })
    .min(0, "Cannot be negative")
    .max(52, "Cannot exceed 52 weeks"),
});

export type GstThresholdFormInput = z.output<typeof gstThresholdFormSchema>;
export type GstThresholdFormRawInput = z.input<typeof gstThresholdFormSchema>;
