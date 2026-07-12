import type { Div293Result } from "@/lib/calculators/div293";
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

type Div293State = "below" | "straddle" | "above";

function stateFor(data: Div293Result): Div293State {
  if (!data.isLiable) return "below";
  if (data.div293Income < data.threshold) return "straddle";
  return "above";
}

export function Div293Results({ data }: { data: Div293Result }) {
  const state = stateFor(data);

  return (
    <Card aria-live="polite" role="region" aria-label="Calculator results">
      <CardHeader>
        <CardTitle>Estimated results — FY{data.financialYear}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Income for Division 293 purposes</dt>
          <dd className="text-right font-medium">{formatCurrency(data.div293Income)}</dd>

          <dt className="text-muted-foreground">Concessional contributions</dt>
          <dd className="text-right font-medium">
            {formatCurrency(data.combinedIncome - data.div293Income)}
          </dd>

          <dt className="text-muted-foreground">Combined income</dt>
          <dd className="text-right font-medium">{formatCurrency(data.combinedIncome)}</dd>

          <dt className="text-muted-foreground">Threshold</dt>
          <dd className="text-right font-medium">{formatCurrency(data.threshold)}</dd>

          <dt className="text-muted-foreground">Amount over threshold</dt>
          <dd className="text-right font-medium">{formatCurrency(data.amountOverThreshold)}</dd>
        </dl>

        <Separator />

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
          <dt className="font-semibold">Division 293 tax payable</dt>
          <dd className="text-right font-semibold">{formatCurrency(data.additionalTax)}</dd>
        </dl>

        {state === "below" && (
          <p className="text-sm" data-state="below">
            Your combined income ({formatCurrency(data.combinedIncome)}) is at or below the{" "}
            {formatCurrency(data.threshold)} threshold, so no Division 293 tax applies.
          </p>
        )}

        {state === "straddle" && (
          <p className="text-sm" data-state="straddle">
            Your income alone ({formatCurrency(data.div293Income)}) is <strong>below</strong>{" "}
            the {formatCurrency(data.threshold)} threshold - but adding your concessional
            contributions brings your <strong>combined</strong> income to{" "}
            {formatCurrency(data.combinedIncome)}, which is over it. Division 293 compares
            combined income (income + concessional contributions) to the threshold, not income
            alone, so contributions can trigger this tax even when your income by itself
            wouldn&apos;t.
          </p>
        )}

        {state === "above" && (
          <p className="text-sm" data-state="above">
            Your income alone ({formatCurrency(data.div293Income)}) already exceeds the{" "}
            {formatCurrency(data.threshold)} threshold, so Division 293 tax applies regardless
            of your concessional contributions.
          </p>
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
