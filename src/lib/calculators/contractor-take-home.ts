import type { TaxYearConfig } from "@/lib/tax-config/types";
import { calculateIncomeTax, type IncomeTaxResult } from "./income-tax";
import { toCents, toDollars } from "./money";

/** Weeks worked per year assumed when the caller doesn't supply one: 52 minus 4 weeks of
 * assumed unpaid leave/downtime, a common contractor planning figure. */
export const DEFAULT_WEEKS_WORKED_PER_YEAR = 48;

export interface ContractorTakeHomeInput {
  dayRate: number;
  daysPerWeek: number;
  /** Defaults to `DEFAULT_WEEKS_WORKED_PER_YEAR` (48) if omitted. */
  weeksWorkedPerYear?: number;
  /** Whether `dayRate` already includes the super guarantee, or super is paid on top of it. */
  superTreatment: "inclusive" | "exclusive";
}

export interface ContractorTakeHomeResult {
  financialYear: string;
  isEstimate: true;
  weeksWorkedPerYear: number;
  billableDaysPerYear: number;
  /** Total amount paid for the year (day rate x billable days), before separating out super
   * when `superTreatment` is "inclusive". */
  grossIncome: number;
  superGuarantee: number;
  /** The amount actually subject to income tax (gross income minus super). */
  assessableIncome: number;
  incomeTax: IncomeTaxResult;
  netTakeHome: number;
  assumptions: string[];
}

/**
 * Contractor take-home pay from a day rate. Taxed as ordinary individual income at marginal
 * rates - this engine does not model PSI (personal services income) attribution rules or any
 * company/trust structuring; that comparison is a separate calculator (PAYG vs ABN/company).
 *
 * Rounding policy: all amounts are computed in integer cents and converted to dollars only
 * at the output boundary - see `./money.ts`.
 */
export function calculateContractorTakeHome(
  input: ContractorTakeHomeInput,
  config: TaxYearConfig,
): ContractorTakeHomeResult {
  if (input.dayRate < 0) {
    throw new Error("dayRate cannot be negative");
  }
  if (input.daysPerWeek < 0) {
    throw new Error("daysPerWeek cannot be negative");
  }

  const weeksWorkedPerYear = input.weeksWorkedPerYear ?? DEFAULT_WEEKS_WORKED_PER_YEAR;
  const billableDaysPerYear = input.daysPerWeek * weeksWorkedPerYear;
  const grossIncomeCents = toCents(input.dayRate * billableDaysPerYear);

  const sgRate = config.superGuarantee.rate.value;
  let superCents: number;
  let assessableCents: number;

  if (input.superTreatment === "inclusive") {
    // The quoted rate already includes super: back out the super component so that
    // assessableIncome + super == grossIncome, with super == assessableIncome * sgRate.
    superCents = Math.round((grossIncomeCents * sgRate) / (1 + sgRate));
    assessableCents = grossIncomeCents - superCents;
  } else {
    assessableCents = grossIncomeCents;
    superCents = Math.round(assessableCents * sgRate);
  }

  const assessableIncome = toDollars(assessableCents);
  const incomeTax = calculateIncomeTax(assessableIncome, config);
  const netTakeHomeCents = assessableCents - toCents(incomeTax.netTax);

  return {
    financialYear: config.financialYear,
    isEstimate: true,
    weeksWorkedPerYear,
    billableDaysPerYear,
    grossIncome: toDollars(grossIncomeCents),
    superGuarantee: toDollars(superCents),
    assessableIncome,
    incomeTax,
    netTakeHome: toDollars(netTakeHomeCents),
    assumptions: [
      "No PSI (personal services income) attribution rules modeled - all income is taxed as ordinary individual income at marginal rates.",
      `Assumes ${weeksWorkedPerYear} billable weeks worked per year unless a different value is supplied.`,
      "Does not model GST, business expenses, or company/trust structuring - see the PAYG vs ABN/company comparison calculator.",
      input.superTreatment === "inclusive"
        ? "Day rate is treated as inclusive of the superannuation guarantee."
        : "Superannuation guarantee is paid in addition to the day rate.",
    ],
  };
}
