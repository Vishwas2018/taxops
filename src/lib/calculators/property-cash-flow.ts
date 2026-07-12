import type { TaxYearConfig } from "@/lib/tax-config/types";
import { toCents, toDollars } from "./money";

export interface PropertyCashFlowInput {
  annualRentalIncome: number;
  /** Rates, insurance, agent fees, repairs, etc. - excludes interest and depreciation,
   * which are tracked separately below for clarity. */
  annualExpenses: number;
  annualLoanInterest: number;
  /** From a depreciation schedule (see the depreciation calculator) - supplied here, not
   * computed. */
  annualDepreciation: number;
  /** The investor's marginal tax rate (0-1), chosen directly by the caller - e.g. from a
   * bracket-rate select populated from `config.incomeTaxBrackets` - rather than derived from
   * a whole taxable-income figure. This avoids the ambiguity of picking a single income
   * value to represent a bracket that spans a wide range. */
  marginalTaxRate: number;
}

export interface PropertyCashFlowResult {
  financialYear: string;
  isEstimate: true;
  /** Rent minus expenses, interest, and depreciation - the taxable rental result. Negative
   * means negatively geared. */
  netRentalResult: number;
  isNegativelyGeared: boolean;
  marginalTaxRate: number;
  /** Positive = tax saving from a loss; negative = additional tax payable on a profit. */
  taxEffect: number;
  /** Rent minus expenses and interest only (excludes the non-cash depreciation deduction). */
  cashOnlyResult: number;
  /** cashOnlyResult + taxEffect: the estimated after-tax cash position for the year. */
  afterTaxCashFlow: number;
  assumptions: string[];
}

/**
 * Property investment cash flow, including the tax effect of negative gearing at the
 * investor's marginal rate.
 *
 * Depreciation is a non-cash deduction: it reduces the taxable rental result (and so the
 * tax effect) but is deliberately excluded from `cashOnlyResult`, since no cash is actually
 * spent on it.
 *
 * Assumptions (not modeled - out of v1 scope):
 * - The caller supplies the marginal rate directly; this engine does not model this
 *   property's own result shifting the investor into a different bracket.
 * - No capital gains tax, loan principal repayments, land tax, or depreciation recapture on
 *   sale, or borrowing-cost amortization.
 * - Pre-advice estimate only.
 */
export function calculatePropertyCashFlow(
  input: PropertyCashFlowInput,
  config: TaxYearConfig,
): PropertyCashFlowResult {
  if (input.marginalTaxRate < 0 || input.marginalTaxRate > 1) {
    throw new Error("marginalTaxRate must be between 0 and 1");
  }

  const rentCents = toCents(input.annualRentalIncome);
  const expensesCents = toCents(input.annualExpenses);
  const interestCents = toCents(input.annualLoanInterest);
  const depreciationCents = toCents(input.annualDepreciation);

  const netRentalResultCents = rentCents - expensesCents - interestCents - depreciationCents;
  const cashOnlyResultCents = rentCents - expensesCents - interestCents;

  const taxEffectCents = Math.round(-netRentalResultCents * input.marginalTaxRate);
  const afterTaxCashFlowCents = cashOnlyResultCents + taxEffectCents;

  return {
    financialYear: config.financialYear,
    isEstimate: true,
    netRentalResult: toDollars(netRentalResultCents),
    isNegativelyGeared: netRentalResultCents < 0,
    marginalTaxRate: input.marginalTaxRate,
    taxEffect: toDollars(taxEffectCents),
    cashOnlyResult: toDollars(cashOnlyResultCents),
    afterTaxCashFlow: toDollars(afterTaxCashFlowCents),
    assumptions: [
      "Depreciation is a non-cash deduction: it reduces the taxable rental result but is excluded from the cash-only result.",
      "Uses the marginal tax rate you selected and does not account for this property's result shifting you into a different bracket.",
      "Does not model capital gains tax, loan principal repayments, land tax, borrowing-cost amortization, or depreciation recapture on sale.",
      "Pre-advice estimate only - actual deductibility depends on your circumstances; confirm with a registered tax agent.",
    ],
  };
}
