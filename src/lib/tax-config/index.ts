import { fy2025_26 } from "./fy2025-26";
import { fy2026_27 } from "./fy2026-27";
import type { TaxYearConfig } from "./types";

/**
 * Every `TaxYearConfig` a calculator surface can be pointed at, keyed by its `financialYear`
 * label. Used by the three calculators that offer an explicit FY selector
 * (`contractor-take-home`, `property-cash-flow`, `division293` - see
 * `docs/updating-tax-data.md`'s "which surface defaults to which financial year" section) to
 * turn a selected label back into the config object the engine needs. The forward-looking
 * (`tax-set-aside`, `gst-threshold`) and retrospective (checklists, tax-dates) surfaces import
 * `fy2025_26`/`fy2026_27` directly instead, per that same doc section - this map exists for the
 * selector surfaces, not as a replacement for every import site.
 */
export const TAX_YEAR_CONFIGS = {
  "2025-26": fy2025_26,
  "2026-27": fy2026_27,
} satisfies Record<string, TaxYearConfig>;

/** Financial years a user can pick from an FY selector, most recent first. */
export const SELECTABLE_FINANCIAL_YEARS = ["2026-27", "2025-26"] as const;

export type SelectableFinancialYear = (typeof SELECTABLE_FINANCIAL_YEARS)[number];

/** The default financial year for surfaces that offer a selector - see
 * `docs/updating-tax-data.md`. */
export const DEFAULT_SELECTABLE_FINANCIAL_YEAR: SelectableFinancialYear = "2026-27";
