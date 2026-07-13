"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { addCustomItemAction } from "@/app/(app)/checklists/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { customItemLabelSchema, CUSTOM_ITEM_LABEL_MAX_LENGTH } from "@/lib/validation/checklists";
import type { ChecklistCustomItem } from "@/lib/checklists/derived";
import type { ChecklistGroupId } from "@/lib/checklists/templates";

/** Adds a custom item to one group. Validates client-side with the same Zod schema the server
 * action re-validates with (Privacy rule: client validation is a UX nicety, never the only
 * gate) - a document name, not a note, hence the visible character cap. */
export function AddCustomItemForm({
  groupId,
  onAdded,
}: {
  groupId: ChecklistGroupId;
  onAdded: (item: ChecklistCustomItem) => void;
}) {
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputId = useId();

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = customItemLabelSchema.safeParse(label);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid name.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addCustomItemAction({ groupId, label: parsed.data });
      if (result.status === "error" || !result.id) {
        setError(result.message ?? "Could not add this item. Try again.");
        return;
      }
      onAdded({ id: result.id, groupId, label: parsed.data, checked: false, position: Number.MAX_SAFE_INTEGER });
      setLabel("");
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <div className="flex-1">
        <label htmlFor={inputId} className="sr-only">
          Add a custom item to {groupId.replace(/-/g, " ")}
        </label>
        <Input
          id={inputId}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="e.g. 2019 depreciation schedule"
          maxLength={CUSTOM_ITEM_LABEL_MAX_LENGTH}
          aria-describedby={error ? `${inputId}-error` : undefined}
          aria-invalid={error ? true : undefined}
        />
        {error && (
          <p id={`${inputId}-error`} role="alert" className="mt-1 text-xs font-medium text-danger">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" variant="secondary" size="sm" disabled={isPending} aria-busy={isPending}>
        {isPending ? "Adding…" : "Add item"}
      </Button>
    </form>
  );
}
