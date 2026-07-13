import type { TAX_PROFILE_QUESTION_GROUPS } from "@/lib/validation/tax-profile";

type QuestionGroup = (typeof TAX_PROFILE_QUESTION_GROUPS)[number];

/** Human-readable label(s) for a group's current answer, or "Not answered" - shared by the
 * review step and the summary view so both describe an answer identically. */
export function formatAnswerLabel(group: QuestionGroup, value: unknown): string {
  if (group.type === "multi") {
    const values = Array.isArray(value) ? value : [];
    if (values.length === 0) return "Not answered";
    return values
      .map((v) => group.options.find((option) => option.value === v)?.label ?? String(v))
      .join(", ");
  }

  if (value === null || value === undefined) return "Not answered";
  const stringValue = String(value);
  return group.options.find((option) => option.value === stringValue)?.label ?? stringValue;
}
