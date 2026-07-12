import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tax Tips — TaxOps" };

export default function TipsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Tax Tips</h1>
      <p className="mt-2 text-muted-foreground">
        The MDX knowledge base (contractor expenses, property deductions, superannuation,
        wealth preservation) lands here (Day 8).
      </p>
    </div>
  );
}
