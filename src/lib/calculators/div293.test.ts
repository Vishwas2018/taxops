import { describe, expect, it } from "vitest";
import { fy2025_26 } from "@/lib/tax-config/fy2025-26";
import { calculateDiv293 } from "./div293";

const config = fy2025_26;

describe("calculateDiv293", () => {
  it("returns zero liability when both inputs are zero", () => {
    const result = calculateDiv293(
      { taxableIncome: 0, concessionalContributions: 0 },
      config,
    );
    expect(result.combinedIncome).toBe(0);
    expect(result.additionalTax).toBe(0);
    expect(result.isLiable).toBe(false);
  });

  it("throws on negative inputs", () => {
    expect(() =>
      calculateDiv293({ taxableIncome: -1, concessionalContributions: 0 }, config),
    ).toThrow();
    expect(() =>
      calculateDiv293({ taxableIncome: 0, concessionalContributions: -1 }, config),
    ).toThrow();
  });

  describe("straddling the $250,000 threshold", () => {
    it("combined income exactly at the threshold owes nothing", () => {
      const result = calculateDiv293(
        { taxableIncome: 225_000, concessionalContributions: 25_000 },
        config,
      );
      expect(result.combinedIncome).toBe(250_000);
      expect(result.amountOverThreshold).toBe(0);
      expect(result.additionalTax).toBe(0);
      expect(result.isLiable).toBe(false);
    });

    it("one dollar over the threshold triggers a small liability", () => {
      const result = calculateDiv293(
        { taxableIncome: 225_001, concessionalContributions: 25_000 },
        config,
      );
      expect(result.combinedIncome).toBe(250_001);
      expect(result.amountOverThreshold).toBe(1);
      expect(result.additionalTax).toBeCloseTo(0.15, 2);
      expect(result.isLiable).toBe(true);
    });
  });

  it("caps low-tax contributions at the concessional contributions cap", () => {
    // Hand-computed: combinedIncome = $280,000 + $35,000 = $315,000; amountOverThreshold =
    // $315,000 - $250,000 = $65,000. concessionalContributions ($35,000) exceed the cap
    // ($30,000), so lowTaxContributions is capped at $30,000. div293TaxableAmount =
    // min($65,000, $30,000) = $30,000. additionalTax = $30,000 * 15% = $4,500.
    const result = calculateDiv293(
      { taxableIncome: 280_000, concessionalContributions: 35_000 },
      config,
    );
    expect(result.lowTaxContributions).toBe(30_000);
    expect(result.amountOverThreshold).toBe(65_000);
    expect(result.div293TaxableAmount).toBe(30_000);
    expect(result.additionalTax).toBe(4_500);
  });

  it("golden file: $240,000 taxable income, $25,000 concessional contributions", () => {
    // Hand-computed: combinedIncome = $240,000 + $25,000 = $265,000; amountOverThreshold =
    // $265,000 - $250,000 = $15,000. lowTaxContributions = min($25,000, $30,000 cap) =
    // $25,000. div293TaxableAmount = min($15,000, $25,000) = $15,000. additionalTax =
    // $15,000 * 15% = $2,250.
    const result = calculateDiv293(
      { taxableIncome: 240_000, concessionalContributions: 25_000 },
      config,
    );
    expect(result.combinedIncome).toBe(265_000);
    expect(result.amountOverThreshold).toBe(15_000);
    expect(result.lowTaxContributions).toBe(25_000);
    expect(result.div293TaxableAmount).toBe(15_000);
    expect(result.additionalTax).toBe(2_250);
    expect(result.isLiable).toBe(true);
    expect(result.financialYear).toBe("2025-26");
    expect(result.isEstimate).toBe(true);
  });
});
