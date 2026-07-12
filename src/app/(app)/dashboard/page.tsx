import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard — TaxOps" };

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Saved articles, checklist progress, and saved calculator scenarios land here (Day 7).
      </p>
    </div>
  );
}
