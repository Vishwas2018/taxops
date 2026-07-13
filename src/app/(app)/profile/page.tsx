import type { Metadata } from "next";
import { TaxProfileSummary } from "@/components/tax-profile/tax-profile-summary";
import { TaxProfileWizard } from "@/components/tax-profile/tax-profile-wizard";
import { createClient } from "@/lib/supabase/server";
import { getTaxProfile } from "@/lib/tax-profile/data";
import { computeProfileCompleteness } from "@/lib/tax-profile/derived";

export const metadata: Metadata = { title: "Tax Profile — TaxOps" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // (app)/layout.tsx already redirects unauthenticated requests before this renders - this
    // is an unreachable defensive fallback, not a real auth boundary.
    return null;
  }

  const profile = (await getTaxProfile(supabase, user.id)) ?? {};
  const { answered } = computeProfileCompleteness(profile);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Tax Profile</h1>
      <p className="mt-2 text-textSecondary">
        Your answers organize the tips, checklists, and calculator defaults shown elsewhere in
        TaxOps - they never generate advice or recommendations.
      </p>
      <div className="mt-6">
        {answered === 0 ? <TaxProfileWizard /> : <TaxProfileSummary profile={profile} />}
      </div>
    </div>
  );
}
