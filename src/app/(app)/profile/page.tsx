import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tax Profile — TaxOps" };

export default function ProfilePage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Tax Profile</h1>
      <p className="mt-2 text-muted-foreground">
        The guided tax-profile interview lands here (Day 6).
      </p>
    </div>
  );
}
