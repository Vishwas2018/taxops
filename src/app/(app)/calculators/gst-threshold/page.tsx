import type { Metadata } from "next";
import { GstThresholdCalculator } from "@/components/calculators/gst-threshold-calculator";

export const metadata: Metadata = { title: "GST Threshold Projector — TaxOps" };

export default function GstThresholdPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">GST Threshold Projector</h1>
      <p className="mt-2 text-muted-foreground">
        Project when your day-rate contracting turnover would reach the ATO&apos;s mandatory GST
        registration threshold, based on a level day rate and work pattern.
      </p>
      <div className="mt-6">
        <GstThresholdCalculator />
      </div>
    </div>
  );
}
