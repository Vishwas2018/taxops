"use client";

import { useState, useTransition } from "react";
import {
  deleteCustomItemAction,
  editCustomItemLabelAction,
  toggleCustomItemAction,
} from "@/app/(app)/checklists/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { customItemLabelSchema, CUSTOM_ITEM_LABEL_MAX_LENGTH } from "@/lib/validation/checklists";
import type { ChecklistCustomItem } from "@/lib/checklists/derived";

/** One user-added checklist item: enclosing-label checkbox (optimistic toggle, same pattern as
 * template items), an inline label editor, and delete - all against the same custom-item server
 * actions. */
export function CustomItemRow({
  item,
  onToggled,
  onLabelChanged,
  onDeleted,
}: {
  item: ChecklistCustomItem;
  onToggled: (id: string, checked: boolean) => void;
  onLabelChanged: (id: string, label: string) => void;
  onDeleted: (id: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(item.label);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const previousChecked = item.checked;
    const nextChecked = !previousChecked;
    onToggled(item.id, nextChecked);
    startTransition(async () => {
      const result = await toggleCustomItemAction({ id: item.id, checked: nextChecked });
      if (result.status === "error") {
        onToggled(item.id, previousChecked);
        setError(result.message ?? "Could not save. Try again.");
      }
    });
  }

  function saveLabel() {
    const parsed = customItemLabelSchema.safeParse(draftLabel);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid name.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await editCustomItemLabelAction({ id: item.id, label: parsed.data });
      if (result.status === "error") {
        setError(result.message ?? "Could not save. Try again.");
        return;
      }
      onLabelChanged(item.id, parsed.data);
      setIsEditing(false);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteCustomItemAction({ id: item.id });
      if (result.status === "error") {
        setError(result.message ?? "Could not remove this item. Try again.");
        return;
      }
      onDeleted(item.id);
    });
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 py-1.5 sm:flex-row sm:items-center">
        <Input
          value={draftLabel}
          onChange={(event) => setDraftLabel(event.target.value)}
          maxLength={CUSTOM_ITEM_LABEL_MAX_LENGTH}
          aria-label="Edit item name"
          autoFocus
        />
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={saveLabel} disabled={isPending} aria-busy={isPending}>
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setDraftLabel(item.label);
              setIsEditing(false);
              setError(null);
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-xs font-medium text-danger sm:ml-2">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <label className="flex flex-1 items-center gap-2 text-sm font-normal">
        <Checkbox checked={item.checked} onCheckedChange={toggle} />
        {item.label}
      </label>
      <div className="flex gap-1">
        <Button type="button" size="xs" variant="ghost" onClick={() => setIsEditing(true)}>
          Edit
        </Button>
        <Button type="button" size="xs" variant="ghost" onClick={remove} disabled={isPending}>
          Remove
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
