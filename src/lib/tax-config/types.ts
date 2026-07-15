/** A single marginal tax bracket. `max: null` marks the top (uncapped) bracket. */
export interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;
}

/**
 * Wraps a config value with its ATO source and a `verified` flag. `verified: false` means
 * this value could not be independently reconfirmed for the current financial year (e.g. an
 * annually-indexed threshold) and was carried forward from the last confirmed year - see
 * PROGRESS.md's Human Gate 1 notes for exactly which values need sign-off before use.
 */
export interface SourcedValue<T> {
  value: T;
  source: string;
  verified: boolean;
  note?: string;
  /** True when `value` is last-year's figure carried forward because this year's indexed
   * figure has not yet been gazetted (distinct from `verified: false`, which can also mean
   * "not yet independently re-checked" for a value that already exists) - added for Day 15's
   * FY2026-27 Medicare low-income thresholds, gazetted later in the financial year than this
   * config is built. See `docs/updating-tax-data.md`. */
  pendingIndexation?: boolean;
}

export interface TaxYearConfig {
  financialYear: string;
  incomeTaxBrackets: SourcedValue<TaxBracket[]>;
  medicareLevy: {
    rate: SourcedValue<number>;
    /**
     * Only `singleLower`/`singleUpper` are wired into `calculateIncomeTax` in v1 - the
     * family/senior/per-dependant figures are stored for reference (and a future feature)
     * but are not yet modeled; there is no verified "upper" threshold for those categories
     * here, only the lower ones the task supplied.
     */
    lowIncomeThresholds: SourcedValue<{
      singleLower: number;
      singleUpper: number;
      familyLower: number;
      seniorSingleLower: number;
      seniorFamilyLower: number;
      perDependant: number;
    }>;
  };
  lito: SourcedValue<{
    maxOffset: number;
    fullOffsetThreshold: number;
    firstTaper: { rate: number; upperThreshold: number };
    secondTaper: { rate: number; upperThreshold: number };
  }>;
  superGuarantee: {
    rate: SourcedValue<number>;
    concessionalContributionsCap: SourcedValue<number>;
  };
  division293: {
    incomeThreshold: SourcedValue<number>;
    rate: SourcedValue<number>;
  };
  gst: {
    rate: SourcedValue<number>;
    /** Mandatory GST registration turnover threshold - not FY-specific or indexed. */
    registrationThreshold: SourcedValue<number>;
  };
  helpRepayment: {
    /** Equal to `bands[0].min` - kept as its own named value since it's the figure most
     * worth surfacing directly in the UI ("you're below the repayment threshold"). */
    minimumRepaymentIncome: SourcedValue<number>;
    bands: SourcedValue<TaxBracket[]>;
    /** Above `threshold`, repayment is a flat `rate` of total repayment income instead of
     * the marginal bands - this is the "cap" the marginal system phases into. */
    cap: SourcedValue<{ threshold: number; rate: number }>;
  };
  /**
   * New value class, first present from FY2026-27 (the $1,000 standard/"instant" deduction
   * for work-related expenses, commencing 1 July 2026) - optional because no earlier
   * `TaxYearConfig` (e.g. `fy2025-26.ts`) has it, not because it's optional within a year that
   * does. Config-only as of Day 15: `eligibilityNote` documents that it applies to PAYG
   * employment/labour income only (not self-employed/ABN business income or investment
   * income), which is why no calculator in `lib/calculators/` (all of which model day-rate
   * ABN/contractor income) wires it in yet - see PROGRESS.md's Day 15 entry for the reasoning
   * behind that decision, made explicitly rather than left implicit.
   */
  standardWorkRelatedDeduction?: {
    amount: SourcedValue<number>;
    eligibilityNote: string;
  };
}

/** Who a `KeyDate` entry is typically relevant to - reuses the same "contractor / property
 * investor" vocabulary as the rest of the app (see `isContractorLikeArrangement` and
 * `getRelevantTipCategories` in `lib/tax-profile/derived.ts`) rather than inventing new terms,
 * displayed as chips rather than used to filter the timeline in v1.
 *
 * `"everyone-with-employer"` was added on Day 15 for the FY2026-27 Payday Super entry
 * (`key-dates-2026-27.ts`) - narrower than `"everyone"` (an employer-paid SG obligation doesn't
 * apply to a purely self-employed ABN contractor with no employees), but broader than
 * `"contractor"` or `"property-investor"`, so a new value was added rather than overloading
 * either existing one. */
export type KeyDateAudience =
  | "everyone"
  | "contractor"
  | "property-investor"
  | "everyone-with-employer";

/**
 * One entry in the static tax-dates timeline (`lib/tax-config/key-dates.ts`). Not part of
 * `TaxYearConfig` itself - unlike a rate or threshold, nothing in `lib/calculators/` consumes
 * these; they exist purely for the `/tax-dates` reference page and the dashboard's "next key
 * date" line, per CLAUDE.md's `no advisory language` rule the `description` is a plain
 * statement of what the date is, never advice about what to do about it.
 */
export interface KeyDate {
  /** Stable, unique, kebab-case identifier - not shown in the UI, used for React keys and to
   * make individual entries addressable in tests. */
  id: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  title: string;
  description: string;
  /** At least one entry - most dates apply to more than one audience. */
  audience: KeyDateAudience[];
  source: string;
  verified: boolean;
}
