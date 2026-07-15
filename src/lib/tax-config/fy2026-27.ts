import type { TaxYearConfig } from "./types";

/**
 * FY2026-27 (1 July 2026 - 30 June 2027) Australian tax rates and thresholds.
 *
 * Every value below carries a `source` and a `verified` flag - see `SourcedValue` in
 * `./types.ts`. Values with `verified: false` (or `pendingIndexation: true`) need human
 * reconfirmation before this config is relied on for anything user-facing - see PROGRESS.md's
 * Day 15 entry (Human Gate 3) for the full sign-off table this file was built alongside.
 *
 * This is the first FY2026-27 config: two Acts (Treasury Laws Amendment (Tax Reform No. 1) Act
 * 2026, No. 49/2026, and Income Tax Rates Amendment (Tax Reform No. 1) Act 2026, No. 50/2026 -
 * both Royal Assent 26 June 2026, see Day 13.5) commence their tax-cut and standard-deduction
 * provisions on 1 July 2026, the start of this financial year - a materially different config
 * surface from a routine indexation-only rollover, per `docs/updating-tax-data.md`'s Day 13.5
 * forward note.
 */
export const fy2026_27: TaxYearConfig = {
  financialYear: "2026-27",

  // Second bracket rate cut 16% -> 15% - Income Tax Rates Amendment (Tax Reform No. 1) Act 2026
  // (No. 50/2026), effective 1 July 2026. All other bracket thresholds and rates unchanged from
  // FY2025-26. Cross-verified against five independent secondary sources (atotaxrates.info,
  // superguide.com.au, austax.tools, wagecalculator.com.au, countrytaxcalc.com), all agreeing on
  // the same bracket table - direct ato.gov.au fetches returned HTTP 403 (bot-blocked, the same
  // recurring pattern documented in docs/updating-tax-data.md).
  incomeTaxBrackets: {
    value: [
      { min: 0, max: 18_200, rate: 0 },
      { min: 18_200, max: 45_000, rate: 0.15 },
      { min: 45_000, max: 135_000, rate: 0.3 },
      { min: 135_000, max: 190_000, rate: 0.37 },
      { min: 190_000, max: null, rate: 0.45 },
    ],
    source: "https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents",
    verified: true,
    note: "16% second-bracket rate cut to 15% from 1 July 2026 - Income Tax Rates Amendment (Tax Reform No. 1) Act 2026 (No. 50/2026). A further cut to 14% is legislated for 1 July 2027 - not yet relevant to this file.",
  },

  medicareLevy: {
    // No source suggests any change to the 2% base rate itself for FY2026-27 - only the
    // low-income thresholds below are subject to fresh indexation.
    rate: {
      value: 0.02,
      source:
        "https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy",
      verified: true,
    },
    // NOT YET GAZETTED for FY2026-27 as of this file's build - the 2.9% uplift already in
    // fy2025-26.ts's figures was a Budget-announced correction to FY2025-26 itself
    // (retroactive to 1 July 2025, confirmed directly in the Budget 2026-27 "New tax cuts for
    // Australian workers" factsheet, page 2: "increase the Medicare levy low-income thresholds
    // by 2.9 per cent ... from 1 July 2025"), not a second, new FY2026-27 indexation round.
    // ATO typically gazettes the new financial year's thresholds later in the year once CPI
    // data is available (historically around Feb-Mar) - carrying forward FY2025-26's figures
    // unchanged as the best available placeholder, flagged explicitly rather than guessed at.
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
      verified: false,
      pendingIndexation: true,
      note: "FY2025-26 figures carried forward unchanged - FY2026-27's own indexed thresholds are not yet gazetted. Expect a further increase (CPI-linked, typically low single-digit percent) once published; re-verify before relying on this for anything beyond a placeholder.",
    },
  },

  // Stable since the FY2020-21 LITO changes; not subject to annual indexation. No source
  // suggests any FY2026-27 change.
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
      note: "Unchanged from FY2025-26 - 12% was the final legislated step. Separately, 'Payday Super' begins 1 July 2026 (SG must be paid within 7 business days of each payday rather than quarterly) - a payment-timing mechanism change, not a rate change, but it means there are no FY2026-27 quarterly SG due dates the way key-dates.ts models for FY2025-26 (see PROGRESS.md's Day 15 entry).",
    },
    concessionalContributionsCap: {
      value: 32_500,
      source: "https://www.ato.gov.au/rates/key-superannuation-rates-and-thresholds/",
      verified: true,
      note: "Up from $30,000 in FY2025-26 - one $2,500 AWOTE-linked indexation step.",
    },
  },

  division293: {
    incomeThreshold: {
      value: 250_000,
      source: "https://www.ato.gov.au/rates/key-superannuation-rates-and-thresholds/",
      verified: true,
      note: "Fixed threshold, not indexed, unchanged since introduction in FY2017-18 - still $250,000 for FY2026-27.",
    },
    rate: {
      value: 0.15,
      source: "https://www.ato.gov.au/rates/key-superannuation-rates-and-thresholds/",
      verified: true,
    },
  },

  // GST rate and registration threshold - unchanged since GST's introduction, not FY-specific
  // or indexed. No source suggests any FY2026-27 change.
  gst: {
    rate: {
      value: 0.1,
      source: "https://www.ato.gov.au/businesses-and-organisations/international-tax-for-business/gst-for-non-resident-businesses/how-australian-gst-works",
      verified: true,
    },
    registrationThreshold: {
      value: 75_000,
      source: "https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/registering-for-gst",
      verified: true,
      note: "Mandatory registration turnover threshold ($150,000 for non-profits, not modeled here).",
    },
  },

  // Indexed thresholds for FY2026-27. Notably, these are the exact $69,528 / $129,717 /
  // $186,050 figures that fy2025-26.ts's own comment flagged as a wrong-year distraction during
  // Day 3.5's research (a search result titled "...for 2026" that was actually describing the
  // indexed FY2026-27 thresholds, not FY2025-26's) - what was correctly rejected then is
  // correctly used now, a real instance of the exact confusion docs/updating-tax-data.md's
  // Day 3.5 near-miss writeup warns about. Cross-verified via five independent secondary
  // sources (fairworkmate.com.au, wagecalculator.com.au, atotaxrates.info, taxly.au,
  // austax.tools) that all agree; direct ato.gov.au fetches returned HTTP 403 (bot-blocked).
  helpRepayment: {
    minimumRepaymentIncome: {
      value: 69_528,
      source:
        "https://www.ato.gov.au/tax-rates-and-codes/study-and-training-support-loans-rates-and-repayment-thresholds",
      verified: true,
      note: "Up from $67,000 in FY2025-26 - a 2.8% indexation increase.",
    },
    bands: {
      value: [
        { min: 69_528, max: 129_717, rate: 0.15 },
        // max: null deliberate, matching fy2025-26.ts's own note - the 17% band must keep
        // accumulating indefinitely for calculateHelpRepayment's min(marginal, flat 10%)
        // comparison to work; capping it at the cap threshold instead freezes the marginal
        // amount there and produces a wrong (too-low) repayment for high incomes.
        { min: 129_717, max: null, rate: 0.17 },
      ],
      source:
        "https://www.ato.gov.au/tax-rates-and-codes/study-and-training-support-loans-rates-and-repayment-thresholds",
      verified: true,
      note: "Marginal bands - repayment is 15c/$1 over $69,528 up to $129,717, then 17c/$1 over $129,717 (uncapped - see the cap field below for where the flat 10% takes over instead).",
    },
    cap: {
      value: { threshold: 186_050, rate: 0.1 },
      source:
        "https://www.ato.gov.au/tax-rates-and-codes/study-and-training-support-loans-rates-and-repayment-thresholds",
      verified: true,
      note: "Cross-checks against the bands above: (186,050 - 129,717) * 0.17 + 9,028.35 ~= 18,604.96, versus a flat 10% of 186,050 = 18,605.00 - the same near-exact crossover pattern FY2025-26's cap threshold has (marginal formula lands a few cents below the flat cap right at this threshold).",
    },
  },

  // New value class, first present from FY2026-27 - see the `standardWorkRelatedDeduction`
  // field's own doc comment in types.ts for why this is optional on TaxYearConfig rather than
  // required. Config-only: no calculator in lib/calculators/ wires this in (see PROGRESS.md's
  // Day 15 entry) since every existing engine models day-rate ABN/contractor income, which this
  // deduction's eligibility rule explicitly excludes.
  standardWorkRelatedDeduction: {
    amount: {
      value: 1_000,
      source:
        "https://www.ato.gov.au/about-ato/new-legislation/in-detail/individuals/standard-deduction-for-work-related-expenses",
      verified: true,
      note: "Confirmed directly from the Budget 2026-27 'New tax cuts for Australian workers' factsheet (primary source, read in full): a $1,000 instant tax deduction for work-related expenses, commencing the 2026-27 income year, available without substantiation. Mutually exclusive with itemizing >$1,000 in work-related deductions (choose one); charitable donations, union/professional membership fees, and other non-work-related deductions stack on top of it either way.",
    },
    eligibilityNote:
      "Applies to Australian tax residents with employment/labour income only - does not apply to self-employed/ABN business income or investment income (per the Budget factsheet's framing as offsetting 'employment income', cross-verified via two independent secondary sources describing the same self-employed/investment-income exclusion; this specific exclusion was not found verbatim in the primary factsheet text itself, so it carries slightly lower confidence than the $1,000 figure - flagged for Gate 3 sign-off).",
  },
};
