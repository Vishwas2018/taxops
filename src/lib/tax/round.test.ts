import { describe, expect, it } from "vitest";
import { roundToCents } from "./round";

describe("roundToCents", () => {
  it("rounds to two decimal places", () => {
    expect(roundToCents(1.005)).toBe(1.01);
    expect(roundToCents(100)).toBe(100);
    expect(roundToCents(33.333)).toBe(33.33);
  });
});
