import { isContractorLikeArrangement } from "@/lib/tax-profile/derived";
import type { TaxProfileInput } from "@/lib/validation/tax-profile";
import { CHECKLIST_GROUP_IDS, type ChecklistGroupId } from "./templates";

/** Groups shown by default regardless of profile answers - general record-keeping and
 * agent-consult framing apply to everyone, not just a specific work arrangement or property
 * band. */
export const ALWAYS_DEFAULT_GROUP_IDS: ChecklistGroupId[] = ["receipts-evidence", "agent-questions"];

/**
 * Profile-derived default group selection: a fixed lookup, not a scoring engine, reusing Day
 * 7's relevance pattern (`getRelevantTipCategories`) and its `isContractorLikeArrangement`
 * helper directly rather than re-deriving the same rule. The profile *organizes* which groups
 * show by default - it never gates a group out of reach; `getAllChecklistGroupIds()` is always
 * available via the UI's "add other groups" affordance regardless of what this returns.
 *
 * No profile row, or a profile that hasn't answered any of the three question groups this
 * function reads, both fall back to every group - "no profile" and "profile answered nothing
 * yet" are the same case for a default-selection purpose. Once a question *is* answered, its
 * answer is trusted even when it doesn't add a group - e.g. `investmentPropertyBand: "zero"`
 * is a real answer that keeps property-documents out of the default set, not an unanswered
 * field that falls back to "show everything".
 */
export function getDefaultChecklistGroupIds(
  profile: TaxProfileInput | null | undefined,
): ChecklistGroupId[] {
  const allIds = [...CHECKLIST_GROUP_IDS];
  if (!profile) return allIds;

  const relevant = new Set<ChecklistGroupId>(ALWAYS_DEFAULT_GROUP_IDS);
  let anyQuestionAnswered = false;

  if (profile.workArrangement) {
    anyQuestionAnswered = true;
    if (isContractorLikeArrangement(profile.workArrangement)) {
      relevant.add("contractor-income-expense");
    }
  }
  if (profile.investmentPropertyBand) {
    anyQuestionAnswered = true;
    if (profile.investmentPropertyBand !== "zero") relevant.add("property-documents");
  }
  if (profile.superEngagement) {
    anyQuestionAnswered = true;
    relevant.add("super-contributions");
  }

  if (!anyQuestionAnswered) return allIds;
  return allIds.filter((id) => relevant.has(id));
}
