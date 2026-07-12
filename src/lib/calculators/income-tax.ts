import type { TaxYearConfig } from "@/lib/tax-config/types";
import { toCents, toDollars } from "./money";

export interface IncomeTaxBracketBreakdown {
  bracketMin: number;
  bracketMax: number | null;
  rate: number;
  taxableAmount: number;
  taxOnBracket: number;
}

export interface IncomeTaxResult {
  financialYear: string;
  isEstimate: true;
  taxableIncome: number;
  grossTax: number;
  litoOffset: number;
  medicareLevy: number;
  netTax: number;
  effectiveRate: number;
  breakdown: IncomeTaxBracketBreakdown[];
}

/**
 * Resident individual income tax: marginal brackets, less the Low Income Tax Offset
 * (non-refundable - can't take gross tax below zero), plus the Medicare levy (with its
 * standard low-income shade-in).
 *
 * Assumptions (not modeled - out of v1 scope):
 * - Resident taxpayer, standard (non-senior/pensioner) Medicare levy thresholds, no family
 *   thresholds.
 * - No Medicare Levy Surcharge (private health insurance status not considered).
 * - No offsets other than LITO (e.g. no SAPTO).
 * - No HELP/STSL repayment obligations.
 *
 * Rounding policy: each bracket's tax, the LITO offset, and the Medicare levy are each
 * rounded to the nearest cent once, then summed as integers - see `./money.ts`.
 */
export function calculateIncomeTax(taxableIncome: number, config: TaxYearConfig): IncomeTaxResult {
  if (taxableIncome < 0) {
    throw new Error("taxableIncome cannot be negative");
  }

  const incomeCents = toCents(taxableIncome);

  const breakdown: IncomeTaxBracketBreakdown[] = [];
  let grossTaxCents = 0;

  for (const bracket of config.incomeTaxBrackets.value) {
    const bracketMinCents = toCents(bracket.min);
    const bracketMaxCents = bracket.max === null ? null : toCents(bracket.max);
    const upperCents = bracketMaxCents === null ? incomeCents : Math.min(incomeCents, bracketMaxCents);
    const taxableInBracketCents = Math.max(0, upperCents - bracketMinCents);
    const taxOnBracketCents = Math.round(taxableInBracketCents * bracket.rate);

    grossTaxCents += taxOnBracketCents;
    breakdown.push({
      bracketMin: bracket.min,
      bracketMax: bracket.max,
      rate: bracket.rate,
      taxableAmount: toDollars(taxableInBracketCents),
      taxOnBracket: toDollars(taxOnBracketCents),
    });
  }

  const litoCents = calculateLitoCents(incomeCents, config);
  const incomeTaxAfterOffsetsCents = Math.max(0, grossTaxCents - litoCents);
  const medicareLevyCents = calculateMedicareLevyCents(incomeCents, config);
  const netTaxCents = incomeTaxAfterOffsetsCents + medicareLevyCents;

  return {
    financialYear: config.financialYear,
    isEstimate: true,
    taxableIncome,
    grossTax: toDollars(grossTaxCents),
    litoOffset: toDollars(litoCents),
    medicareLevy: toDollars(medicareLevyCents),
    netTax: toDollars(netTaxCents),
    effectiveRate: incomeCents === 0 ? 0 : netTaxCents / incomeCents,
    breakdown,
  };
}

/**
 * The marginal rate that applies to the next dollar of income at `taxableIncome`. Used by
 * other engines (e.g. property cash flow) that need "your marginal rate" rather than a full
 * tax calculation.
 */
export function marginalRateAt(taxableIncome: number, config: TaxYearConfig): number {
  const incomeCents = toCents(Math.max(0, taxableIncome));
  const brackets = config.incomeTaxBrackets.value;

  const bracket = brackets.find(
    (b) => b.max === null || incomeCents <= toCents(b.max),
  );

  if (!bracket) {
    // Invariant guard, not user-input handling: a correctly authored TaxYearConfig always
    // has a final bracket with max: null, which always matches. This only fires if a config
    // file is edited to drop that top bracket.
    throw new Error("tax-config brackets must end with a max: null bracket covering all income");
  }

  return bracket.rate;
}

function calculateMedicareLevyCents(incomeCents: number, config: TaxYearConfig): number {
  const { rate, lowIncomeThresholds } = config.medicareLevy;
  const lowerCents = toCents(lowIncomeThresholds.value.singleLower);
  const upperCents = toCents(lowIncomeThresholds.value.singleUpper);

  if (incomeCents <= lowerCents) {
    return 0;
  }

  const fullLevyCents = Math.round(incomeCents * rate.value);

  if (incomeCents > upperCents) {
    return fullLevyCents;
  }

  // Standard shade-in: 10% of the amount over the lower threshold, capped at the full levy.
  const shadeInCents = Math.round((incomeCents - lowerCents) * 0.1);
  return Math.min(shadeInCents, fullLevyCents);
}

function calculateLitoCents(incomeCents: number, config: TaxYearConfig): number {
  const { maxOffset, fullOffsetThreshold, firstTaper, secondTaper } = config.lito.value;
  const maxCents = toCents(maxOffset);
  const fullThresholdCents = toCents(fullOffsetThreshold);
  const firstUpperCents = toCents(firstTaper.upperThreshold);
  const secondUpperCents = toCents(secondTaper.upperThreshold);

  if (incomeCents <= fullThresholdCents) {
    return maxCents;
  }
  if (incomeCents >= secondUpperCents) {
    return 0;
  }
  if (incomeCents <= firstUpperCents) {
    const reduction = Math.round((incomeCents - fullThresholdCents) * firstTaper.rate);
    return Math.max(0, maxCents - reduction);
  }

  const offsetAtFirstUpperCents =
    maxCents - Math.round((firstUpperCents - fullThresholdCents) * firstTaper.rate);
  const furtherReduction = Math.round((incomeCents - firstUpperCents) * secondTaper.rate);
  return Math.max(0, offsetAtFirstUpperCents - furtherReduction);
}
