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
    // Updated per the 2026-27 Budget's 2.9% retroactive uplift to FY2025-26 thresholds.
    // Direct ato.gov.au fetches returned HTTP 403 (bot-blocked) - verified instead via two
    // independent secondary sources that cross-agree with each other and with these figures.
    // singleUpper in particular: the brief's own estimate was "~$35,014" via the 10c
    // shade-in formula (singleLower / 0.8); the actual gazetted figure found is $35,013 -
    // a $1 discrepancy, flagged per this task's instructions rather than silently used.
    lowIncomeThresholds: {
      value: {
        singleLower: 28_011,
        singleUpper: 35_013,
        familyLower: 47_238,
        seniorSingleLower: 44_268,
        seniorFamilyLower: 61_623,
        perDependant: 4_338,
      },
      source:
        "https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction/medicare-levy-reduction-for-low-income-earners",
      verified: true,
      note: "2.9% uplift per Budget Paper No. 2 (12 May 2026), retroactive to 1 July 2025. singleUpper confirmed at $35,013 (not the brief's estimated ~$35,014 - see note above). Family/senior/per-dependant figures are stored for reference only; only single lower/upper are wired into calculateIncomeTax in v1.",
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

  // FY2025-26 introduced a new marginal repayment system (previously a single flat
  // percentage of total repayment income applied once you crossed the minimum threshold).
  // Direct ato.gov.au fetches returned HTTP 403 (bot-blocked); verified via two independent
  // secondary sources that cross-agree with each other. One search initially returned
  // $69,528/$129,717/$186,050 as "2025-26" figures - a second search confirmed those are
  // actually the *indexed FY2026-27* thresholds, and the true FY2025-26 figures are the ones
  // below. The $179,286 cap threshold this task specified independently cross-checks exactly
  // against these band figures: (179,286 - 125,000) * 0.17 + 8,700 ~= 179,286 * 0.10.
  helpRepayment: {
    minimumRepaymentIncome: {
      value: 67_000,
      source:
        "https://www.ato.gov.au/tax-rates-and-codes/study-and-training-support-loans-rates-and-repayment-thresholds",
      verified: true,
      note: "Up from $54,435 in FY2024-25 - a large one-off increase from the Universities Accord reforms, not routine indexation.",
    },
    bands: {
      value: [
        { min: 67_000, max: 125_000, rate: 0.15 },
        // max: null here is deliberate, not a bug - the 17% band must keep accumulating
        // indefinitely for the calculateHelpRepayment engine's min(marginal, flat 10%)
        // comparison to correctly identify when the flat cap below takes over. Capping
        // this band's max at the $179,286 cap threshold instead freezes the marginal
        // amount there, which produced a wrong (too-low) repayment for high incomes - see
        // help-repayment.test.ts's golden-file test.
        { min: 125_000, max: null, rate: 0.17 },
      ],
      source:
        "https://www.ato.gov.au/tax-rates-and-codes/study-and-training-support-loans-rates-and-repayment-thresholds",
      verified: true,
      note: "Marginal bands - repayment is 15c/$1 over $67,000 up to $125,000, then 17c/$1 over $125,000 (uncapped - see the cap field below for where the flat 10% takes over instead).",
    },
    cap: {
      value: { threshold: 179_286, rate: 0.1 },
      source:
        "https://www.ato.gov.au/tax-rates-and-codes/study-and-training-support-loans-rates-and-repayment-thresholds",
      verified: true,
      note: "Above this threshold, repayment is a flat 10% of total repayment income instead of continuing the marginal bands (the marginal formula would otherwise exceed 10% of income above this point).",
    },
  },
};
