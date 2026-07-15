import type { KeyDate, KeyDateAudience } from "@/lib/tax-config/types";

/** Same "contractor / property investor" vocabulary as the rest of the app - see
 * `isContractorLikeArrangement` in `lib/tax-profile/derived.ts`. */
export const AUDIENCE_LABELS: Record<KeyDateAudience, string> = {
  everyone: "Everyone",
  contractor: "Contractor",
  "property-investor": "Property investor",
  "everyone-with-employer": "Everyone with an employer",
};

function parseKeyDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * The earliest entry on or after `now` (UTC calendar day, not time-of-day sensitive) - `null`
 * when every known entry has already passed, which is the expected outcome once the current
 * date rolls past the last date this financial year's data covers, until a `key-dates-2026-27`
 * file is added (see `docs/updating-tax-data.md`). Callers must handle `null`, not assume a
 * "next" date always exists.
 */
export function findNextUpcomingKeyDate(dates: KeyDate[], now: Date = new Date()): KeyDate | null {
  const today = startOfUtcDay(now).getTime();
  const upcoming = dates
    .filter((entry) => parseKeyDate(entry.date).getTime() >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0] ?? null;
}

export interface KeyDateQuarterGroup {
  label: string;
  dates: KeyDate[];
}

/**
 * Groups dates by the calendar quarter each falls in (Jul-Sep, Oct-Dec, Jan-Mar, Apr-Jun),
 * chronologically. Deliberately grouped by the calendar quarter the date itself falls in, not
 * the reporting quarter an obligation relates to - a BAS/super/PAYGI due date trails its
 * reporting period by about a month (e.g. the Jan-Mar activity is due in April), so grouping
 * by the due date's own quarter is what a reader scanning a calendar chronologically expects,
 * not a grouping that requires already knowing which reporting period each due date is for.
 */
export function groupKeyDatesByQuarter(dates: KeyDate[]): KeyDateQuarterGroup[] {
  const sorted = [...dates].sort((a, b) => a.date.localeCompare(b.date));
  const groups = new Map<string, KeyDate[]>();

  for (const entry of sorted) {
    const label = quarterLabelForDate(entry.date);
    const existing = groups.get(label);
    if (existing) {
      existing.push(entry);
    } else {
      groups.set(label, [entry]);
    }
  }

  return Array.from(groups.entries()).map(([label, dates]) => ({ label, dates }));
}

function quarterLabelForDate(date: string): string {
  const parsed = parseKeyDate(date);
  const month = parsed.getUTCMonth();
  const year = parsed.getUTCFullYear();

  if (month >= 6 && month <= 8) return `Jul–Sep ${year}`;
  if (month >= 9 && month <= 11) return `Oct–Dec ${year}`;
  if (month <= 2) return `Jan–Mar ${year}`;
  return `Apr–Jun ${year}`;
}
