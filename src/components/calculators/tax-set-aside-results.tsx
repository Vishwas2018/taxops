import type { TaxSetAsideResult } from "@/lib/calculators/tax-set-aside";
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

function formatPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}

export function TaxSetAsideResults({ data }: { data: TaxSetAsideResult }) {
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
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm tabular-nums">
          <dt className="text-muted-foreground">Gross income (annual, GST-exclusive)</dt>
          <dd className="text-right font-medium">{formatCurrency(data.grossIncome)}</dd>

          <dt className="text-muted-foreground">Estimated income tax</dt>
          <dd className="text-right font-medium">{formatCurrency(data.incomeTax.netTax)}</dd>

          {data.help && (
            <>
              <dt className="text-muted-foreground">Estimated HELP/STSL repayment</dt>
              <dd className="text-right font-medium">{formatCurrency(data.help.repaymentAmount)}</dd>
            </>
          )}
        </dl>

        <Separator />

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 tabular-nums">
          <dt className="font-semibold">Suggested set-aside (annual)</dt>
          <dd className="text-right font-semibold">{formatCurrency(data.totalSetAside)}</dd>

          <dt className="text-sm text-muted-foreground">Per invoice-week</dt>
          <dd className="text-right text-sm font-medium">
            {formatCurrency(data.setAsidePerInvoiceWeek)}
          </dd>

          <dt className="text-sm text-muted-foreground">As a share of gross income</dt>
          <dd className="text-right text-sm font-medium tabular-nums">
            {formatPercent(data.setAsidePercentOfGross)}
          </dd>
        </dl>

        <Separator />

        {/* text-textSecondary on the two explanatory paragraphs below, not text-muted-foreground:
            Day 12 Part B's axe sweep found textMuted on this box's bg-neutralSubtle only
            clears 4.39:1, just under WCAG AA's 4.5:1 floor - a pre-existing bug, not something
            this task's own hero-gradient change introduced, but caught by the same sweep.
            textSecondary clears 6.87:1 here. */}
        <div className="space-y-2 rounded-md bg-neutralSubtle px-3 py-3 text-sm">
          <p className="font-medium">
            GST {data.gst.isRegistered ? "collected" : "(not registered)"}:{" "}
            <span className="tabular-nums">{formatCurrency(data.gst.collected)}</span>
          </p>
          <p className="text-textSecondary">
            {data.gst.isRegistered
              ? "GST is collected on behalf of the ATO and remitted via your activity statement - it is not your income and is not included in the set-aside figures above."
              : "Not GST-registered, so no GST is added to this estimate."}
          </p>
          {data.gst.aboveRegistrationThreshold && (
            <p className="text-textSecondary" data-state="above-gst-threshold">
              This estimate&apos;s annual gross income is at or above the ATO&apos;s{" "}
              {formatCurrency(data.gst.registrationThreshold)} mandatory GST registration
              turnover threshold.
            </p>
          )}
        </div>

        <Disclaimer variant="calculator" />

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
