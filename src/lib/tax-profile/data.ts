import type { createClient } from "@/lib/supabase/server";
import type { TaxProfileInput } from "@/lib/validation/tax-profile";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const PROFILE_COLUMNS =
  "work_arrangement, has_abn, investment_property_band, super_engagement, household_income_band, other_income_sources";

interface ProfileRow {
  work_arrangement: TaxProfileInput["workArrangement"];
  has_abn: TaxProfileInput["hasAbn"];
  investment_property_band: TaxProfileInput["investmentPropertyBand"];
  super_engagement: TaxProfileInput["superEngagement"];
  household_income_band: TaxProfileInput["householdIncomeBand"];
  other_income_sources: NonNullable<TaxProfileInput["otherIncomeSources"]> | null;
}

/** Reads the caller's own tax-profile answers (RLS already restricts this to `userId`'s own
 * row regardless of what's passed - this just narrows the query to avoid an unnecessary
 * cross-user select attempt). Returns `null` if no profile row exists yet (pre-first-save). */
export async function getTaxProfile(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<TaxProfileInput | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (error || !data) return null;

  return {
    workArrangement: data.work_arrangement,
    hasAbn: data.has_abn,
    investmentPropertyBand: data.investment_property_band,
    superEngagement: data.super_engagement,
    householdIncomeBand: data.household_income_band,
    otherIncomeSources: data.other_income_sources ?? [],
  };
}

/** Maps only the keys actually present on `input` to their DB column names, so a
 * single-section edit (e.g. `{ householdIncomeBand: "under_100k" }`) upserts just that column
 * instead of overwriting every other answer to null. */
export function toProfileRow(input: TaxProfileInput): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if ("workArrangement" in input) row.work_arrangement = input.workArrangement;
  if ("hasAbn" in input) row.has_abn = input.hasAbn;
  if ("investmentPropertyBand" in input) row.investment_property_band = input.investmentPropertyBand;
  if ("superEngagement" in input) row.super_engagement = input.superEngagement;
  if ("householdIncomeBand" in input) row.household_income_band = input.householdIncomeBand;
  if ("otherIncomeSources" in input) row.other_income_sources = input.otherIncomeSources;
  return row;
}
