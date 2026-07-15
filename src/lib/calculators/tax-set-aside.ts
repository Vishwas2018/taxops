import type { TaxYearConfig } from "@/lib/tax-config/types";
import { calculateHelpRepayment, type HelpRepaymentResult } from "./help-repayment";
import { calculateIncomeTax, type IncomeTaxResult } from "./income-tax";
import { toCents, toDollars } from "./money";

export interface TaxSetAsideInput {
  dayRate: number;
  daysPerWeek: number;
  weeksPerYear: number;
  gstRegistered: boolean;
  hasHelpDebt: boolean;
}

export interface TaxSetAsideGst {
  isRegistered: boolean;
  rate: number;
  /** GST charged on top of `grossIncome` - not part of assessable income, collected on the
   * ATO's behalf and remitted, not spent. Zero when `isRegistered` is false. */
  collected: number;
  registrationThreshold: number;
  /** Whether `grossIncome` alone is at or above the mandatory registration turnover
   * threshold - independent of `isRegistered`, so the UI can flag "you're required to
   * register" even when the toggle is off. */
  aboveRegistrationThreshold: boolean;
}

export interface TaxSetAsideResult {
  financialYear: string;
  isEstimate: true;
  /** dayRate * daysPerWeek * weeksPerYear - GST-exclusive. */
  grossIncome: number;
  incomeTax: IncomeTaxResult;
  help: HelpRepaymentResult | null;
  /** incomeTax.netTax + (help?.repaymentAmount ?? 0) - excludes GST collected, which isn't
   * the contractor's money to begin with. */
  totalSetAside: number;
  setAsidePerInvoiceWeek: number;
  setAsidePercentOfGross: number;
  gst: TaxSetAsideGst;
  assumptions: string[];
}

/**
 * Suggested tax set-aside for a sole-trader/ABN contractor invoicing from a day rate: income
 * tax and (optionally) HELP/STSL repayment, expressed as a total, a per-invoice-week figure,
 * and a percentage of gross income - plus the GST component shown separately, since collected
 * GST is never the contractor's money regardless of how much tax they owe.
 *
 * Assumptions (not modeled - out of v1 scope):
 * - No PAYG instalments already paid are netted off - this is the estimated full-year
 *   liability, not a top-up/remaining-balance figure.
 * - Taxed as sole-trader/individual income at marginal rates: no business deductions, PSI
 *   attribution rules, or company/trust structuring modeled (see the contractor take-home
 *   calculator's PAYG-vs-ABN comparison for a different angle on the same day rate).
 * - `dayRate` is GST-exclusive; when `gstRegistered` is true, GST is calculated on top of
 *   gross income and shown as a separate, itemized figure - collected on behalf of the ATO,
 *   not income, and not included in `totalSetAside`.
 * - GST registration-threshold comparison uses this estimate's annualized gross income
 *   against the ATO's $75,000 turnover figure - the ATO's actual test compares a rolling
 *   12-month current-or-projected turnover, not a single annual estimate.
 * - When `hasHelpDebt` is true, gross income is used as an approximation of HELP repayment
 *   income (see `calculateHelpRepayment`'s own assumptions - repayment income is technically
 *   broader than this).
 * - Estimate only - confirm with a registered tax agent, especially before relying on the
 *   suggested set-aside amount for cash-flow planning.
 *
 * Rounding policy: computed in integer cents, converted to dollars only at the output
 * boundary - see `./money.ts`.
 */
export function calculateSetAside(input: TaxSetAsideInput, config: TaxYearConfig): TaxSetAsideResult {
  if (input.dayRate < 0) {
    throw new Error("dayRate cannot be negative");
  }
  if (input.daysPerWeek < 0) {
    throw new Error("daysPerWeek cannot be negative");
  }
  if (input.weeksPerYear < 0) {
    throw new Error("weeksPerYear cannot be negative");
  }

  const grossIncomeCents = toCents(input.dayRate * input.daysPerWeek * input.weeksPerYear);
  const grossIncome = toDollars(grossIncomeCents);

  const incomeTax = calculateIncomeTax(grossIncome, config);
  const help = input.hasHelpDebt ? calculateHelpRepayment(grossIncome, config) : null;

  const totalSetAsideCents = toCents(incomeTax.netTax) + toCents(help?.repaymentAmount ?? 0);
  const perInvoiceWeekCents =
    input.weeksPerYear === 0 ? 0 : Math.round(totalSetAsideCents / input.weeksPerYear);

  const gstRate = config.gst.rate.value;
  const registrationThresholdCents = toCents(config.gst.registrationThreshold.value);
  const gstCollectedCents = input.gstRegistered ? Math.round(grossIncomeCents * gstRate) : 0;

  return {
    financialYear: config.financialYear,
    isEstimate: true,
    grossIncome,
    incomeTax,
    help,
    totalSetAside: toDollars(totalSetAsideCents),
    setAsidePerInvoiceWeek: toDollars(perInvoiceWeekCents),
    setAsidePercentOfGross: grossIncomeCents === 0 ? 0 : totalSetAsideCents / grossIncomeCents,
    gst: {
      isRegistered: input.gstRegistered,
      rate: gstRate,
      collected: toDollars(gstCollectedCents),
      registrationThreshold: config.gst.registrationThreshold.value,
      aboveRegistrationThreshold: grossIncomeCents >= registrationThresholdCents,
    },
    assumptions: [
      "This is the estimated full-year liability, not a top-up amount - it does not net off any PAYG instalments already paid.",
      "Taxed as sole-trader/individual income at marginal rates - no business deductions, PSI attribution rules, or company/trust structuring modeled.",
      "Day rate is treated as GST-exclusive. GST (if registered) is calculated on top of gross income and shown separately - it is collected on behalf of the ATO, not your income, and is not included in the set-aside total.",
      "The GST registration-threshold comparison uses this estimate's annualized gross income against the ATO's $75,000 turnover figure, not the ATO's actual rolling 12-month current-or-projected turnover test.",
      ...(help
        ? ["HELP repayment is estimated using gross income as a stand-in for repayment income - see the HELP repayment estimate's own assumptions for what that omits."]
        : []),
      "Pre-advice estimate only - confirm with a registered tax agent before relying on this for cash-flow planning.",
    ],
  };
}
