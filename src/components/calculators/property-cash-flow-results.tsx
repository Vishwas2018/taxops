import type { PropertyCashFlowResult } from "@/lib/calculators/property-cash-flow";
import { Disclaimer } from "@/components/disclaimer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

/** Divides by 52 for a "per week" figure, squashing -0 the same way `money.ts`'s `toDollars`
 * does at the engine boundary - this component does its own arithmetic (annual / 52), which
 * can reintroduce -0 even though the engine's own outputs never carry it. */
function perWeek(annual: number): number {
  return annual / 52 || 0;
}

export function PropertyCashFlowResults({ data }: { data: PropertyCashFlowResult }) {
  return (
    <Card
      variant="elevated"
      className="rounded-xl shadow-glow-md"
      aria-live="polite"
      role="region"
      aria-label="Calculator results"
    >
      {/* Day 12 Part B hero moment - see contractor-take-home-results.tsx for the contrast
          reasoning (docs/design.md has the full writeup). */}
      <CardHeader className="-mt-(--card-spacing) rounded-t-xl bg-gradient-hero pt-(--card-spacing)">
        <CardTitle>Estimated results — FY{data.financialYear}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm tabular-nums">
          <dt />
          <dt className="text-muted-foreground">Annual</dt>
          <dt className="text-muted-foreground">Per week</dt>

          <dt className="text-muted-foreground">Pre-tax cash flow</dt>
          <dd className="text-right font-medium">{formatCurrency(data.cashOnlyResult)}</dd>
          <dd className="text-right font-medium">{formatCurrency(perWeek(data.cashOnlyResult))}</dd>

          <dt className="text-muted-foreground">
            Tax effect ({Math.round(data.marginalTaxRate * 100)}% marginal rate)
          </dt>
          <dd className="text-right font-medium">{formatCurrency(data.taxEffect)}</dd>
          <dd className="text-right font-medium">{formatCurrency(perWeek(data.taxEffect))}</dd>
        </dl>

        <Separator />

        <dl className="grid grid-cols-3 gap-x-4 gap-y-2 tabular-nums">
          <dt className="font-semibold">After-tax cash flow</dt>
          <dd className="text-right font-semibold">{formatCurrency(data.afterTaxCashFlow)}</dd>
          <dd className="text-right font-semibold">
            {formatCurrency(perWeek(data.afterTaxCashFlow))}
          </dd>
        </dl>

        <p className="text-sm tabular-nums">
          {data.isNegativelyGeared ? (
            <span>
              This property is <strong>negatively geared</strong> - your rental result is a loss
              of {formatCurrency(Math.abs(data.netRentalResult))}, which reduces your tax bill by
              the tax effect shown above.
            </span>
          ) : (
            <span>
              This property is <strong>positively geared</strong> - your rental result is a
              profit of {formatCurrency(data.netRentalResult)}, which adds to your tax bill by
              the tax effect shown above.
            </span>
          )}
        </p>

        <Disclaimer variant="calculator" />

        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">This estimate does not include:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Capital gains tax on sale</li>
            <li>Land tax</li>
            <li>Borrowing-cost amortization</li>
            <li>Loan principal repayments or depreciation recapture on sale</li>
            <li>Assumes your marginal tax rate stays unchanged by this property&apos;s income or loss</li>
          </ul>
          {/* text-textSecondary override, not the ambient text-muted-foreground the parent div
              sets: Day 12 Part B's axe sweep found textMuted on this box's bg-neutralSubtle
              only clears 4.39:1, just under WCAG AA's 4.5:1 floor - a pre-existing bug, not
              something this task's own hero-gradient change introduced, but caught by the same
              sweep. textSecondary clears 6.87:1 here. */}
          <p
            className="mt-3 rounded-md bg-neutralSubtle px-3 py-2 text-textSecondary"
            data-state="reform-status-note"
          >
            <span className="font-medium text-foreground">2026 Budget reform: </span>
            this calculator models current-law treatment. The legislated negative gearing and
            CGT changes (Treasury Laws Amendment (Tax Reform No. 1) Act 2026, now law) commence
            1 July 2027 - which regime applies then depends on your purchase date and property
            type. In one sentence: everything held before 7:30pm AEST 12 May 2026 is grandfathered
            under current treatment until sold. See the Tips articles on the 2026 tax reform for
            detail.
          </p>
        </div>

        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer font-medium">Assumptions used in this estimate</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {data.assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </details>
      </CardContent>
    </Card>
  );
}
