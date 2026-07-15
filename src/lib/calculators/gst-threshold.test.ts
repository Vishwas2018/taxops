import { describe, expect, it } from "vitest";
import { fy2025_26 } from "@/lib/tax-config/fy2025-26";
import { fy2026_27 } from "@/lib/tax-config/fy2026-27";
import { projectGstThreshold } from "./gst-threshold";

const config = fy2025_26;

describe("projectGstThreshold", () => {
  it("throws on a negative day rate", () => {
    expect(() =>
      projectGstThreshold({ dayRate: -1, daysPerWeek: 4, weeksWorkedPerYear: 46 }, config),
    ).toThrow();
  });

  it("throws on negative days per week", () => {
    expect(() =>
      projectGstThreshold({ dayRate: 800, daysPerWeek: -1, weeksWorkedPerYear: 46 }, config),
    ).toThrow();
  });

  it("throws on negative weeks worked per year", () => {
    expect(() =>
      projectGstThreshold({ dayRate: 800, daysPerWeek: 4, weeksWorkedPerYear: -1 }, config),
    ).toThrow();
  });

  it("throws on negative weeksAlreadyWorkedThisFY", () => {
    expect(() =>
      projectGstThreshold(
        { dayRate: 800, daysPerWeek: 4, weeksWorkedPerYear: 46, weeksAlreadyWorkedThisFY: -1 },
        config,
      ),
    ).toThrow();
  });

  it("returns all zeros/nulls for a zero day rate - never crosses", () => {
    const result = projectGstThreshold(
      { dayRate: 0, daysPerWeek: 4, weeksWorkedPerYear: 46 },
      config,
    );
    expect(result.projectedAnnualTurnover).toBe(0);
    expect(result.crossesThreshold).toBe(false);
    expect(result.weekThresholdCrossed).toBeNull();
    expect(result.monthThresholdCrossed).toBeNull();
    expect(result.marginBelowThreshold).toBe(75_000);
  });

  it("golden file: exactly $75,000 boundary, crosses in the final worked week", () => {
    // dayRate 500 * 3 days/week * 50 weeks = $75,000 exactly. Weekly income $1,500;
    // crossingWeek = ceil(75,000 / 1,500) = 50, which is <= weeksWorkedPerYear (50), so it
    // crosses in the very last worked week. Week 50 of FY2025-26 (1-indexed from 1 July 2025,
    // i.e. 49 full weeks after 1 July) independently computed as 9 June 2026 -> "June 2026".
    const result = projectGstThreshold(
      { dayRate: 500, daysPerWeek: 3, weeksWorkedPerYear: 50 },
      config,
    );
    expect(result.projectedAnnualTurnover).toBe(75_000);
    expect(result.crossesThreshold).toBe(true);
    expect(result.weekThresholdCrossed).toBe(50);
    expect(result.monthThresholdCrossed).toBe("June 2026");
    expect(result.marginBelowThreshold).toBeNull();
    expect(result.financialYear).toBe("2025-26");
    expect(result.isEstimate).toBe(true);
  });

  it("golden file: crossing mid-year, offset by weeks already worked this FY", () => {
    // dayRate 800 * 4 days/week = $3,200/week; crossingWeekWithinSchedule =
    // ceil(75,000 / 3,200) = ceil(23.4375) = 24. With a 10-week head start
    // (weeksAlreadyWorkedThisFY: 10), the absolute FY week is 24 + 10 = 34. Week 34 of
    // FY2025-26 (33 full weeks after 1 July 2025) independently computed as 17 February 2026
    // -> "February 2026".
    const result = projectGstThreshold(
      { dayRate: 800, daysPerWeek: 4, weeksWorkedPerYear: 46, weeksAlreadyWorkedThisFY: 10 },
      config,
    );
    expect(result.projectedAnnualTurnover).toBe(147_200);
    expect(result.crossesThreshold).toBe(true);
    expect(result.weekThresholdCrossed).toBe(34);
    expect(result.monthThresholdCrossed).toBe("February 2026");
    expect(result.marginBelowThreshold).toBeNull();
  });

  it("golden file: well below the threshold - never crosses", () => {
    // dayRate 400 * 3 days/week * 46 weeks = $55,200 - well short of $75,000.
    const result = projectGstThreshold(
      { dayRate: 400, daysPerWeek: 3, weeksWorkedPerYear: 46 },
      config,
    );
    expect(result.projectedAnnualTurnover).toBe(55_200);
    expect(result.crossesThreshold).toBe(false);
    expect(result.weekThresholdCrossed).toBeNull();
    expect(result.monthThresholdCrossed).toBeNull();
    expect(result.marginBelowThreshold).toBe(19_800);
  });

  describe("straddling the $75,000 threshold within a single worked week", () => {
    it("one cent below the threshold across the full projection never crosses", () => {
      const result = projectGstThreshold(
        { dayRate: 74_999.99, daysPerWeek: 1, weeksWorkedPerYear: 1 },
        config,
      );
      expect(result.projectedAnnualTurnover).toBe(74_999.99);
      expect(result.crossesThreshold).toBe(false);
      expect(result.marginBelowThreshold).toBeCloseTo(0.01, 2);
    });

    it("exactly at the threshold in the first worked week crosses immediately", () => {
      const result = projectGstThreshold(
        { dayRate: 75_000, daysPerWeek: 1, weeksWorkedPerYear: 1 },
        config,
      );
      expect(result.crossesThreshold).toBe(true);
      expect(result.weekThresholdCrossed).toBe(1);
      expect(result.monthThresholdCrossed).toBe("July 2025");
      expect(result.marginBelowThreshold).toBeNull();
    });

    it("one cent above the threshold in the first worked week crosses immediately", () => {
      const result = projectGstThreshold(
        { dayRate: 75_000.01, daysPerWeek: 1, weeksWorkedPerYear: 1 },
        config,
      );
      expect(result.crossesThreshold).toBe(true);
      expect(result.weekThresholdCrossed).toBe(1);
    });
  });
});

describe("projectGstThreshold against fy2026-27", () => {
  // gst-threshold is a forward-looking calculator defaulting to FY2026-27 (see
  // docs/updating-tax-data.md). The $75,000 registration threshold itself is unchanged from
  // FY2025-26, so the dollar figures below are identical to the FY2025-26 golden files above -
  // what actually changes is the calendar month a crossing week maps to, since FY2026-27
  // starts on 1 July 2026, a full year later than FY2025-26's 1 July 2025. Every date below
  // was independently recomputed (not shifted by "add a year" reasoning) via the same
  // date-arithmetic method Day 14 used, per docs/updating-tax-data.md's golden-file
  // discipline: `node -e` verified 1 July 2026 + 49*7 days = 9 June 2027, and 1 July 2026 +
  // 33*7 days = 17 February 2027.
  it("golden file: exactly $75,000 boundary, crosses in the final worked week", () => {
    const result = projectGstThreshold(
      { dayRate: 500, daysPerWeek: 3, weeksWorkedPerYear: 50 },
      fy2026_27,
    );
    expect(result.projectedAnnualTurnover).toBe(75_000);
    expect(result.crossesThreshold).toBe(true);
    expect(result.weekThresholdCrossed).toBe(50);
    expect(result.monthThresholdCrossed).toBe("June 2027");
    expect(result.marginBelowThreshold).toBeNull();
    expect(result.financialYear).toBe("2026-27");
    expect(result.isEstimate).toBe(true);
  });

  it("golden file: crossing mid-year, offset by weeks already worked this FY", () => {
    const result = projectGstThreshold(
      { dayRate: 800, daysPerWeek: 4, weeksWorkedPerYear: 46, weeksAlreadyWorkedThisFY: 10 },
      fy2026_27,
    );
    expect(result.projectedAnnualTurnover).toBe(147_200);
    expect(result.crossesThreshold).toBe(true);
    expect(result.weekThresholdCrossed).toBe(34);
    expect(result.monthThresholdCrossed).toBe("February 2027");
    expect(result.marginBelowThreshold).toBeNull();
  });

  it("golden file: well below the threshold - never crosses", () => {
    const result = projectGstThreshold(
      { dayRate: 400, daysPerWeek: 3, weeksWorkedPerYear: 46 },
      fy2026_27,
    );
    expect(result.projectedAnnualTurnover).toBe(55_200);
    expect(result.crossesThreshold).toBe(false);
    expect(result.weekThresholdCrossed).toBeNull();
    expect(result.monthThresholdCrossed).toBeNull();
    expect(result.marginBelowThreshold).toBe(19_800);
  });

  it("boundary: exactly at the threshold in the first worked week crosses immediately, in FY2026-27's own first month", () => {
    const result = projectGstThreshold(
      { dayRate: 75_000, daysPerWeek: 1, weeksWorkedPerYear: 1 },
      fy2026_27,
    );
    expect(result.crossesThreshold).toBe(true);
    expect(result.weekThresholdCrossed).toBe(1);
    expect(result.monthThresholdCrossed).toBe("July 2026");
    expect(result.marginBelowThreshold).toBeNull();
  });
});
