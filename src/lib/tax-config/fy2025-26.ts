import type { TaxYearConfig } from "./types";

/**
 * FY2025-26 (1 July 2025 - 30 June 2026) Australian tax rates and thresholds.
 *
 * Every value below carries a `source` and a `verified` flag - see `SourcedValue` in
 * `./types.ts`. Values with `verified: false` need human reconfirmation against the ATO
 * before this config is relied on for anything user-facing (see PROGRESS.md, Human Gate 1).
 *
 * Deliberately excluded from this file: HELP/STSL repayment thresholds. They're indexed
 * annually and the FY2025-26 figures were not confidently sourced here - see PROGRESS.md.
 */
export const fy2025_26: TaxYearConfig = {
  financialYear: "2025-26",

  // Stage 3 resident individual rates, unchanged from FY2024-25, confirmed against the
  // checksum supplied for this task (0% / 16% / 30% / 37% / 45%).
  incomeTaxBrackets: {
    value: [
      { min: 0, max: 18_200, rate: 0 },
      { min: 18_200, max: 45_000, rate: 0.16 },
      { min: 45_000, max: 135_000, rate: 0.3 },
      { min: 135_000, max: 190_000, rate: 0.37 },
      { min: 190_000, max: null, rate: 0.45 },
    ],
    source: "https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents",
    verified: true,
  },

  medicareLevy: {
    rate: {
      value: 0.02,
      source:
        "https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy",
      verified: true,
    },
    // NOT independently reconfirmed for FY2025-26 - carried forward from the last confirmed
    // FY2024-25 figures ($27,222 / $34,027). Low-income thresholds are indexed annually;
    // flag for Human Gate 1.
    lowIncomeThresholds: {
      value: { singleLower: 27_222, singleUpper: 34_027 },
      source:
        "https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction/medicare-levy-reduction-for-low-income-earners",
      verified: false,
      note: "Carried forward from FY2024-25 - not independently reconfirmed for FY2025-26. Single (no dependents) thresholds only; family and senior/pensioner thresholds are out of v1 scope.",
    },
  },

  // Stable since the FY2020-21 LITO changes; not subject to annual indexation.
  lito: {
    value: {
      maxOffset: 700,
      fullOffsetThreshold: 37_500,
      firstTaper: { rate: 0.05, upperThreshold: 45_000 },
      secondTaper: { rate: 0.015, upperThreshold: 66_667 },
    },
    source:
      "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/low-income-tax-offset",
    verified: true,
  },

  superGuarantee: {
    rate: {
      value: 0.12,
      source: "https://www.ato.gov.au/rates/key-superannuation-rates-and-thresholds/",
      verified: true,
      note: "Final legislated step (11.5% in FY2024-25 -> 12% from 1 July 2025).",
    },
    concessionalContributionsCap: {
      value: 30_000,
      source: "https://www.ato.gov.au/rates/key-superannuation-rates-and-thresholds/",
      verified: true,
      note: "Unchanged from FY2024-25 - indexed in $2,500 increments tied to AWOTE growth; no indexation trigger for FY2025-26.",
    },
  },

  division293: {
    incomeThreshold: {
      value: 250_000,
      source: "https://www.ato.gov.au/rates/key-superannuation-rates-and-thresholds/",
      verified: true,
      note: "Fixed threshold, not indexed, unchanged since introduction in FY2017-18.",
    },
    rate: {
      value: 0.15,
      source: "https://www.ato.gov.au/rates/key-superannuation-rates-and-thresholds/",
      verified: true,
    },
  },
};
