"use client";

import { useState, useTransition } from "react";
import { saveTaxProfileSectionAction } from "@/app/(app)/profile/actions";
import { Button } from "@/components/ui/button";
import type { TAX_PROFILE_QUESTION_GROUPS, TaxProfileInput } from "@/lib/validation/tax-profile";
import { QuestionGroupControl } from "./question-group-control";

type QuestionGroup = (typeof TAX_PROFILE_QUESTION_GROUPS)[number];

/** Inline single-section editor: saves just this one field via the same server action the
 * wizard uses, without re-running the whole interview. Used from the profile summary view. */
export function TaxProfileSectionEditor({
  group,
  value,
  onSaved,
  onCancel,
}: {
  group: QuestionGroup;
  value: unknown;
  onSaved: (value: unknown) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveTaxProfileSectionAction({
        [group.key]: draft,
      } as TaxProfileInput);
      if (result.status === "error") {
        setError(result.message ?? "Could not save. Try again.");
        return;
      }
      onSaved(draft);
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-neutralSubtle px-4 py-3">
      <QuestionGroupControl group={group} value={draft} onChange={setDraft} />
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={save} disabled={isPending} aria-busy={isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
