"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatAnswerLabel } from "@/lib/tax-profile/format";
import { TAX_PROFILE_QUESTION_GROUPS, type TaxProfileInput } from "@/lib/validation/tax-profile";
import { TaxProfileSectionEditor } from "./tax-profile-section-editor";
import { TaxProfileWizard } from "./tax-profile-wizard";

/** Read view of an existing profile, with a per-section "Edit" affordance so a later change
 * doesn't require redoing the whole interview - plus a "Redo the full interview" escape hatch
 * that reopens the wizard prefilled with the current answers. */
export function TaxProfileSummary({ profile }: { profile: TaxProfileInput }) {
  const [answers, setAnswers] = useState(profile);
  const [editingKey, setEditingKey] = useState<keyof TaxProfileInput | null>(null);
  const [redoing, setRedoing] = useState(false);

  if (redoing) {
    return <TaxProfileWizard initialAnswers={answers} onDone={() => setRedoing(false)} />;
  }

  return (
    <div className="max-w-xl space-y-6">
      <dl className="divide-y divide-border rounded-lg border border-border">
        {TAX_PROFILE_QUESTION_GROUPS.map((group) => (
          <div key={group.key} className="px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <dt className="text-sm font-medium">{group.title}</dt>
                <dd className="text-sm text-textSecondary">
                  {formatAnswerLabel(group, answers[group.key])}
                </dd>
              </div>
              {editingKey !== group.key && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingKey(group.key)}
                >
                  Edit
                </Button>
              )}
            </div>
            {editingKey === group.key && (
              <div className="mt-3">
                <TaxProfileSectionEditor
                  group={group}
                  value={answers[group.key]}
                  onCancel={() => setEditingKey(null)}
                  onSaved={(value) => {
                    setAnswers((prev) => ({ ...prev, [group.key]: value }));
                    setEditingKey(null);
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </dl>

      <Button type="button" variant="ghost" onClick={() => setRedoing(true)}>
        Redo the full interview
      </Button>
    </div>
  );
}
