"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { TAX_PROFILE_QUESTION_GROUPS } from "@/lib/validation/tax-profile";

type QuestionGroup = (typeof TAX_PROFILE_QUESTION_GROUPS)[number];

/**
 * Renders the right control type for a question group's `type` (single/boolean -> radio group,
 * multi -> checkbox list), always using the enclosing-label pattern
 * (`<label><Control />text</label>`) rather than `<Label htmlFor>` - @base-ui/react's
 * Radio/Checkbox primitives only reliably associate that way (see PROGRESS.md Day 4).
 * Shared by the wizard and the single-section editor so both stay visually/behaviourally
 * identical.
 */
export function QuestionGroupControl({
  group,
  value,
  onChange,
}: {
  group: QuestionGroup;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (group.type === "multi") {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="space-y-2" role="group" aria-label={group.title}>
        {group.options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm font-normal">
            <Checkbox
              checked={selected.includes(option.value)}
              onCheckedChange={(checked) => {
                onChange(
                  checked
                    ? [...selected, option.value]
                    : selected.filter((v) => v !== option.value),
                );
              }}
            />
            {option.label}
          </label>
        ))}
      </div>
    );
  }

  const stringValue = value === null || value === undefined ? undefined : String(value);

  return (
    <RadioGroup
      value={stringValue}
      onValueChange={(next: string) => onChange(group.type === "boolean" ? next === "true" : next)}
      aria-label={group.title}
      className="gap-3"
    >
      {group.options.map((option) => (
        <label key={option.value} className="flex items-center gap-2 text-sm font-normal">
          <RadioGroupItem value={option.value} /> {option.label}
        </label>
      ))}
    </RadioGroup>
  );
}
