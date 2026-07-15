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
    <Card variant="elevated" aria-live="polite" role="region" aria-label="Calculator results">
      <CardHeader>
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

        <div className="space-y-2 rounded-md bg-neutralSubtle px-3 py-3 text-sm">
          <p className="font-medium">
            GST {data.gst.isRegistered ? "collected" : "(not registered)"}:{" "}
            <span className="tabular-nums">{formatCurrency(data.gst.collected)}</span>
          </p>
          <p className="text-muted-foreground">
            {data.gst.isRegistered
              ? "GST is collected on behalf of the ATO and remitted via your activity statement - it is not your income and is not included in the set-aside figures above."
              : "Not GST-registered, so no GST is added to this estimate."}
          </p>
          {data.gst.aboveRegistrationThreshold && (
            <p className="text-muted-foreground" data-state="above-gst-threshold">
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
