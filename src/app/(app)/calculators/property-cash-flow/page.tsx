import type { Metadata } from "next";
import { PropertyCashFlowCalculator } from "@/components/calculators/property-cash-flow-calculator";
import { fy2025_26 } from "@/lib/tax-config/fy2025-26";
import { createClient } from "@/lib/supabase/server";
import { getTaxProfile } from "@/lib/tax-profile/data";
import { suggestMarginalRateForIncomeBand } from "@/lib/tax-profile/derived";
import { TAX_PROFILE_QUESTION_GROUPS } from "@/lib/validation/tax-profile";

export const metadata: Metadata = { title: "Property Cash Flow — TaxOps" };

export default async function PropertyCashFlowPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getTaxProfile(supabase, user.id) : null;

  const suggestedMarginalRate = suggestMarginalRateForIncomeBand(
    profile?.householdIncomeBand,
    fy2025_26,
  );
  const incomeBandOption = TAX_PROFILE_QUESTION_GROUPS.find(
    (group) => group.key === "householdIncomeBand",
  )?.options.find((option) => option.value === profile?.householdIncomeBand);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Property Investment Cash Flow</h1>
      <p className="mt-2 text-muted-foreground">
        Estimate your property&apos;s cash flow and the tax effect of negative gearing at
        your marginal rate.
      </p>
      <div className="mt-6">
        <PropertyCashFlowCalculator
          suggestedMarginalRate={suggestedMarginalRate}
          incomeBandLabel={incomeBandOption?.label ?? null}
        />
      </div>
    </div>
  );
}
