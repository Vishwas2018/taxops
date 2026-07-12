import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Calculators — TaxOps" };

export default function CalculatorsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Calculators</h1>
      <p className="mt-2 text-muted-foreground">
        Income tax + super, property cash flow, depreciation, and deduction-comparison
        calculators land here (Day 5).
      </p>
      <ul className="mt-6 space-y-2">
        <li>
          <Link href="/calculators/contractor-take-home" className="underline underline-offset-4">
            Contractor take-home pay
          </Link>
        </li>
      </ul>
    </div>
  );
}
