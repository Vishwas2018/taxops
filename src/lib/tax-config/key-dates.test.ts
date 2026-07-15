import { describe, expect, it } from "vitest";
import { keyDateSchema } from "@/lib/validation/key-dates";
import { KEY_DATES_2025_26 } from "./key-dates";

describe("KEY_DATES_2025_26", () => {
  it("has at least one entry", () => {
    expect(KEY_DATES_2025_26.length).toBeGreaterThan(0);
  });

  it("every entry passes the KeyDate schema", () => {
    for (const entry of KEY_DATES_2025_26) {
      const result = keyDateSchema.safeParse(entry);
      if (!result.success) {
        throw new Error(`${entry.id} failed validation: ${JSON.stringify(result.error.issues)}`);
      }
    }
  });

  it("every id is unique", () => {
    const ids = KEY_DATES_2025_26.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every date falls within or immediately after FY2025-26 (1 July 2025 - 30 June 2026)", () => {
    // Quarterly due dates trail their reporting quarter by about a month, so the Q4 (Apr-Jun)
    // due dates fall in July 2026 - just after the FY's own end date, not within it. Anything
    // later than that would be a real data error, not an expected trailing-due-date case.
    const earliestAllowed = new Date("2025-07-01T00:00:00Z").getTime();
    const latestAllowed = new Date("2026-07-31T00:00:00Z").getTime();
    for (const entry of KEY_DATES_2025_26) {
      const time = new Date(`${entry.date}T00:00:00Z`).getTime();
      expect(time, `${entry.id} (${entry.date}) is before FY2025-26 starts`).toBeGreaterThanOrEqual(
        earliestAllowed,
      );
      expect(time, `${entry.id} (${entry.date}) is unexpectedly far past FY2025-26`).toBeLessThanOrEqual(
        latestAllowed,
      );
    }
  });
});
