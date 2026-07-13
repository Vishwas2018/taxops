import { describe, expect, it } from "vitest";
import { TAX_PROFILE_QUESTION_GROUPS, taxProfileSchema } from "./tax-profile";

describe("taxProfileSchema", () => {
  it("accepts an empty object - every field is skippable", () => {
    const result = taxProfileSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts a fully answered profile", () => {
    const result = taxProfileSchema.safeParse({
      workArrangement: "abn_sole_trader",
      hasAbn: true,
      investmentPropertyBand: "two_to_three",
      superEngagement: "making_concessional_contributions",
      householdIncomeBand: "190k_to_250k",
      otherIncomeSources: ["dividends", "capital_gains"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts null for any single-value field (answered-as-skipped, distinct from absent)", () => {
    const result = taxProfileSchema.safeParse({
      workArrangement: null,
      hasAbn: null,
      investmentPropertyBand: null,
      superEngagement: null,
      householdIncomeBand: null,
    });
    expect(result.success).toBe(true);
  });

  it.each([
    ["workArrangement", "freelancer"],
    ["investmentPropertyBand", "five"],
    ["superEngagement", "aggressive"],
    ["householdIncomeBand", "1m_plus"],
  ])("rejects an invalid %s value", (field, badValue) => {
    const result = taxProfileSchema.safeParse({ [field]: badValue });
    expect(result.success).toBe(false);
  });

  it("rejects a non-boolean hasAbn", () => {
    const result = taxProfileSchema.safeParse({ hasAbn: "yes" });
    expect(result.success).toBe(false);
  });

  it("rejects an otherIncomeSources entry outside the fixed vocabulary", () => {
    const result = taxProfileSchema.safeParse({ otherIncomeSources: ["salary"] });
    expect(result.success).toBe(false);
  });

  it("accepts an empty otherIncomeSources array", () => {
    const result = taxProfileSchema.safeParse({ otherIncomeSources: [] });
    expect(result.success).toBe(true);
  });

  it("accepts a single-field partial payload (section-edit shape)", () => {
    const result = taxProfileSchema.safeParse({ householdIncomeBand: "under_100k" });
    expect(result.success).toBe(true);
  });
});

describe("TAX_PROFILE_QUESTION_GROUPS", () => {
  it("has one group per taxProfileSchema key, each with at least two options", () => {
    const schemaKeys = Object.keys(taxProfileSchema.shape);
    const groupKeys = TAX_PROFILE_QUESTION_GROUPS.map((g) => g.key);

    expect(groupKeys.sort()).toEqual(schemaKeys.sort());
    for (const group of TAX_PROFILE_QUESTION_GROUPS) {
      expect(group.options.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("every option value for an enum-backed group is accepted by the schema", () => {
    for (const group of TAX_PROFILE_QUESTION_GROUPS) {
      if (group.type === "boolean") continue;
      for (const option of group.options) {
        const value = group.type === "multi" ? [option.value] : option.value;
        const result = taxProfileSchema.safeParse({ [group.key]: value });
        expect(result.success, `${group.key}=${option.value} should be valid`).toBe(true);
      }
    }
  });
});
