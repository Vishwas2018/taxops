"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { computeOverallProgress, type ChecklistCustomItem, type ChecklistItemStates } from "@/lib/checklists/derived";
import type { ChecklistGroup, ChecklistGroupId } from "@/lib/checklists/templates";
import { ChecklistGroupSection } from "./checklist-group-section";

/**
 * Top-level checklist state: item checked states, custom items, and which groups are
 * currently visible. `visibleGroupIds` starts at the profile-derived default set and is
 * client-only session state - adding a group via "Show more groups" doesn't persist across a
 * reload, matching the brief's "affordance", not a saved preference.
 */
export function ChecklistsClient({
  allGroups,
  defaultGroupIds,
  initialItemStates,
  initialCustomItems,
}: {
  allGroups: ChecklistGroup[];
  defaultGroupIds: ChecklistGroupId[];
  initialItemStates: ChecklistItemStates;
  initialCustomItems: ChecklistCustomItem[];
}) {
  const [itemStates, setItemStates] = useState<ChecklistItemStates>(initialItemStates);
  const [customItems, setCustomItems] = useState<ChecklistCustomItem[]>(initialCustomItems);
  const [visibleGroupIds, setVisibleGroupIds] = useState<ChecklistGroupId[]>(defaultGroupIds);

  const visibleGroups = allGroups.filter((group) => visibleGroupIds.includes(group.id));
  const hiddenGroups = allGroups.filter((group) => !visibleGroupIds.includes(group.id));
  const overallProgress = useMemo(
    () => computeOverallProgress(visibleGroups, itemStates, customItems),
    [visibleGroups, itemStates, customItems],
  );

  function handleToggleItem(itemId: string, checked: boolean) {
    setItemStates((prev) => ({ ...prev, [itemId]: checked }));
  }

  function handleCustomItemAdded(item: ChecklistCustomItem) {
    setCustomItems((prev) => [...prev, item]);
  }

  function handleCustomItemToggled(id: string, checked: boolean) {
    setCustomItems((prev) => prev.map((item) => (item.id === id ? { ...item, checked } : item)));
  }

  function handleCustomItemLabelChanged(id: string, label: string) {
    setCustomItems((prev) => prev.map((item) => (item.id === id ? { ...item, label } : item)));
  }

  function handleCustomItemDeleted(id: string) {
    setCustomItems((prev) => prev.filter((item) => item.id !== id));
  }

  function showGroup(groupId: ChecklistGroupId) {
    setVisibleGroupIds((prev) => (prev.includes(groupId) ? prev : [...prev, groupId]));
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p aria-live="polite" className="text-sm font-medium text-textSecondary">
          {overallProgress.checked} of {overallProgress.total} items checked (
          <span className="tabular-nums">{overallProgress.percent}</span>% complete)
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutralSubtle">
          <div
            className="h-full rounded-full bg-accent transition-all duration-200 ease-in-out"
            style={{ width: `${overallProgress.percent}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {visibleGroups.map((group) => (
          <ChecklistGroupSection
            key={group.id}
            group={group}
            itemStates={itemStates}
            customItems={customItems}
            onToggleItem={handleToggleItem}
            onCustomItemAdded={handleCustomItemAdded}
            onCustomItemToggled={handleCustomItemToggled}
            onCustomItemLabelChanged={handleCustomItemLabelChanged}
            onCustomItemDeleted={handleCustomItemDeleted}
          />
        ))}
      </div>

      {hiddenGroups.length > 0 && (
        <div className="space-y-2 rounded-lg border border-dashed border-border p-4">
          <p className="text-sm font-medium text-textSecondary">
            Not seeing what you need? Add another checklist group.
          </p>
          <div className="flex flex-wrap gap-2">
            {hiddenGroups.map((group) => (
              <Button key={group.id} type="button" variant="outline" size="sm" onClick={() => showGroup(group.id)}>
                Add “{group.title}”
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
