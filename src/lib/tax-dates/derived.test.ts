import { describe, expect, it } from "vitest";
import type { KeyDate } from "@/lib/tax-config/types";
import { KEY_DATES_2025_26 } from "@/lib/tax-config/key-dates";
import { AUDIENCE_LABELS, findNextUpcomingKeyDate, groupKeyDatesByQuarter } from "./derived";

function makeDate(id: string, date: string): KeyDate {
  return {
    id,
    date,
    title: id,
    description: id,
    audience: ["everyone"],
    source: "https://www.ato.gov.au/",
    verified: true,
  };
}

const SAMPLE: KeyDate[] = [
  makeDate("a", "2025-07-01"),
  makeDate("b", "2025-10-28"),
  makeDate("c", "2026-02-28"),
  makeDate("d", "2026-07-28"),
];

describe("findNextUpcomingKeyDate", () => {
  it("returns the earliest entry on or after now", () => {
    const result = findNextUpcomingKeyDate(SAMPLE, new Date("2025-08-01T00:00:00Z"));
    expect(result?.id).toBe("b");
  });

  it("treats now falling exactly on a date as upcoming, not past", () => {
    const result = findNextUpcomingKeyDate(SAMPLE, new Date("2025-10-28T00:00:00Z"));
    expect(result?.id).toBe("b");
  });

  it("returns the very next entry when now sits between two dates", () => {
    const result = findNextUpcomingKeyDate(SAMPLE, new Date("2025-11-01T00:00:00Z"));
    expect(result?.id).toBe("c");
  });

  it("FY rollover edge: returns the last entry when now sits exactly on it", () => {
    const result = findNextUpcomingKeyDate(SAMPLE, new Date("2026-07-28T00:00:00Z"));
    expect(result?.id).toBe("d");
  });

  it("FY rollover edge: returns null once now is past every known entry - no next FY data yet", () => {
    const result = findNextUpcomingKeyDate(SAMPLE, new Date("2026-08-01T00:00:00Z"));
    expect(result).toBeNull();
  });

  it("real dataset: has an upcoming entry for a date inside FY2025-26", () => {
    const result = findNextUpcomingKeyDate(KEY_DATES_2025_26, new Date("2025-09-01T00:00:00Z"));
    expect(result?.id).toBe("bas-q1");
  });
});

describe("groupKeyDatesByQuarter", () => {
  it("groups dates into their own calendar quarter, chronologically", () => {
    const groups = groupKeyDatesByQuarter(SAMPLE);
    expect(groups.map((g) => g.label)).toEqual([
      "Jul–Sep 2025",
      "Oct–Dec 2025",
      "Jan–Mar 2026",
      "Jul–Sep 2026",
    ]);
    expect(groups[0].dates.map((d) => d.id)).toEqual(["a"]);
    expect(groups[3].dates.map((d) => d.id)).toEqual(["d"]);
  });

  it("groups multiple same-quarter dates together, in date order", () => {
    const sameQuarter: KeyDate[] = [
      makeDate("later", "2025-09-15"),
      makeDate("earlier", "2025-07-10"),
    ];
    const groups = groupKeyDatesByQuarter(sameQuarter);
    expect(groups).toHaveLength(1);
    expect(groups[0].dates.map((d) => d.id)).toEqual(["earlier", "later"]);
  });
});

describe("AUDIENCE_LABELS", () => {
  it("has a label for every audience the schema allows", () => {
    expect(AUDIENCE_LABELS.everyone).toBe("Everyone");
    expect(AUDIENCE_LABELS.contractor).toBe("Contractor");
    expect(AUDIENCE_LABELS["property-investor"]).toBe("Property investor");
  });
});
