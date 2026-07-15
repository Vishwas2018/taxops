import { describe, expect, it } from "vitest";
import { keyDateSchema } from "@/lib/validation/key-dates";
import { KEY_DATES_2026_27 } from "./key-dates-2026-27";

describe("KEY_DATES_2026_27", () => {
  it("has at least one entry", () => {
    expect(KEY_DATES_2026_27.length).toBeGreaterThan(0);
  });

  it("every entry passes the KeyDate schema", () => {
    for (const entry of KEY_DATES_2026_27) {
      const result = keyDateSchema.safeParse(entry);
      if (!result.success) {
        throw new Error(`${entry.id} failed validation: ${JSON.stringify(result.error.issues)}`);
      }
    }
  });

  it("every id is unique", () => {
    const ids = KEY_DATES_2026_27.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every date falls within or immediately after FY2026-27 (1 July 2026 - 30 June 2027)", () => {
    // Quarterly due dates trail their reporting quarter by about a month, so the Q4 (Apr-Jun)
    // due dates fall in July 2027 - just after the FY's own end date, not within it.
    const earliestAllowed = new Date("2026-07-01T00:00:00Z").getTime();
    const latestAllowed = new Date("2027-07-31T00:00:00Z").getTime();
    for (const entry of KEY_DATES_2026_27) {
      const time = new Date(`${entry.date}T00:00:00Z`).getTime();
      expect(time, `${entry.id} (${entry.date}) is before FY2026-27 starts`).toBeGreaterThanOrEqual(
        earliestAllowed,
      );
      expect(time, `${entry.id} (${entry.date}) is unexpectedly far past FY2026-27`).toBeLessThanOrEqual(
        latestAllowed,
      );
    }
  });

  it("does not carry forward any quarterly super guarantee due-date rows - Payday Super replaces them", () => {
    const superGuaranteeRows = KEY_DATES_2026_27.filter((entry) =>
      entry.id.startsWith("super-guarantee"),
    );
    expect(superGuaranteeRows).toEqual([]);
  });

  it("has exactly one Payday Super entry, effective 1 July 2026, chipped for everyone with an employer", () => {
    const paydaySuper = KEY_DATES_2026_27.find((entry) => entry.id === "payday-super");
    expect(paydaySuper).toBeDefined();
    expect(paydaySuper?.date).toBe("2026-07-01");
    expect(paydaySuper?.audience).toEqual(["everyone-with-employer"]);
    expect(paydaySuper?.description).toMatch(/7 business days/i);
    expect(paydaySuper?.source).toMatch(/^https:\/\/www\.ato\.gov\.au\//);
    expect(paydaySuper?.verified).toBe(true);
  });

  it("still has quarterly BAS and PAYG instalment rows - only super guarantee's quarterly cadence changed", () => {
    const basRows = KEY_DATES_2026_27.filter((entry) => entry.id.startsWith("bas-q"));
    const paygRows = KEY_DATES_2026_27.filter((entry) => entry.id.startsWith("payg-instalment-q"));
    expect(basRows).toHaveLength(4);
    expect(paygRows).toHaveLength(4);
  });

  it("shifts the Q2 BAS/PAYGI due date off the weekend (28 Feb 2027 is a Sunday) to 1 March 2027", () => {
    const basQ2 = KEY_DATES_2026_27.find((entry) => entry.id === "bas-q2");
    const paygQ2 = KEY_DATES_2026_27.find((entry) => entry.id === "payg-instalment-q2");
    expect(basQ2?.date).toBe("2027-03-01");
    expect(paygQ2?.date).toBe("2027-03-01");
  });
});
