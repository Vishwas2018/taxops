import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Calculators — TaxOps" };

export const CALCULATORS = [
  {
    href: "/calculators/contractor-take-home",
    title: "Contractor take-home pay",
    description: "Estimate net pay from a day rate, including tax, Medicare, super, and HELP.",
  },
  {
    href: "/calculators/property-cash-flow",
    title: "Property cash flow",
    description: "Estimate a rental property's cash flow and negative gearing tax effect.",
  },
  {
    href: "/calculators/div-293",
    title: "Division 293",
    description: "Check whether the extra 15% tax applies to your super contributions.",
  },
  {
    href: "/calculators/tax-set-aside",
    title: "Tax set-aside estimator",
    description: "Work out how much to set aside from a day rate for tax, HELP, and GST.",
  },
];

export default function CalculatorsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Calculators</h1>
      <p className="mt-2 text-muted-foreground">
        Estimate tools for contractors and property investors. Depreciation and
        deduction-comparison calculators land here on a later day.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CALCULATORS.map((calculator) => (
          <Link key={calculator.href} href={calculator.href}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">{calculator.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{calculator.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
