import type { TaxYearConfig } from "@/lib/tax-config/types";
import { toCents, toDollars } from "./money";

export interface HelpRepaymentResult {
  financialYear: string;
  isEstimate: true;
  repaymentIncome: number;
  minimumRepaymentIncome: number;
  repaymentAmount: number;
  isCapApplied: boolean;
  assumptions: string[];
}

/**
 * Compulsory HELP/STSL repayment under FY2025-26's marginal band system.
 *
 * @param repaymentIncome Repayment income, not taxable income - per the ATO definition this
 * includes taxable income, reportable fringe benefits, total net investment losses (including
 * net rental losses), reportable super contributions, and exempt foreign employment income.
 * This engine takes the figure as a single input; assembling it from its components is the
 * caller's responsibility.
 *
 * Below the minimum repayment threshold, no repayment is owed. From there, repayment is the
 * lesser of (a) the marginal-band amount (15c/$1 then 17c/$1) or (b) a flat 10% of total
 * repayment income - the two formulas cross over exactly at the cap threshold, so taking the
 * minimum of both naturally produces the correct "marginal below the cap, flat 10% above it"
 * behaviour without a separate branch.
 *
 * Rounding policy: computed in integer cents, converted to dollars at the output boundary -
 * see `./money.ts`.
 */
export function calculateHelpRepayment(
  repaymentIncome: number,
  config: TaxYearConfig,
): HelpRepaymentResult {
  if (repaymentIncome < 0) {
    throw new Error("repaymentIncome cannot be negative");
  }

  const incomeCents = toCents(repaymentIncome);
  const { bands, cap, minimumRepaymentIncome } = config.helpRepayment;

  let marginalCents = 0;
  for (const band of bands.value) {
    const bandMinCents = toCents(band.min);
    const bandMaxCents = band.max === null ? null : toCents(band.max);
    const upperCents = bandMaxCents === null ? incomeCents : Math.min(incomeCents, bandMaxCents);
    const inBandCents = Math.max(0, upperCents - bandMinCents);
    marginalCents += Math.round(inBandCents * band.rate);
  }

  const capCents = Math.round(incomeCents * cap.value.rate);
  const repaymentCents = Math.min(marginalCents, capCents);

  return {
    financialYear: config.financialYear,
    isEstimate: true,
    repaymentIncome,
    minimumRepaymentIncome: minimumRepaymentIncome.value,
    repaymentAmount: toDollars(repaymentCents),
    isCapApplied: repaymentCents === capCents && repaymentCents < marginalCents,
    assumptions: [
      "repaymentIncome must already include reportable fringe benefits, net investment losses, reportable super contributions, and exempt foreign income - this engine does not derive it from taxable income alone.",
      "Pre-advice estimate only - confirm with a registered tax agent or the ATO's own calculator.",
    ],
  };
}
