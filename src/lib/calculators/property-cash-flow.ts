import type { TaxYearConfig } from "@/lib/tax-config/types";
import { marginalRateAt } from "./income-tax";
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
  /** The investor's taxable income from all other sources, used to find their marginal
   * rate for this property's tax effect. */
  otherTaxableIncome: number;
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
 * - Marginal tax rate is approximated using the rate applicable at `otherTaxableIncome`; it
 *   does not model this property's own result pushing the investor into a different bracket.
 * - No capital gains tax, loan principal repayments, land tax, or depreciation recapture on
 *   sale.
 * - Pre-advice estimate only.
 */
export function calculatePropertyCashFlow(
  input: PropertyCashFlowInput,
  config: TaxYearConfig,
): PropertyCashFlowResult {
  const rentCents = toCents(input.annualRentalIncome);
  const expensesCents = toCents(input.annualExpenses);
  const interestCents = toCents(input.annualLoanInterest);
  const depreciationCents = toCents(input.annualDepreciation);

  const netRentalResultCents = rentCents - expensesCents - interestCents - depreciationCents;
  const cashOnlyResultCents = rentCents - expensesCents - interestCents;

  const marginalTaxRate = marginalRateAt(Math.max(0, input.otherTaxableIncome), config);
  const taxEffectCents = Math.round(-netRentalResultCents * marginalTaxRate);
  const afterTaxCashFlowCents = cashOnlyResultCents + taxEffectCents;

  return {
    financialYear: config.financialYear,
    isEstimate: true,
    netRentalResult: toDollars(netRentalResultCents),
    isNegativelyGeared: netRentalResultCents < 0,
    marginalTaxRate,
    taxEffect: toDollars(taxEffectCents),
    cashOnlyResult: toDollars(cashOnlyResultCents),
    afterTaxCashFlow: toDollars(afterTaxCashFlowCents),
    assumptions: [
      "Depreciation is a non-cash deduction: it reduces the taxable rental result but is excluded from the cash-only result.",
      "Marginal tax rate is approximated at your other taxable income and does not account for this property's result shifting you into a different bracket.",
      "Does not model capital gains tax, loan principal repayments, land tax, or depreciation recapture on sale.",
      "Pre-advice estimate only - actual deductibility depends on your circumstances; confirm with a registered tax agent.",
    ],
  };
}
