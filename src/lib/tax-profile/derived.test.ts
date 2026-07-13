import { describe, expect, it } from "vitest";
import { fy2025_26 } from "@/lib/tax-config/fy2025-26";
import type { TaxProfileInput } from "@/lib/validation/tax-profile";
import {
  computeProfileCompleteness,
  getRelevantTipCategories,
  isContractorLikeArrangement,
  suggestMarginalRateForIncomeBand,
} from "./derived";

describe("computeProfileCompleteness", () => {
  it("is 0/6 for an empty profile", () => {
    expect(computeProfileCompleteness({})).toEqual({ answered: 0, total: 6, percent: 0 });
  });

  it("is 6/6 (100%) for a fully answered profile", () => {
    const profile: TaxProfileInput = {
      workArrangement: "mix",
      hasAbn: true,
      investmentPropertyBand: "zero",
      superEngagement: "not_sure",
      householdIncomeBand: "under_100k",
      otherIncomeSources: ["none"],
    };
    expect(computeProfileCompleteness(profile)).toEqual({ answered: 6, total: 6, percent: 100 });
  });

  it("counts a false/zero-ish answer as answered, not skipped", () => {
    const profile: TaxProfileInput = { hasAbn: false, investmentPropertyBand: "zero" };
    expect(computeProfileCompleteness(profile).answered).toBe(2);
  });

  it("does not count an empty otherIncomeSources array as answered", () => {
    const profile: TaxProfileInput = { otherIncomeSources: [] };
    expect(computeProfileCompleteness(profile).answered).toBe(0);
  });

  it("does not count an explicit null as answered", () => {
    const profile: TaxProfileInput = { workArrangement: null };
    expect(computeProfileCompleteness(profile).answered).toBe(0);
  });
});

describe("isContractorLikeArrangement", () => {
  it.each(["payg_contractor", "abn_sole_trader", "company_or_trust", "mix"] as const)(
    "is true for %s",
    (arrangement) => {
      expect(isContractorLikeArrangement(arrangement)).toBe(true);
    },
  );

  it("is false for payg_employee", () => {
    expect(isContractorLikeArrangement("payg_employee")).toBe(false);
  });

  it("is false for null/undefined", () => {
    expect(isContractorLikeArrangement(null)).toBe(false);
    expect(isContractorLikeArrangement(undefined)).toBe(false);
  });
});

describe("getRelevantTipCategories", () => {
  it("returns nothing for an empty profile", () => {
    expect(getRelevantTipCategories({})).toEqual([]);
  });

  it("maps a contractor arrangement to contractor-expenses + superannuation", () => {
    expect(getRelevantTipCategories({ workArrangement: "abn_sole_trader" })).toEqual([
      "contractor-expenses",
      "superannuation",
    ]);
  });

  it("maps a PAYG-employee arrangement to superannuation only, not contractor-expenses", () => {
    expect(getRelevantTipCategories({ workArrangement: "payg_employee" })).toEqual([
      "superannuation",
    ]);
  });

  it("maps a non-zero property band to property-deductions", () => {
    expect(getRelevantTipCategories({ investmentPropertyBand: "one" })).toEqual([
      "property-deductions",
    ]);
  });

  it("does not map a zero property band to property-deductions", () => {
    expect(getRelevantTipCategories({ investmentPropertyBand: "zero" })).toEqual([]);
  });

  it("maps 2-3 or 4+ properties to wealth-preservation as well", () => {
    expect(getRelevantTipCategories({ investmentPropertyBand: "two_to_three" })).toEqual([
      "property-deductions",
      "wealth-preservation",
    ]);
    expect(getRelevantTipCategories({ investmentPropertyBand: "four_plus" })).toEqual([
      "property-deductions",
      "wealth-preservation",
    ]);
  });

  it("combines all four categories for a contractor with 4+ properties", () => {
    expect(
      getRelevantTipCategories({ workArrangement: "mix", investmentPropertyBand: "four_plus" }),
    ).toEqual(["contractor-expenses", "property-deductions", "superannuation", "wealth-preservation"]);
  });
});

describe("suggestMarginalRateForIncomeBand", () => {
  it("returns null when no band is given", () => {
    expect(suggestMarginalRateForIncomeBand(null, fy2025_26)).toBeNull();
    expect(suggestMarginalRateForIncomeBand(undefined, fy2025_26)).toBeNull();
  });

  it("returns a rate that exists in the real bracket table for every band", () => {
    const validRates = fy2025_26.incomeTaxBrackets.value.map((b) => b.rate);
    for (const band of ["under_100k", "100k_to_190k", "190k_to_250k", "250k_plus"] as const) {
      const rate = suggestMarginalRateForIncomeBand(band, fy2025_26);
      expect(validRates).toContain(rate);
    }
  });

  it("suggests a higher or equal rate for a higher income band", () => {
    const under100k = suggestMarginalRateForIncomeBand("under_100k", fy2025_26)!;
    const band2 = suggestMarginalRateForIncomeBand("100k_to_190k", fy2025_26)!;
    const band3 = suggestMarginalRateForIncomeBand("190k_to_250k", fy2025_26)!;
    const plus250k = suggestMarginalRateForIncomeBand("250k_plus", fy2025_26)!;

    expect(band2).toBeGreaterThanOrEqual(under100k);
    expect(band3).toBeGreaterThanOrEqual(band2);
    expect(plus250k).toBeGreaterThanOrEqual(band3);
  });

  it("suggests the top bracket rate for the 250k+ band", () => {
    const topRate = fy2025_26.incomeTaxBrackets.value.at(-1)!.rate;
    expect(suggestMarginalRateForIncomeBand("250k_plus", fy2025_26)).toBe(topRate);
  });
});
