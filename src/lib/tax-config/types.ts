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
    /** Standard (non-senior/pensioner) single-person thresholds only - see assumptions. */
    lowIncomeThresholds: SourcedValue<{ singleLower: number; singleUpper: number }>;
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
}
