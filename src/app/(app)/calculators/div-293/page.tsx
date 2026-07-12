import type { Metadata } from "next";
import { Div293Calculator } from "@/components/calculators/div-293-calculator";

export const metadata: Metadata = { title: "Division 293 — TaxOps" };

export default function Div293Page() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Division 293</h1>
      <p className="mt-2 text-muted-foreground">
        Estimate whether the extra 15% Division 293 tax applies to your concessional super
        contributions.
      </p>
      <div className="mt-6">
        <Div293Calculator />
      </div>
    </div>
  );
}
