"use client";

import { toggleChecklistItemAction } from "@/app/(app)/checklists/actions";
import { useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { computeGroupProgress, type ChecklistCustomItem, type ChecklistItemStates } from "@/lib/checklists/derived";
import { templateItemId, type ChecklistGroup } from "@/lib/checklists/templates";
import { AddCustomItemForm } from "./add-custom-item-form";
import { CustomItemRow } from "./custom-item-row";

/**
 * One checklist group: heading, description, static "questions for a registered tax agent"
 * framing reinforced for that group specifically, template items (optimistic toggle), custom
 * items, and the add-custom-item form. Progress is derived from props on every render, not
 * stored separately, so it can never drift from the item states it's summarizing.
 */
export function ChecklistGroupSection({
  group,
  itemStates,
  customItems,
  onToggleItem,
  onCustomItemAdded,
  onCustomItemToggled,
  onCustomItemLabelChanged,
  onCustomItemDeleted,
}: {
  group: ChecklistGroup;
  itemStates: ChecklistItemStates;
  customItems: ChecklistCustomItem[];
  onToggleItem: (itemId: string, checked: boolean) => void;
  onCustomItemAdded: (item: ChecklistCustomItem) => void;
  onCustomItemToggled: (id: string, checked: boolean) => void;
  onCustomItemLabelChanged: (id: string, label: string) => void;
  onCustomItemDeleted: (id: string) => void;
}) {
  const [, startTransition] = useTransition();
  const progress = computeGroupProgress(group, itemStates, customItems);
  const groupCustomItems = customItems
    .filter((item) => item.groupId === group.id)
    .sort((a, b) => a.position - b.position);

  function toggle(itemSlug: string) {
    const fullId = templateItemId(group.id, itemSlug);
    const previousChecked = itemStates[fullId] === true;
    const nextChecked = !previousChecked;
    onToggleItem(fullId, nextChecked);
    startTransition(async () => {
      const result = await toggleChecklistItemAction({ itemId: fullId, checked: nextChecked });
      if (result.status === "error") {
        onToggleItem(fullId, previousChecked);
      }
    });
  }

  return (
    <section aria-labelledby={`checklist-group-${group.id}`} className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id={`checklist-group-${group.id}`} className="text-base font-semibold">
            {group.title}
          </h2>
          <p className="text-sm text-textMuted">{group.description}</p>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-neutralSubtle px-2.5 py-1 text-xs font-medium text-textSecondary">
          {progress.checked}/{progress.total}
        </span>
      </div>

      <ul className="divide-y divide-border">
        {group.items.map((item) => {
          const fullId = templateItemId(group.id, item.id);
          const checked = itemStates[fullId] === true;
          return (
            <li key={item.id} className="py-1.5">
              <label className="flex items-start gap-2 text-sm font-normal">
                <Checkbox
                  className="mt-0.5"
                  aria-label={item.label}
                  checked={checked}
                  onCheckedChange={() => toggle(item.id)}
                />
                <span>
                  {item.label}
                  {item.helpText && <span className="block text-xs text-textMuted">{item.helpText}</span>}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {groupCustomItems.length > 0 && (
        <ul className="divide-y divide-border border-t border-border pt-1">
          {groupCustomItems.map((item) => (
            <li key={item.id}>
              <CustomItemRow
                item={item}
                onToggled={onCustomItemToggled}
                onLabelChanged={onCustomItemLabelChanged}
                onDeleted={onCustomItemDeleted}
              />
            </li>
          ))}
        </ul>
      )}

      <AddCustomItemForm groupId={group.id} onAdded={onCustomItemAdded} />
    </section>
  );
}
