import type { Metadata } from "next";
import Link from "next/link";
import { CALCULATORS } from "@/app/(app)/calculators/page";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getChecklistCustomItems, getChecklistItemStates } from "@/lib/checklists/data";
import { computeOverallProgress } from "@/lib/checklists/derived";
import { getDefaultChecklistGroupIds } from "@/lib/checklists/select";
import { CHECKLIST_GROUPS } from "@/lib/checklists/templates";
import { CATEGORY_LABELS } from "@/lib/content/schema";
import { createClient } from "@/lib/supabase/server";
import { getTaxProfile } from "@/lib/tax-profile/data";
import {
  computeProfileCompleteness,
  getRelevantTipCategories,
  isContractorLikeArrangement,
} from "@/lib/tax-profile/derived";

export const metadata: Metadata = { title: "Dashboard — TaxOps" };

const CONTRACTOR_TAKE_HOME_HREF = "/calculators/contractor-take-home";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // (app)/layout.tsx already redirects unauthenticated requests before this renders.
    return null;
  }

  const rawProfile = await getTaxProfile(supabase, user.id);
  const profile = rawProfile ?? {};
  const completeness = computeProfileCompleteness(profile);
  const relevantCategories = getRelevantTipCategories(profile);
  const highlightContractorTakeHome = isContractorLikeArrangement(profile.workArrangement);

  const [checklistItemStates, checklistCustomItems] = await Promise.all([
    getChecklistItemStates(supabase, user.id),
    getChecklistCustomItems(supabase, user.id),
  ]);
  const defaultChecklistGroupIds = getDefaultChecklistGroupIds(rawProfile);
  const defaultChecklistGroups = CHECKLIST_GROUPS.filter((group) =>
    defaultChecklistGroupIds.includes(group.id),
  );
  const checklistProgress = computeOverallProgress(
    defaultChecklistGroups,
    checklistItemStates,
    checklistCustomItems,
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tax profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-textSecondary">
              {completeness.answered} of {completeness.total} questions answered
            </span>
            <span className="font-medium">{completeness.percent}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutralSubtle">
            <div
              className="h-full rounded-full bg-accent transition-all duration-200 ease-in-out"
              style={{ width: `${completeness.percent}%` }}
            />
          </div>
          <Link
            href="/profile"
            className="text-sm font-medium text-accent underline-offset-4 hover:underline"
          >
            {completeness.answered === 0 ? "Start your tax profile" : "Review your tax profile"}
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">EOFY checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-textSecondary">
              {checklistProgress.checked} of {checklistProgress.total} items checked
            </span>
            <span className="font-medium">{checklistProgress.percent}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutralSubtle">
            <div
              className="h-full rounded-full bg-accent transition-all duration-200 ease-in-out"
              style={{ width: `${checklistProgress.percent}%` }}
            />
          </div>
          <Link
            href="/checklists"
            className="text-sm font-medium text-accent underline-offset-4 hover:underline"
          >
            Go to your checklists
          </Link>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold">Calculators</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CALCULATORS.map((calculator) => {
            const isHighlighted =
              highlightContractorTakeHome && calculator.href === CONTRACTOR_TAKE_HOME_HREF;
            return (
              <Link key={calculator.href} href={calculator.href}>
                <Card variant="interactive" className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{calculator.title}</CardTitle>
                      {isHighlighted && <Badge>From your profile</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-textMuted">{calculator.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {relevantCategories.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold">Relevant tips for you</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {relevantCategories.map((category) => (
              <li key={category}>
                <Link
                  href={`/tips#category-${category}`}
                  className="inline-flex rounded-full border border-border bg-surface px-3 py-1 text-sm hover:bg-neutralSubtle"
                >
                  {CATEGORY_LABELS[category]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
