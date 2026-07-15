import type { TaxYearConfig } from "@/lib/tax-config/types";
import { toCents, toDollars } from "./money";

export interface GstThresholdProjectionInput {
  dayRate: number;
  daysPerWeek: number;
  weeksWorkedPerYear: number;
  /** How many weeks into the financial year (from 1 July) this projection's first working
   * week actually falls - lets a mid-year projection report an accurate calendar month for
   * the crossing point instead of always counting from 1 July. Defaults to 0 (projecting from
   * the start of the financial year). */
  weeksAlreadyWorkedThisFY?: number;
}

export interface GstThresholdProjectionResult {
  financialYear: string;
  isEstimate: true;
  projectedAnnualTurnover: number;
  registrationThreshold: number;
  crossesThreshold: boolean;
  /** Financial-year week number (1-indexed from 1 July, including any
   * `weeksAlreadyWorkedThisFY` offset) at which cumulative turnover first reaches the
   * threshold - `null` if the projection doesn't cross it. */
  weekThresholdCrossed: number | null;
  /** Approximate calendar month (and year) the threshold is projected to be crossed in -
   * `null` if the projection doesn't cross it. */
  monthThresholdCrossed: string | null;
  /** How far below the threshold the projected annual turnover sits - `null` when the
   * threshold is crossed (crossing week already conveys the same information there). */
  marginBelowThreshold: number | null;
  assumptions: string[];
}

/**
 * Projects when (if at all) a contractor's GST turnover reaches the ATO's mandatory
 * registration threshold, assuming a level day rate every worked week.
 *
 * Assumptions (not modeled - out of v1 scope):
 * - GST turnover is approximated as contracting income alone (day rate x days x weeks) - any
 *   other business income that would count toward actual GST turnover isn't included.
 * - Assumes a level, unchanging day rate and billable-days pattern every worked week - a real
 *   income pattern with gaps or rate changes will cross the threshold at a different week
 *   than this straight-line projection.
 * - Registration obligations are summarized here as education about what the ATO's rule is,
 *   not advice about whether or when to register - that's a decision for the taxpayer and
 *   their registered tax agent.
 * - Pre-advice estimate only.
 *
 * Rounding policy: computed in integer cents, converted to dollars only at the output
 * boundary - see `./money.ts`.
 */
export function projectGstThreshold(
  input: GstThresholdProjectionInput,
  config: TaxYearConfig,
): GstThresholdProjectionResult {
  if (input.dayRate < 0) {
    throw new Error("dayRate cannot be negative");
  }
  if (input.daysPerWeek < 0) {
    throw new Error("daysPerWeek cannot be negative");
  }
  if (input.weeksWorkedPerYear < 0) {
    throw new Error("weeksWorkedPerYear cannot be negative");
  }
  const weeksOffset = input.weeksAlreadyWorkedThisFY ?? 0;
  if (weeksOffset < 0) {
    throw new Error("weeksAlreadyWorkedThisFY cannot be negative");
  }

  const weeklyIncomeCents = toCents(input.dayRate * input.daysPerWeek);
  const projectedAnnualTurnoverCents = weeklyIncomeCents * input.weeksWorkedPerYear;
  const thresholdCents = toCents(config.gst.registrationThreshold.value);

  const crossingWeekWithinSchedule =
    weeklyIncomeCents === 0 ? null : Math.ceil(thresholdCents / weeklyIncomeCents);
  const crosses =
    crossingWeekWithinSchedule !== null && crossingWeekWithinSchedule <= input.weeksWorkedPerYear;

  const weekThresholdCrossed = crosses ? (crossingWeekWithinSchedule as number) + weeksOffset : null;
  const monthThresholdCrossed =
    weekThresholdCrossed === null ? null : monthLabelForFinancialYearWeek(config.financialYear, weekThresholdCrossed);
  const marginBelowThresholdCents = crosses ? null : thresholdCents - projectedAnnualTurnoverCents;

  return {
    financialYear: config.financialYear,
    isEstimate: true,
    projectedAnnualTurnover: toDollars(projectedAnnualTurnoverCents),
    registrationThreshold: config.gst.registrationThreshold.value,
    crossesThreshold: crosses,
    weekThresholdCrossed,
    monthThresholdCrossed,
    marginBelowThreshold: marginBelowThresholdCents === null ? null : toDollars(marginBelowThresholdCents),
    assumptions: [
      "GST turnover is approximated as contracting income alone (day rate x billable days x weeks) - any other business income isn't included.",
      "Assumes a level day rate and billable-days pattern every worked week - a real income pattern with gaps or rate changes will cross the threshold at a different week than this straight-line projection.",
      "This describes what the ATO's registration threshold is and when this projection would reach it - it isn't advice about whether or when to register; that's a decision for you and your registered tax agent.",
      "Pre-advice estimate only.",
    ],
  };
}

/** 1 July of the financial year's start calendar year, from a "YYYY-YY" label - e.g.
 * "2025-26" -> 1 July 2025. */
function financialYearStart(financialYear: string): Date {
  const startYear = Number(financialYear.split("-")[0]);
  return new Date(Date.UTC(startYear, 6, 1));
}

/** Financial-year week 1 is 1-7 July inclusive, so week `n`'s first day is `n - 1` full weeks
 * after 1 July. */
function monthLabelForFinancialYearWeek(financialYear: string, weekNumber: number): string {
  const date = financialYearStart(financialYear);
  date.setUTCDate(date.getUTCDate() + (weekNumber - 1) * 7);
  return date.toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: "UTC" });
}
