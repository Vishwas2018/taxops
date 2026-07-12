import type { Metadata } from "next";
import { PropertyCashFlowCalculator } from "@/components/calculators/property-cash-flow-calculator";

export const metadata: Metadata = { title: "Property Cash Flow — TaxOps" };

export default function PropertyCashFlowPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Property Investment Cash Flow</h1>
      <p className="mt-2 text-muted-foreground">
        Estimate your property&apos;s cash flow and the tax effect of negative gearing at
        your marginal rate.
      </p>
      <div className="mt-6">
        <PropertyCashFlowCalculator />
      </div>
    </div>
  );
}
