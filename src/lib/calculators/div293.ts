import type { TaxYearConfig } from "@/lib/tax-config/types";
import { toCents, toDollars } from "./money";

export interface Div293Input {
  taxableIncome: number;
  /** Total concessional (before-tax) super contributions for the year. */
  concessionalContributions: number;
}

export interface Div293Result {
  financialYear: string;
  isEstimate: true;
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
 * combined income (taxable income + concessional contributions) exceeds the threshold.
 *
 * Assumptions (not modeled - out of v1 scope):
 * - "Combined income" here is taxable income + concessional contributions. The full ATO
 *   definition of "income for surcharge purposes" also includes reportable fringe benefits
 *   and net investment losses, which this engine does not model.
 * - Excess concessional contributions (above the cap) are assessed separately at marginal
 *   rates elsewhere and are not treated as "low tax" here.
 *
 * Rounding policy: computed in integer cents, converted to dollars at the output boundary -
 * see `./money.ts`.
 */
export function calculateDiv293(input: Div293Input, config: TaxYearConfig): Div293Result {
  if (input.taxableIncome < 0) {
    throw new Error("taxableIncome cannot be negative");
  }
  if (input.concessionalContributions < 0) {
    throw new Error("concessionalContributions cannot be negative");
  }

  const taxableIncomeCents = toCents(input.taxableIncome);
  const contributionsCents = toCents(input.concessionalContributions);
  const capCents = toCents(config.superGuarantee.concessionalContributionsCap.value);
  const thresholdCents = toCents(config.division293.incomeThreshold.value);
  const rate = config.division293.rate.value;

  const lowTaxContributionsCents = Math.min(contributionsCents, capCents);
  const combinedIncomeCents = taxableIncomeCents + contributionsCents;
  const amountOverThresholdCents = Math.max(0, combinedIncomeCents - thresholdCents);
  const div293TaxableAmountCents = Math.min(amountOverThresholdCents, lowTaxContributionsCents);
  const additionalTaxCents = Math.round(div293TaxableAmountCents * rate);

  return {
    financialYear: config.financialYear,
    isEstimate: true,
    combinedIncome: toDollars(combinedIncomeCents),
    threshold: toDollars(thresholdCents),
    amountOverThreshold: toDollars(amountOverThresholdCents),
    lowTaxContributions: toDollars(lowTaxContributionsCents),
    div293TaxableAmount: toDollars(div293TaxableAmountCents),
    additionalTax: toDollars(additionalTaxCents),
    isLiable: additionalTaxCents > 0,
    assumptions: [
      "Combined income is taxable income plus concessional contributions - it does not include reportable fringe benefits or net investment losses.",
      "Concessional contributions above the cap are excess contributions, assessed separately at marginal rates, and are excluded from this comparison.",
      "Pre-advice estimate only - confirm with a registered tax agent.",
    ],
  };
}
