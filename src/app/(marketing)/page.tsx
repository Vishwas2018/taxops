import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const FEATURES = [
  {
    title: "Guided tax profile",
    description:
      "A short interview about your work arrangement, ABN status, property holdings, and super engagement. Your answers organize what you see elsewhere in TaxOps - they never generate advice.",
  },
  {
    title: "Estimate calculators",
    description:
      "Contractor take-home pay, property cash flow, and Division 293 exposure - each result is clearly labelled as an estimate for the current financial year, with its assumptions shown alongside it.",
  },
  {
    title: "EOFY checklists",
    description:
      "Records to gather and questions worth raising with a registered tax agent, organized by work arrangement and property holdings. Checking an item tracks your own progress - it isn't a lodgement.",
  },
  {
    title: "Tax tips knowledge base",
    description:
      "Plain-language articles on contractor expenses, property deductions, superannuation, and wealth preservation, each reviewed against ATO guidance and sourced back to it.",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-24">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight">
          Understand your tax position before your tax agent does
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          TaxOps is an educational tool for daily-rate contractors and property investors who
          want to understand how contractor expenses, property deductions, superannuation, and
          capital gains actually work - not a substitute for a registered tax agent, and not a
          lodgement service.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/sign-up" className={buttonVariants({ size: "lg" })}>
            Get started
          </Link>
          <Link href="/tips" className={buttonVariants({ size: "lg", variant: "outline" })}>
            Browse tax tips
          </Link>
        </div>
      </div>

      <div className="mt-20 grid gap-4 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <CardTitle className="text-base">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-16 text-center text-sm text-muted-foreground">
        Educational only - not lodgement, not personal advice, no outcome is promised. Always
        confirm your specific situation with a registered tax agent.
      </p>
    </div>
  );
}
