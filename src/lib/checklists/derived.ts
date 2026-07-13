import { templateItemId, type ChecklistGroup, type ChecklistGroupId } from "./templates";

export interface ChecklistCustomItem {
  id: string;
  groupId: ChecklistGroupId;
  label: string;
  checked: boolean;
  position: number;
}

/** Checked-state lookup keyed by the full (namespaced) template item id. An item id absent
 * from this map is unchecked - matches the DB's "no row = untouched" convention. */
export type ChecklistItemStates = Record<string, boolean>;

export interface ChecklistProgress {
  checked: number;
  total: number;
  percent: number;
}

function toProgress(checked: number, total: number): ChecklistProgress {
  return { checked, total, percent: total === 0 ? 0 : Math.round((checked / total) * 100) };
}

/** Progress for a single group: template items (checked via `itemStates`) plus any custom
 * items filed under that group. Pure - takes every input explicitly, same discipline as
 * `src/lib/tax-profile/derived.ts`. */
export function computeGroupProgress(
  group: ChecklistGroup,
  itemStates: ChecklistItemStates,
  customItems: ChecklistCustomItem[],
): ChecklistProgress {
  const groupCustomItems = customItems.filter((item) => item.groupId === group.id);
  const total = group.items.length + groupCustomItems.length;
  const checkedTemplateItems = group.items.filter(
    (item) => itemStates[templateItemId(group.id, item.id)] === true,
  ).length;
  const checkedCustomItems = groupCustomItems.filter((item) => item.checked).length;
  return toProgress(checkedTemplateItems + checkedCustomItems, total);
}

/** Overall progress across a given set of groups (typically the currently-visible groups, not
 * necessarily every template group - a hidden group's items don't count toward "your"
 * progress until the user has added that group). */
export function computeOverallProgress(
  groups: ChecklistGroup[],
  itemStates: ChecklistItemStates,
  customItems: ChecklistCustomItem[],
): ChecklistProgress {
  return groups
    .map((group) => computeGroupProgress(group, itemStates, customItems))
    .reduce(
      (acc, group) => toProgress(acc.checked + group.checked, acc.total + group.total),
      toProgress(0, 0),
    );
}
