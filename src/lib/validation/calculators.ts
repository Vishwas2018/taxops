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
