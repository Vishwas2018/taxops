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
