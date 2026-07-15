import type { Metadata } from "next";
import { TaxSetAsideCalculator } from "@/components/calculators/tax-set-aside-calculator";

export const metadata: Metadata = { title: "Tax Set-Aside Estimator — TaxOps" };

export default function TaxSetAsidePage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Tax Set-Aside Estimator</h1>
      <p className="mt-2 text-muted-foreground">
        Estimate how much to set aside from a day rate for income tax and (optionally)
        HELP/STSL repayments, plus the GST component if you&apos;re GST-registered.
      </p>
      <div className="mt-6">
        <TaxSetAsideCalculator />
      </div>
    </div>
  );
}
