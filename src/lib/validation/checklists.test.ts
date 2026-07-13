import { describe, expect, it } from "vitest";
import {
  addCustomItemSchema,
  CUSTOM_ITEM_LABEL_MAX_LENGTH,
  customItemLabelSchema,
  toggleTemplateItemSchema,
} from "./checklists";

describe("customItemLabelSchema", () => {
  it("accepts a normal short label", () => {
    expect(customItemLabelSchema.safeParse("2019 depreciation schedule").success).toBe(true);
  });

  it("accepts exactly the max length", () => {
    const label = "a".repeat(CUSTOM_ITEM_LABEL_MAX_LENGTH);
    expect(customItemLabelSchema.safeParse(label).success).toBe(true);
  });

  it("rejects one character over the max length", () => {
    const label = "a".repeat(CUSTOM_ITEM_LABEL_MAX_LENGTH + 1);
    const result = customItemLabelSchema.safeParse(label);
    expect(result.success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(customItemLabelSchema.safeParse("").success).toBe(false);
  });

  it("rejects a whitespace-only string, even if long enough to look non-empty", () => {
    expect(customItemLabelSchema.safeParse("     ").success).toBe(false);
  });

  it("trims surrounding whitespace before validating length", () => {
    const padded = `  ${"a".repeat(CUSTOM_ITEM_LABEL_MAX_LENGTH)}  `;
    const result = customItemLabelSchema.safeParse(padded);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("a".repeat(CUSTOM_ITEM_LABEL_MAX_LENGTH));
  });

  it("the failure message never echoes the label's own content back", () => {
    const secretLookingLabel = "MY-BANK-ACCOUNT-1234567890".repeat(10);
    const result = customItemLabelSchema.safeParse(secretLookingLabel);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).not.toContain("MY-BANK-ACCOUNT-1234567890");
    }
  });
});

describe("addCustomItemSchema", () => {
  it("accepts a real group id with a valid label", () => {
    const result = addCustomItemSchema.safeParse({
      groupId: "property-documents",
      label: "2019 depreciation schedule",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a group id that isn't one of the five template groups", () => {
    const result = addCustomItemSchema.safeParse({
      groupId: "not-a-real-group",
      label: "Some document",
    });
    expect(result.success).toBe(false);
  });
});

describe("toggleTemplateItemSchema", () => {
  it("accepts a shape-valid toggle", () => {
    expect(
      toggleTemplateItemSchema.safeParse({ itemId: "property-documents.loan-statements", checked: true })
        .success,
    ).toBe(true);
  });

  it("rejects a missing checked field", () => {
    expect(toggleTemplateItemSchema.safeParse({ itemId: "x" }).success).toBe(false);
  });

  it("rejects an empty itemId", () => {
    expect(toggleTemplateItemSchema.safeParse({ itemId: "", checked: true }).success).toBe(false);
  });
});
