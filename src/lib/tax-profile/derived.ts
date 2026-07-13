import { marginalRateAt } from "@/lib/calculators/income-tax";
import type { TaxYearConfig } from "@/lib/tax-config/types";
import { ARTICLE_CATEGORIES, type ArticleCategory } from "@/lib/content/schema";
import {
  TAX_PROFILE_QUESTION_GROUPS,
  type HouseholdIncomeBand,
  type TaxProfileInput,
  type WorkArrangement,
} from "@/lib/validation/tax-profile";

/** Work arrangements where day-rate/ABN-style contractor content applies. */
const CONTRACTOR_LIKE_ARRANGEMENTS: WorkArrangement[] = [
  "payg_contractor",
  "abn_sole_trader",
  "company_or_trust",
  "mix",
];

export function isContractorLikeArrangement(
  workArrangement: WorkArrangement | null | undefined,
): boolean {
  return !!workArrangement && CONTRACTOR_LIKE_ARRANGEMENTS.includes(workArrangement);
}

/**
 * Fraction of the six question groups that have been answered. `null` and an empty
 * `otherIncomeSources` array both count as "not answered" - only a concrete value (including
 * a deliberately-empty single-select-equivalent like `investmentPropertyBand: "zero"`) counts.
 * Purely derived, never gates anything - see CLAUDE.md's Guided Tax Profile module.
 */
export function computeProfileCompleteness(profile: TaxProfileInput): {
  answered: number;
  total: number;
  percent: number;
} {
  const total = TAX_PROFILE_QUESTION_GROUPS.length;
  let answered = 0;

  for (const group of TAX_PROFILE_QUESTION_GROUPS) {
    const value = profile[group.key];
    if (group.type === "multi") {
      if (Array.isArray(value) && value.length > 0) answered += 1;
    } else if (value !== null && value !== undefined) {
      answered += 1;
    }
  }

  return { answered, total, percent: Math.round((answered / total) * 100) };
}

/**
 * Tips-category relevance, mapped only from work arrangement + investment property band (the
 * two fields named for this consumer) - a fixed lookup table, not a scoring engine. Order
 * matches `ARTICLE_CATEGORIES` for a stable render order.
 */
export function getRelevantTipCategories(profile: TaxProfileInput): ArticleCategory[] {
  const relevant = new Set<ArticleCategory>();

  if (isContractorLikeArrangement(profile.workArrangement)) {
    relevant.add("contractor-expenses");
  }
  if (profile.workArrangement) {
    relevant.add("superannuation");
  }
  if (profile.investmentPropertyBand && profile.investmentPropertyBand !== "zero") {
    relevant.add("property-deductions");
  }
  if (
    profile.investmentPropertyBand === "two_to_three" ||
    profile.investmentPropertyBand === "four_plus"
  ) {
    relevant.add("wealth-preservation");
  }

  return ARTICLE_CATEGORIES.filter((category) => relevant.has(category));
}

/** One representative taxable income per household-income band, used only to look up a
 * marginal rate via the real bracket config (`marginalRateAt`) - never a separately inlined
 * rate. Household income is a broader (often combined) figure than an individual's taxable
 * income, so this is a best-effort default, not a precise derivation - the calculator UI
 * labels it as an editable suggestion, not a computed fact. */
const HOUSEHOLD_INCOME_BAND_REPRESENTATIVE_INCOME: Record<HouseholdIncomeBand, number> = {
  under_100k: 50_000,
  "100k_to_190k": 145_000,
  "190k_to_250k": 220_000,
  "250k_plus": 300_000,
};

export function suggestMarginalRateForIncomeBand(
  band: HouseholdIncomeBand | null | undefined,
  config: TaxYearConfig,
): number | null {
  if (!band) return null;
  return marginalRateAt(HOUSEHOLD_INCOME_BAND_REPRESENTATIVE_INCOME[band], config);
}
