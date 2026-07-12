import type { TaxYearConfig } from "@/lib/tax-config/types";
import { toCents, toDollars } from "./money";

export interface Div293Input {
  /**
   * Income for Division 293 purposes - not the same as taxable income. Per the ATO, this
   * should already include reportable fringe benefits and total net investment losses on
   * top of taxable income (the same "not taxable income" pattern as
   * `calculateHelpRepayment`'s `repaymentIncome`). Concessional contributions are handled
   * separately below - do not include them here, or they'll be double-counted.
   */
  div293Income: number;
  /** Total concessional (before-tax) super contributions for the year. */
  concessionalContributions: number;
}

export interface Div293Result {
  financialYear: string;
  isEstimate: true;
  /** Echoes the input back - lets callers distinguish "income alone is already over the
   * threshold" from "contributions are what push combined income over it" without holding
   * onto the original input separately. */
  div293Income: number;
  combinedIncome: number;
  threshold: number;
  amountOverThreshold: number;
  /** Concessional contributions capped at the concessional contributions cap - contributions
   * above the cap are excess contributions assessed separately at marginal rates, not at the
   * concessional (15%) rate, so they're excluded from the Division 293 comparison. */
  lowTaxContributions: number;
  div293TaxableAmount: number;
  additionalTax: number;
  isLiable: boolean;
  assumptions: string[];
}

/**
 * Division 293: an additional 15% tax on the lesser of (a) low-tax (concessional) super
 * contributions, capped at the concessional contributions cap, or (b) the amount by which
 * combined income (income for Division 293 purposes + concessional contributions) exceeds
 * the threshold.
 *
 * Assumptions (not modeled - out of v1 scope):
 * - `div293Income` must already include reportable fringe benefits and net investment
 *   losses - this engine does not derive it from taxable income alone.
 * - Excess concessional contributions (above the cap) are assessed separately at marginal
 *   rates elsewhere and are not treated as "low tax" here.
 *
 * Rounding policy: computed in integer cents, converted to dollars at the output boundary -
 * see `./money.ts`.
 */
export function calculateDiv293(input: Div293Input, config: TaxYearConfig): Div293Result {
  if (input.div293Income < 0) {
    throw new Error("div293Income cannot be negative");
  }
  if (input.concessionalContributions < 0) {
    throw new Error("concessionalContributions cannot be negative");
  }

  const div293IncomeCents = toCents(input.div293Income);
  const contributionsCents = toCents(input.concessionalContributions);
  const capCents = toCents(config.superGuarantee.concessionalContributionsCap.value);
  const thresholdCents = toCents(config.division293.incomeThreshold.value);
  const rate = config.division293.rate.value;

  const lowTaxContributionsCents = Math.min(contributionsCents, capCents);
  const combinedIncomeCents = div293IncomeCents + contributionsCents;
  const amountOverThresholdCents = Math.max(0, combinedIncomeCents - thresholdCents);
  const div293TaxableAmountCents = Math.min(amountOverThresholdCents, lowTaxContributionsCents);
  const additionalTaxCents = Math.round(div293TaxableAmountCents * rate);

  return {
    financialYear: config.financialYear,
    isEstimate: true,
    div293Income: input.div293Income,
    combinedIncome: toDollars(combinedIncomeCents),
    threshold: toDollars(thresholdCents),
    amountOverThreshold: toDollars(amountOverThresholdCents),
    lowTaxContributions: toDollars(lowTaxContributionsCents),
    div293TaxableAmount: toDollars(div293TaxableAmountCents),
    additionalTax: toDollars(additionalTaxCents),
    isLiable: additionalTaxCents > 0,
    assumptions: [
      "div293Income should already include reportable fringe benefits and net investment losses - it is broader than taxable income.",
      "Concessional contributions above the cap are excess contributions, assessed separately at marginal rates, and are excluded from this comparison.",
      "Pre-advice estimate only - confirm with a registered tax agent.",
    ],
  };
}
