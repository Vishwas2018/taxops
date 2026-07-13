import { describe, expect, it } from "vitest";
import { computeGroupProgress, computeOverallProgress, type ChecklistCustomItem } from "./derived";
import { CHECKLIST_GROUPS, getChecklistGroup, templateItemId } from "./templates";

const propertyGroup = getChecklistGroup("property-documents");
const contractorGroup = getChecklistGroup("contractor-income-expense");

describe("computeGroupProgress", () => {
  it("is 0/N with no item states and no custom items", () => {
    const progress = computeGroupProgress(propertyGroup, {}, []);
    expect(progress).toEqual({ checked: 0, total: propertyGroup.items.length, percent: 0 });
  });

  it("counts only this group's checked template items, ignoring other groups' item ids", () => {
    const itemStates = {
      [templateItemId("property-documents", propertyGroup.items[0].id)]: true,
      [templateItemId("contractor-income-expense", contractorGroup.items[0].id)]: true,
    };
    const progress = computeGroupProgress(propertyGroup, itemStates, []);
    expect(progress.checked).toBe(1);
  });

  it("a false entry in itemStates counts as unchecked", () => {
    const itemStates = { [templateItemId("property-documents", propertyGroup.items[0].id)]: false };
    expect(computeGroupProgress(propertyGroup, itemStates, []).checked).toBe(0);
  });

  it("includes custom items filed under this group in both checked and total", () => {
    const customItems: ChecklistCustomItem[] = [
      { id: "c1", groupId: "property-documents", label: "Extra doc", checked: true, position: 0 },
      { id: "c2", groupId: "property-documents", label: "Another doc", checked: false, position: 1 },
      { id: "c3", groupId: "contractor-income-expense", label: "Wrong group", checked: true, position: 0 },
    ];
    const progress = computeGroupProgress(propertyGroup, {}, customItems);
    expect(progress.total).toBe(propertyGroup.items.length + 2);
    expect(progress.checked).toBe(1);
  });

  it("is 100% when every template item and every custom item in the group is checked", () => {
    const itemStates = Object.fromEntries(
      propertyGroup.items.map((item) => [templateItemId("property-documents", item.id), true]),
    );
    const customItems: ChecklistCustomItem[] = [
      { id: "c1", groupId: "property-documents", label: "Extra doc", checked: true, position: 0 },
    ];
    const progress = computeGroupProgress(propertyGroup, itemStates, customItems);
    expect(progress.percent).toBe(100);
  });
});

describe("computeOverallProgress", () => {
  it("is 0/0 for an empty group list", () => {
    expect(computeOverallProgress([], {}, [])).toEqual({ checked: 0, total: 0, percent: 0 });
  });

  it("sums checked/total across every given group", () => {
    const itemStates = {
      [templateItemId("property-documents", propertyGroup.items[0].id)]: true,
      [templateItemId("contractor-income-expense", contractorGroup.items[0].id)]: true,
    };
    const progress = computeOverallProgress([propertyGroup, contractorGroup], itemStates, []);
    expect(progress.checked).toBe(2);
    expect(progress.total).toBe(propertyGroup.items.length + contractorGroup.items.length);
  });

  it("only counts groups actually passed in - a hidden group's checked items don't count", () => {
    const itemStates = {
      [templateItemId("contractor-income-expense", contractorGroup.items[0].id)]: true,
    };
    const progress = computeOverallProgress([propertyGroup], itemStates, []);
    expect(progress.checked).toBe(0);
    expect(progress.total).toBe(propertyGroup.items.length);
  });

  it("matches the sum of every group's individual progress for the full template", () => {
    const overall = computeOverallProgress(CHECKLIST_GROUPS, {}, []);
    const summedTotal = CHECKLIST_GROUPS.reduce((sum, g) => sum + g.items.length, 0);
    expect(overall.total).toBe(summedTotal);
  });
});
