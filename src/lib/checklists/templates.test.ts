import { describe, expect, it } from "vitest";
import {
  CHECKLIST_GROUPS,
  CHECKLIST_GROUP_IDS,
  CHECKLIST_TEMPLATE_FINANCIAL_YEAR,
  findTemplateItem,
  getChecklistGroup,
  isChecklistGroupId,
  templateItemId,
} from "./templates";

describe("CHECKLIST_GROUPS shape", () => {
  it("has exactly the five constitution-named groups, in order", () => {
    expect(CHECKLIST_GROUPS.map((g) => g.id)).toEqual([
      "contractor-income-expense",
      "property-documents",
      "super-contributions",
      "receipts-evidence",
      "agent-questions",
    ]);
    expect(CHECKLIST_GROUP_IDS).toEqual(CHECKLIST_GROUPS.map((g) => g.id));
  });

  it("every group has at least one item", () => {
    for (const group of CHECKLIST_GROUPS) {
      expect(group.items.length).toBeGreaterThan(0);
    }
  });

  it("every item id is unique within its group", () => {
    for (const group of CHECKLIST_GROUPS) {
      const ids = group.items.map((item) => item.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("every namespaced (group.item) id is globally unique across all groups", () => {
    const fullIds = CHECKLIST_GROUPS.flatMap((group) =>
      group.items.map((item) => templateItemId(group.id, item.id)),
    );
    expect(new Set(fullIds).size).toBe(fullIds.length);
  });

  it("stamps a single financial year matching the content module's format", () => {
    expect(CHECKLIST_TEMPLATE_FINANCIAL_YEAR).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe("checklist copy audit: records to gather / questions to ask, never instructions", () => {
  // Simple substring lint, per the brief - "claim" (in any casing) never appears in group
  // titles, descriptions, item labels, or item help text. Real ATO document names that would
  // otherwise contain the word (e.g. the "notice of intent to claim" super form) are
  // deliberately reworded rather than carved out as an exception - keeps this check a plain
  // substring match with no judgment calls baked into the test itself.
  const bannedSubstrings = ["claim", "you should", "we recommend"];

  function collectAllCopy(): { where: string; text: string }[] {
    const copy: { where: string; text: string }[] = [];
    for (const group of CHECKLIST_GROUPS) {
      copy.push({ where: `${group.id} title`, text: group.title });
      copy.push({ where: `${group.id} description`, text: group.description });
      for (const item of group.items) {
        copy.push({ where: `${group.id}.${item.id} label`, text: item.label });
        if (item.helpText) copy.push({ where: `${group.id}.${item.id} helpText`, text: item.helpText });
      }
    }
    return copy;
  }

  it.each(bannedSubstrings)('contains no "%s" anywhere in template copy', (banned) => {
    const offenders = collectAllCopy().filter(({ text }) =>
      text.toLowerCase().includes(banned.toLowerCase()),
    );
    expect(offenders).toEqual([]);
  });

  it("phrases every agent-questions item as an actual question", () => {
    const group = getChecklistGroup("agent-questions");
    for (const item of group.items) {
      expect(item.label.trim().endsWith("?")).toBe(true);
    }
  });
});

describe("templateItemId / findTemplateItem / isChecklistGroupId", () => {
  it("namespaces an item id as `${groupId}.${itemSlug}`", () => {
    expect(templateItemId("property-documents", "loan-statements")).toBe(
      "property-documents.loan-statements",
    );
  });

  it("finds a real template item by its full id", () => {
    const found = findTemplateItem("property-documents.loan-statements");
    expect(found?.groupId).toBe("property-documents");
    expect(found?.id).toBe("loan-statements");
  });

  it("returns undefined for an id that doesn't exist", () => {
    expect(findTemplateItem("not-a-real-group.not-a-real-item")).toBeUndefined();
    expect(findTemplateItem("property-documents.not-a-real-item")).toBeUndefined();
  });

  it("isChecklistGroupId narrows only real group ids", () => {
    expect(isChecklistGroupId("property-documents")).toBe(true);
    expect(isChecklistGroupId("not-a-real-group")).toBe(false);
  });

  it("getChecklistGroup throws for an unknown group id", () => {
    // @ts-expect-error - deliberately invalid for this test
    expect(() => getChecklistGroup("not-a-real-group")).toThrow();
  });
});
