import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">
        Understand your tax position before your tax agent does
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        TaxOps helps daily-rate contractors and property investors understand legal tax
        optimisation, deductions, and wealth preservation — a guided tax profile, estimate
        calculators, EOFY checklists, and a tax tips knowledge base.
      </p>
      <div className="mt-8 flex justify-center gap-4">
        <Link href="/sign-up" className={buttonVariants({ size: "lg" })}>
          Get started
        </Link>
        <Link href="/tips" className={buttonVariants({ size: "lg", variant: "outline" })}>
          Browse tax tips
        </Link>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Educational only — not lodgement, not personal advice. Always confirm with a
        registered tax agent.
      </p>
    </div>
  );
}
