import type { GstThresholdProjectionResult } from "@/lib/calculators/gst-threshold";
import { Disclaimer } from "@/components/disclaimer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const ATO_REGISTERING_FOR_GST_URL =
  "https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/registering-for-gst";

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

export function GstThresholdResults({ data }: { data: GstThresholdProjectionResult }) {
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
          <dt className="text-muted-foreground">Projected annual turnover</dt>
          <dd className="text-right font-medium">{formatCurrency(data.projectedAnnualTurnover)}</dd>

          <dt className="text-muted-foreground">GST registration threshold</dt>
          <dd className="text-right font-medium">{formatCurrency(data.registrationThreshold)}</dd>
        </dl>

        <Separator />

        {data.crossesThreshold ? (
          <div className="space-y-2 rounded-md bg-neutralSubtle px-3 py-3 text-sm" data-state="crosses">
            <p className="font-medium">
              Projected to cross the threshold in week{" "}
              <span className="tabular-nums">{data.weekThresholdCrossed}</span> of the financial
              year (around {data.monthThresholdCrossed}).
            </p>
            {/* text-textSecondary, not text-muted-foreground: Day 12 Part B's axe sweep found
                textMuted on this box's bg-neutralSubtle only clears 4.39:1, just under WCAG AA's
                4.5:1 floor for normal text - a pre-existing bug, not something this task's own
                hero-gradient change introduced (this box is in CardContent, untouched by that
                change) but caught by the same sweep. textSecondary clears 6.87:1 here. */}
            <p className="text-textSecondary">
              Once turnover reaches the ATO&apos;s{" "}
              <span className="tabular-nums">{formatCurrency(data.registrationThreshold)}</span>{" "}
              mandatory registration threshold, there is an obligation to register for GST within
              21 days. It&apos;s turnover - the total amount invoiced - that counts against this
              threshold, not how much of that money is still sitting in a bank account.
            </p>
            <a
              href={ATO_REGISTERING_FOR_GST_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-accent underline-offset-4 hover:underline"
            >
              ATO — Registering for GST
            </a>
          </div>
        ) : (
          <div className="space-y-2 rounded-md bg-neutralSubtle px-3 py-3 text-sm" data-state="below">
            <p className="font-medium">
              Projected to stay below the threshold by about{" "}
              <span className="tabular-nums">{formatCurrency(data.marginBelowThreshold ?? 0)}</span>
              .
            </p>
            <p className="text-textSecondary">
              Registering for GST isn&apos;t mandatory while turnover stays below the ATO&apos;s{" "}
              <span className="tabular-nums">{formatCurrency(data.registrationThreshold)}</span>{" "}
              threshold. Voluntary registration below the threshold is allowed and has
              trade-offs either way - it means charging GST on invoices and lodging activity
              statements, but also being able to claim GST credits on business purchases.
            </p>
            <a
              href={ATO_REGISTERING_FOR_GST_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-accent underline-offset-4 hover:underline"
            >
              ATO — Registering for GST
            </a>
          </div>
        )}

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
