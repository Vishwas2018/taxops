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
}

/** Who a `KeyDate` entry is typically relevant to - reuses the same "contractor / property
 * investor" vocabulary as the rest of the app (see `isContractorLikeArrangement` and
 * `getRelevantTipCategories` in `lib/tax-profile/derived.ts`) rather than inventing new terms,
 * displayed as chips rather than used to filter the timeline in v1. */
export type KeyDateAudience = "everyone" | "contractor" | "property-investor";

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
