import type { Metadata } from "next";
import { ContractorTakeHomeCalculator } from "@/components/calculators/contractor-take-home-calculator";

export const metadata: Metadata = { title: "Contractor Take-Home — TaxOps" };

export default function ContractorTakeHomePage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Contractor Take-Home Pay</h1>
      <p className="mt-2 text-muted-foreground">
        Estimate your take-home pay from a day rate, including income tax, Medicare levy,
        super, and (optionally) HELP/STSL repayments.
      </p>
      <div className="mt-6">
        <ContractorTakeHomeCalculator />
      </div>
    </div>
  );
}
