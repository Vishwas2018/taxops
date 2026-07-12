import type { Metadata } from "next";

export const metadata: Metadata = { title: "Calculators — TaxOps" };

export default function CalculatorsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Calculators</h1>
      <p className="mt-2 text-muted-foreground">
        Contractor take-home, income tax + super, property cash flow, depreciation, and
        deduction-comparison calculators land here (Days 4–5).
      </p>
    </div>
  );
}
