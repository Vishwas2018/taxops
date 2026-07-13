import { describe, expect, it } from "vitest";
import type { TaxProfileInput } from "@/lib/validation/tax-profile";
import { getDefaultChecklistGroupIds } from "./select";
import { CHECKLIST_GROUP_IDS } from "./templates";

describe("getDefaultChecklistGroupIds", () => {
  it("shows every group when there is no profile row", () => {
    expect(getDefaultChecklistGroupIds(null)).toEqual([...CHECKLIST_GROUP_IDS]);
    expect(getDefaultChecklistGroupIds(undefined)).toEqual([...CHECKLIST_GROUP_IDS]);
  });

  it("shows every group for a profile with no signal on the fields this function reads", () => {
    const profile: TaxProfileInput = { householdIncomeBand: "under_100k" };
    expect(getDefaultChecklistGroupIds(profile)).toEqual([...CHECKLIST_GROUP_IDS]);
  });

  it("shows every group for a completely empty profile object", () => {
    expect(getDefaultChecklistGroupIds({})).toEqual([...CHECKLIST_GROUP_IDS]);
  });

  it("adds contractor-income-expense for a contractor-like arrangement, plus the always-default groups", () => {
    const profile: TaxProfileInput = { workArrangement: "abn_sole_trader" };
    expect(getDefaultChecklistGroupIds(profile)).toEqual([
      "contractor-income-expense",
      "receipts-evidence",
      "agent-questions",
    ]);
  });

  it("does not add contractor-income-expense for a payg_employee arrangement, but the answer still counts as a real signal (not a fallback to show-all)", () => {
    const profile: TaxProfileInput = { workArrangement: "payg_employee" };
    expect(getDefaultChecklistGroupIds(profile)).toEqual(["receipts-evidence", "agent-questions"]);
  });

  it("adds property-documents for a non-zero property band, not for zero", () => {
    expect(getDefaultChecklistGroupIds({ investmentPropertyBand: "one" })).toEqual([
      "property-documents",
      "receipts-evidence",
      "agent-questions",
    ]);
  });

  it("an explicit zero property band is a real answer, not a fallback to show-all", () => {
    expect(getDefaultChecklistGroupIds({ investmentPropertyBand: "zero" })).toEqual([
      "receipts-evidence",
      "agent-questions",
    ]);
  });

  it("adds super-contributions whenever superEngagement is answered", () => {
    expect(getDefaultChecklistGroupIds({ superEngagement: "not_sure" })).toEqual([
      "super-contributions",
      "receipts-evidence",
      "agent-questions",
    ]);
  });

  it("combines signals for a contractor with 4+ properties who has answered super engagement", () => {
    const profile: TaxProfileInput = {
      workArrangement: "mix",
      investmentPropertyBand: "four_plus",
      superEngagement: "making_concessional_contributions",
    };
    expect(getDefaultChecklistGroupIds(profile)).toEqual([...CHECKLIST_GROUP_IDS]);
  });

  it("preserves the CHECKLIST_GROUP_IDS order regardless of which fields matched", () => {
    const profile: TaxProfileInput = { investmentPropertyBand: "one", workArrangement: "mix" };
    const result = getDefaultChecklistGroupIds(profile);
    const expectedOrder = CHECKLIST_GROUP_IDS.filter((id) => result.includes(id));
    expect(result).toEqual(expectedOrder);
  });
});
