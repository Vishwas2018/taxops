"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { TAX_PROFILE_QUESTION_GROUPS } from "@/lib/validation/tax-profile";

type QuestionGroup = (typeof TAX_PROFILE_QUESTION_GROUPS)[number];

/**
 * Renders the right control type for a question group's `type` (single/boolean -> radio group,
 * multi -> checkbox list), always using the enclosing-label pattern
 * (`<label><Control />text</label>`) rather than `<Label htmlFor>` - @base-ui/react's
 * Radio/Checkbox primitives only reliably *toggle* that way (see PROGRESS.md Day 4). That
 * pattern alone does not give the control an accessible *name*, though: both primitives render
 * a plain `<span role="radio"|"checkbox">`, and the native `<label>`-association algorithm only
 * computes a name from wrapping text for actual labelable elements (input/button/select/etc) -
 * a real, axe-confirmed gap found by Day 9's E2E accessibility scans, affecting every
 * Radio/Checkbox in the app. Each option's `aria-label` below is the fix. Shared by the wizard
 * and the single-section editor so both stay visually/behaviourally identical.
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
              aria-label={option.label}
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

  // Always a string, never `undefined` - passing `undefined` on the first render and a real
  // string after an answer is picked flips @base-ui/react's RadioGroup from uncontrolled to
  // controlled mid-lifetime, which it (rightly) warns about in the console. An empty string
  // matches no option, so "no answer yet" still renders with nothing selected.
  const stringValue = value === null || value === undefined ? "" : String(value);

  return (
    <RadioGroup
      value={stringValue}
      onValueChange={(next: string) => onChange(group.type === "boolean" ? next === "true" : next)}
      aria-label={group.title}
      className="gap-3"
    >
      {group.options.map((option) => (
        <label key={option.value} className="flex items-center gap-2 text-sm font-normal">
          <RadioGroupItem value={option.value} aria-label={option.label} /> {option.label}
        </label>
      ))}
    </RadioGroup>
  );
}
