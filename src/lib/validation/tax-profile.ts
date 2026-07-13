import { z } from "zod";

// Every enum here mirrors a Postgres enum type added in
// supabase/migrations/20260713010000_tax_profile_interview.sql - keep both in sync.

export const workArrangementValues = [
  "payg_employee",
  "payg_contractor",
  "abn_sole_trader",
  "company_or_trust",
  "mix",
] as const;
export const workArrangementSchema = z.enum(workArrangementValues);
export type WorkArrangement = z.infer<typeof workArrangementSchema>;

export const investmentPropertyBandValues = ["zero", "one", "two_to_three", "four_plus"] as const;
export const investmentPropertyBandSchema = z.enum(investmentPropertyBandValues);
export type InvestmentPropertyBand = z.infer<typeof investmentPropertyBandSchema>;

export const superEngagementValues = [
  "employer_only",
  "making_concessional_contributions",
  "not_sure",
] as const;
export const superEngagementSchema = z.enum(superEngagementValues);
export type SuperEngagement = z.infer<typeof superEngagementSchema>;

export const householdIncomeBandValues = [
  "under_100k",
  "100k_to_190k",
  "190k_to_250k",
  "250k_plus",
] as const;
export const householdIncomeBandSchema = z.enum(householdIncomeBandValues);
export type HouseholdIncomeBand = z.infer<typeof householdIncomeBandSchema>;

export const otherIncomeSourceValues = [
  "dividends",
  "capital_gains",
  "crypto",
  "foreign",
  "none",
] as const;
export const otherIncomeSourceSchema = z.enum(otherIncomeSourceValues);
export type OtherIncomeSource = z.infer<typeof otherIncomeSourceSchema>;

/**
 * Every field is optional/nullable - the interview never gates on completeness (see
 * `computeProfileCompleteness` in `src/lib/tax-profile/derived.ts`). A section-edit save and a
 * full-wizard save both parse against this same schema; partial input is already valid.
 */
export const taxProfileSchema = z.object({
  workArrangement: workArrangementSchema.nullable().optional(),
  hasAbn: z.boolean().nullable().optional(),
  investmentPropertyBand: investmentPropertyBandSchema.nullable().optional(),
  superEngagement: superEngagementSchema.nullable().optional(),
  householdIncomeBand: householdIncomeBandSchema.nullable().optional(),
  otherIncomeSources: z.array(otherIncomeSourceSchema).optional(),
});

export type TaxProfileInput = z.infer<typeof taxProfileSchema>;

export type QuestionGroupKey = keyof TaxProfileInput;

interface QuestionOption {
  value: string;
  label: string;
}

interface QuestionGroup {
  key: QuestionGroupKey;
  title: string;
  description?: string;
  type: "single" | "multi" | "boolean";
  options: QuestionOption[];
}

/** Single source of truth for option labels, shared by the wizard, the summary/edit view, and
 * (for value sets, not labels) the relevance/prefill consumers - see `src/lib/tax-profile/`. */
export const TAX_PROFILE_QUESTION_GROUPS: QuestionGroup[] = [
  {
    key: "workArrangement",
    title: "Work arrangement",
    description: "How do you mostly earn income?",
    type: "single",
    options: [
      { value: "payg_employee", label: "PAYG employee" },
      { value: "payg_contractor", label: "PAYG contractor" },
      { value: "abn_sole_trader", label: "ABN sole trader" },
      { value: "company_or_trust", label: "Company or trust" },
      { value: "mix", label: "A mix of these" },
    ],
  },
  {
    key: "hasAbn",
    title: "ABN",
    description: "Do you hold an ABN, even if it's not your main work arrangement?",
    type: "boolean",
    options: [
      { value: "true", label: "Yes" },
      { value: "false", label: "No" },
    ],
  },
  {
    key: "investmentPropertyBand",
    title: "Investment properties",
    description: "How many investment properties do you hold?",
    type: "single",
    options: [
      { value: "zero", label: "0" },
      { value: "one", label: "1" },
      { value: "two_to_three", label: "2–3" },
      { value: "four_plus", label: "4+" },
    ],
  },
  {
    key: "superEngagement",
    title: "Super engagement",
    description: "How engaged are you with your superannuation contributions?",
    type: "single",
    options: [
      { value: "employer_only", label: "Employer contributions only" },
      { value: "making_concessional_contributions", label: "Making concessional contributions" },
      { value: "not_sure", label: "Not sure" },
    ],
  },
  {
    key: "householdIncomeBand",
    title: "Household income",
    description: "What band does your household income fall in?",
    type: "single",
    options: [
      { value: "under_100k", label: "Under $100k" },
      { value: "100k_to_190k", label: "$100k–$190k" },
      { value: "190k_to_250k", label: "$190k–$250k" },
      { value: "250k_plus", label: "$250k+" },
    ],
  },
  {
    key: "otherIncomeSources",
    title: "Other income sources",
    description: "Select any that apply.",
    type: "multi",
    options: [
      { value: "dividends", label: "Dividends" },
      { value: "capital_gains", label: "Capital gains" },
      { value: "crypto", label: "Crypto" },
      { value: "foreign", label: "Foreign income" },
      { value: "none", label: "None" },
    ],
  },
];
