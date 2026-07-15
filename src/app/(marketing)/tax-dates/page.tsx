import type { Metadata } from "next";
import { Disclaimer } from "@/components/disclaimer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { KEY_DATES_2025_26 } from "@/lib/tax-config/key-dates";
import {
  AUDIENCE_LABELS,
  findNextUpcomingKeyDate,
  groupKeyDatesByQuarter,
} from "@/lib/tax-dates/derived";

export const metadata: Metadata = { title: "Tax Dates — TaxOps" };

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function TaxDatesPage() {
  const nextUpcoming = findNextUpcomingKeyDate(KEY_DATES_2025_26);
  const groups = groupKeyDatesByQuarter(KEY_DATES_2025_26);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Tax Dates</h1>
      <p className="mt-2 text-muted-foreground">
        Key FY2025-26 dates for lodgment, activity statements, super guarantee, and PAYG
        instalments - a static reference, not a reminder service.
      </p>

      <div className="mt-6">
        <Disclaimer variant="inline" />
      </div>

      <div className="mt-10 space-y-10">
        {groups.map((group) => (
          <section key={group.label} aria-labelledby={`quarter-${group.label}`}>
            <h2 id={`quarter-${group.label}`} className="text-lg font-semibold">
              {group.label}
            </h2>
            <ul className="mt-3 space-y-3">
              {group.dates.map((entry) => {
                const isNext = nextUpcoming?.id === entry.id;
                return (
                  <li key={entry.id}>
                    <Card variant={isNext ? "elevated" : "default"} size="sm" data-state={isNext ? "next-upcoming" : undefined}>
                      <CardContent className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium">{entry.title}</p>
                          {isNext && <Badge>Next upcoming</Badge>}
                        </div>
                        <p className="text-sm tabular-nums text-textMuted">{formatDate(entry.date)}</p>
                        <p className="text-sm text-textSecondary">{entry.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {entry.audience.map((audience) => (
                            <Badge key={audience} variant="outline">
                              {AUDIENCE_LABELS[audience]}
                            </Badge>
                          ))}
                        </div>
                        <a
                          href={entry.source}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block text-sm text-accent underline-offset-4 hover:underline"
                        >
                          ATO source
                        </a>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
