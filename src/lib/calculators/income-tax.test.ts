import { describe, expect, it } from "vitest";
import { fy2025_26 } from "@/lib/tax-config/fy2025-26";
import { calculateIncomeTax, marginalRateAt } from "./income-tax";

const config = fy2025_26;

describe("calculateIncomeTax", () => {
  it("returns zero tax for zero income", () => {
    const result = calculateIncomeTax(0, config);
    expect(result.grossTax).toBe(0);
    expect(result.litoOffset).toBe(700); // capped by grossTax at 0, not shown as negative
    expect(result.medicareLevy).toBe(0);
    expect(result.netTax).toBe(0);
    expect(result.effectiveRate).toBe(0);
    expect(result.financialYear).toBe("2025-26");
    expect(result.isEstimate).toBe(true);
  });

  it("throws on negative income", () => {
    expect(() => calculateIncomeTax(-1, config)).toThrow();
  });

  describe("bracket boundaries", () => {
    it("$18,200 - top of the tax-free bracket - owes nothing", () => {
      expect(calculateIncomeTax(18_200, config).netTax).toBe(0);
    });

    it("$18,201 - one dollar into the 16% bracket", () => {
      expect(calculateIncomeTax(18_201, config).netTax).toBe(0);
      expect(calculateIncomeTax(18_201, config).grossTax).toBeCloseTo(0.16, 2);
    });

    it("$45,000 - top of the 16% bracket", () => {
      const result = calculateIncomeTax(45_000, config);
      expect(result.grossTax).toBe(4288);
      expect(result.litoOffset).toBe(325);
      expect(result.medicareLevy).toBe(900);
      expect(result.netTax).toBe(4863);
    });

    it("$45,001 - one dollar into the 30% bracket", () => {
      const result = calculateIncomeTax(45_001, config);
      expect(result.grossTax).toBeCloseTo(4288.3, 2);
      expect(result.netTax).toBeCloseTo(4863.34, 2);
    });

    it("$135,000 - top of the 30% bracket", () => {
      const result = calculateIncomeTax(135_000, config);
      expect(result.grossTax).toBe(31_288);
      expect(result.litoOffset).toBe(0);
      expect(result.medicareLevy).toBe(2700);
      expect(result.netTax).toBe(33_988);
    });

    it("$135,001 - one dollar into the 37% bracket", () => {
      const result = calculateIncomeTax(135_001, config);
      expect(result.grossTax).toBeCloseTo(31_288.37, 2);
      expect(result.netTax).toBeCloseTo(33_988.39, 2);
    });

    it("$190,000 - top of the 37% bracket", () => {
      const result = calculateIncomeTax(190_000, config);
      expect(result.grossTax).toBe(51_638);
      expect(result.medicareLevy).toBe(3800);
      expect(result.netTax).toBe(55_438);
    });

    it("$190,001 - one dollar into the top 45% bracket", () => {
      const result = calculateIncomeTax(190_001, config);
      expect(result.grossTax).toBeCloseTo(51_638.45, 2);
      expect(result.netTax).toBeCloseTo(55_438.47, 2);
    });
  });

  it("phases in the Medicare levy between the low-income thresholds ($30,000)", () => {
    // Hand-computed: grossTax on $30,000 = $1,888.00 (16% of $11,800 over $18,200).
    // LITO = $700 (income <= $37,500 full-offset threshold) -> after-offset tax = $1,188.00.
    // Medicare shade-in = 10% * ($30,000 - $27,222) = $277.80 (less than the full 2% levy of
    // $600, so the shaded-in amount applies). Net tax = $1,188.00 + $277.80 = $1,465.80.
    const result = calculateIncomeTax(30_000, config);
    expect(result.medicareLevy).toBeCloseTo(277.8, 2);
    expect(result.netTax).toBeCloseTo(1465.8, 2);
  });

  it("golden file: $100,000 taxable income", () => {
    // Hand-computed:
    // Bracket tax: $0 (0-18,200) + $4,288 (16% of $26,800) + $16,500 (30% of $55,000) = $20,788
    // LITO: $0 (income > $66,667 second-taper upper threshold)
    // Medicare levy: 2% * $100,000 = $2,000 (income above the upper shade-in threshold)
    // Net tax: $20,788 - $0 + $2,000 = $22,788
    const result = calculateIncomeTax(100_000, config);
    expect(result.grossTax).toBe(20_788);
    expect(result.litoOffset).toBe(0);
    expect(result.medicareLevy).toBe(2000);
    expect(result.netTax).toBe(22_788);
    expect(result.effectiveRate).toBeCloseTo(0.22788, 5);
    expect(result.breakdown).toHaveLength(5);
  });
});

describe("marginalRateAt", () => {
  it("returns the correct bracket rate at each boundary", () => {
    expect(marginalRateAt(0, config)).toBe(0);
    expect(marginalRateAt(18_200, config)).toBe(0);
    expect(marginalRateAt(18_201, config)).toBe(0.16);
    expect(marginalRateAt(45_000, config)).toBe(0.16);
    expect(marginalRateAt(45_001, config)).toBe(0.3);
    expect(marginalRateAt(135_000, config)).toBe(0.3);
    expect(marginalRateAt(135_001, config)).toBe(0.37);
    expect(marginalRateAt(190_000, config)).toBe(0.37);
    expect(marginalRateAt(190_001, config)).toBe(0.45);
    expect(marginalRateAt(1_000_000, config)).toBe(0.45);
  });

  it("throws if a malformed config has no max: null top bracket", () => {
    const brokenConfig = {
      ...config,
      incomeTaxBrackets: {
        ...config.incomeTaxBrackets,
        value: [{ min: 0, max: 100, rate: 0.1 }],
      },
    };
    expect(() => marginalRateAt(1_000, brokenConfig)).toThrow(/max: null/);
  });
});
