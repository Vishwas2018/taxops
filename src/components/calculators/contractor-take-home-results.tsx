import type { ContractorTakeHomeResult } from "@/lib/calculators/contractor-take-home";
import type { HelpRepaymentResult } from "@/lib/calculators/help-repayment";
import { Disclaimer } from "@/components/disclaimer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export interface ContractorTakeHomeResultsData {
  takeHome: ContractorTakeHomeResult;
  help: HelpRepaymentResult | null;
  finalNetAnnual: number;
  finalNetPerWeek: number;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

export function ContractorTakeHomeResults({
  data,
}: {
  data: ContractorTakeHomeResultsData;
}) {
  const { takeHome, help, finalNetAnnual, finalNetPerWeek } = data;

  const allAssumptions = [...takeHome.assumptions, ...(help ? help.assumptions : [])];
  if (help) {
    allAssumptions.push(
      "HELP repayment is estimated using your assessable income as a stand-in for repayment income - it does not add reportable fringe benefits or net investment losses, which the real repayment-income figure includes.",
    );
  }

  return (
    <Card
      variant="elevated"
      className="rounded-xl shadow-glow-md"
      aria-live="polite"
      role="region"
      aria-label="Calculator results"
    >
      {/* Day 12 Part B hero moment - gradient confined to this header band (title text is
          always textPrimary, safe at this alpha) via a negative-margin bleed so it still
          reaches the card's rounded corners; CardContent below stays plain since its `dt`
          labels use textMuted, which the gradient is not contrast-safe behind - see
          docs/design.md. */}
      <CardHeader className="-mt-(--card-spacing) rounded-t-xl bg-gradient-hero pt-(--card-spacing)">
        <CardTitle>
          Estimated results — FY{takeHome.financialYear}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm tabular-nums">
          <dt className="text-muted-foreground">Gross income</dt>
          <dd className="text-right font-medium">{formatCurrency(takeHome.grossIncome)}</dd>

          <dt className="text-muted-foreground">Superannuation guarantee</dt>
          <dd className="text-right font-medium">{formatCurrency(takeHome.superGuarantee)}</dd>

          <dt className="text-muted-foreground">Assessable income</dt>
          <dd className="text-right font-medium">{formatCurrency(takeHome.assessableIncome)}</dd>

          <dt className="text-muted-foreground">Income tax (before offsets)</dt>
          <dd className="text-right font-medium">{formatCurrency(takeHome.incomeTax.grossTax)}</dd>

          <dt className="text-muted-foreground">Low income tax offset</dt>
          <dd className="text-right font-medium">
            -{formatCurrency(takeHome.incomeTax.litoOffset)}
          </dd>

          <dt className="text-muted-foreground">Medicare levy</dt>
          <dd className="text-right font-medium">{formatCurrency(takeHome.incomeTax.medicareLevy)}</dd>

          {help && (
            <>
              <dt className="text-muted-foreground">HELP/STSL repayment</dt>
              <dd className="text-right font-medium">{formatCurrency(help.repaymentAmount)}</dd>
            </>
          )}
        </dl>

        <Separator />

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 tabular-nums">
          <dt className="font-semibold">Net take-home (annual)</dt>
          <dd className="text-right font-semibold">{formatCurrency(finalNetAnnual)}</dd>

          <dt className="text-muted-foreground">Net take-home (per week)</dt>
          <dd className="text-right font-medium">{formatCurrency(finalNetPerWeek)}</dd>
        </dl>

        <Disclaimer variant="calculator" />

        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer font-medium">Assumptions used in this estimate</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {allAssumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </details>
      </CardContent>
    </Card>
  );
}
