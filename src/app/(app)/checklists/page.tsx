import type { Metadata } from "next";

export const metadata: Metadata = { title: "Checklists — TaxOps" };

export default function ChecklistsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">EOFY Checklists</h1>
      <p className="mt-2 text-muted-foreground">
        Templated checklists per profile type land here (Day 7).
      </p>
    </div>
  );
}
