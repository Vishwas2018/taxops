import type { Metadata } from "next";
import Link from "next/link";
import { Disclaimer } from "@/components/disclaimer";
import { ChecklistsClient } from "@/components/checklists/checklists-client";
import { getChecklistCustomItems, getChecklistItemStates } from "@/lib/checklists/data";
import { getDefaultChecklistGroupIds } from "@/lib/checklists/select";
import { CHECKLIST_GROUPS, CHECKLIST_TEMPLATE_FINANCIAL_YEAR } from "@/lib/checklists/templates";
import { createClient } from "@/lib/supabase/server";
import { getTaxProfile } from "@/lib/tax-profile/data";

export const metadata: Metadata = { title: "Checklists — TaxOps" };

export default async function ChecklistsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // (app)/layout.tsx already redirects unauthenticated requests before this renders.
    return null;
  }

  const [profile, itemStates, customItems] = await Promise.all([
    getTaxProfile(supabase, user.id),
    getChecklistItemStates(supabase, user.id),
    getChecklistCustomItems(supabase, user.id),
  ]);

  const defaultGroupIds = getDefaultChecklistGroupIds(profile);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">EOFY Checklists</h1>
        <p className="mt-1 text-sm text-textMuted">
          Financial year {CHECKLIST_TEMPLATE_FINANCIAL_YEAR}. Records to gather and questions to
          raise with a registered tax agent - checking an item just tracks your own progress.
        </p>
      </div>

      {!profile && (
        <div className="rounded-lg border border-border bg-neutralSubtle px-4 py-3 text-sm text-textSecondary">
          Showing every checklist group.{" "}
          <Link href="/profile" className="font-medium text-accent underline-offset-4 hover:underline">
            Complete your tax profile
          </Link>{" "}
          for a view tailored to your work arrangement and property holdings - entirely optional.
        </div>
      )}

      <Disclaimer variant="inline" />

      <ChecklistsClient
        allGroups={CHECKLIST_GROUPS}
        defaultGroupIds={defaultGroupIds}
        initialItemStates={itemStates}
        initialCustomItems={customItems}
      />
    </div>
  );
}
