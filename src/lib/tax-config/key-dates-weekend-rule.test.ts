import { describe, expect, it } from "vitest";
import type { KeyDate } from "./types";
import { KEY_DATES_2025_26 } from "./key-dates";
import { KEY_DATES_2026_27 } from "./key-dates-2026-27";

/**
 * Structural pin for the ATO's weekend/public-holiday due-date rule (Day 15.5): a due date
 * that falls on a Saturday or Sunday must actually be the next business day, not the naive
 * calendar date (e.g. "the 28th of the month"). This asserts the rule across every entry in
 * both datasets at once, rather than one hand-picked assertion per date - the FY2025-26 Q2
 * BAS/PAYGI dates and the FY2026-27 individual self-lodgment date were both wrong this way
 * before Day 15.5's sweep found them.
 *
 * One documented, verified exception: the ATO's own lodgment-program page publishes the
 * FY2025-26 tax-agent-extension deadline as 15 May 2027 - a Saturday - without a weekend
 * shift, because it's an administratively-set lodgment-program concession date, not a
 * statutory deadline the Acts Interpretation Act's weekend rule applies to. This is not a gap
 * in the sweep; it's logged here (and in `key-dates-2026-27.ts`'s own doc comment, and
 * PROGRESS.md's Day 15.5 entry) as a case where forcing the rule would produce a wrong date.
 */
// Ids are only unique *within* one FY's array (see each file's own "every id is unique" test),
// not across both files combined - `individual-lodgment-agent-extension` exists in both, and
// only the FY2026-27 one is the documented exception, so exceptions are scoped per-dataset,
// not by id alone.
const KEY_DATES_2026_27_EXCEPTIONS: Record<string, string> = {
  "individual-lodgment-agent-extension":
    "ATO's own lodgment-program schedule publishes 15 May 2027 (a Saturday) directly, unshifted - an administrative concession date, not a statutory due date subject to the weekend-shift rule.",
};

function weekdayOf(date: string): number {
  // 0 = Sunday, 6 = Saturday.
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function assertNoWeekendDates(dataset: KeyDate[], exceptions: Record<string, string> = {}) {
  const violations = dataset.filter((entry) => {
    if (exceptions[entry.id]) return false;
    const day = weekdayOf(entry.date);
    return day === 0 || day === 6;
  });
  expect(
    violations,
    `Dates falling on a weekend (not in the documented exception list): ${violations
      .map((entry) => `${entry.id} (${entry.date})`)
      .join(", ")}`,
  ).toEqual([]);
}

describe("ATO weekend/public-holiday due-date rule", () => {
  it("no FY2025-26 date falls on a Saturday or Sunday", () => {
    assertNoWeekendDates(KEY_DATES_2025_26);
  });

  it("no FY2026-27 date falls on a Saturday or Sunday, except the documented lodgment-program exception", () => {
    assertNoWeekendDates(KEY_DATES_2026_27, KEY_DATES_2026_27_EXCEPTIONS);
  });

  it("the documented exception is itself still actually a Saturday - fails loudly if the underlying date is ever edited without updating this allowlist", () => {
    const exceptionIds = Object.keys(KEY_DATES_2026_27_EXCEPTIONS);
    const entries = KEY_DATES_2026_27.filter((entry) => exceptionIds.includes(entry.id));
    expect(entries).toHaveLength(exceptionIds.length);
    for (const entry of entries) {
      const day = weekdayOf(entry.date);
      expect(
        day === 0 || day === 6,
        `${entry.id} (${entry.date}) is no longer a weekend date - remove it from the exception list`,
      ).toBe(true);
    }
  });
});
