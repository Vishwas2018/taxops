import { describe, expect, it } from "vitest";
import { fy2025_26 } from "@/lib/tax-config/fy2025-26";
import {
  calculateContractorTakeHome,
  DEFAULT_WEEKS_WORKED_PER_YEAR,
} from "./contractor-take-home";

const config = fy2025_26;

describe("calculateContractorTakeHome", () => {
  it("throws on a negative day rate", () => {
    expect(() =>
      calculateContractorTakeHome(
        { dayRate: -1, daysPerWeek: 4, superTreatment: "exclusive" },
        config,
      ),
    ).toThrow();
  });

  it("throws on negative days per week", () => {
    expect(() =>
      calculateContractorTakeHome(
        { dayRate: 800, daysPerWeek: -1, superTreatment: "exclusive" },
        config,
      ),
    ).toThrow();
  });

  it("returns all zeros for a zero day rate", () => {
    const result = calculateContractorTakeHome(
      { dayRate: 0, daysPerWeek: 4, superTreatment: "exclusive" },
      config,
    );
    expect(result.grossIncome).toBe(0);
    expect(result.superGuarantee).toBe(0);
    expect(result.netTakeHome).toBe(0);
  });

  it("defaults weeksWorkedPerYear to 48 when omitted", () => {
    const result = calculateContractorTakeHome(
      { dayRate: 800, daysPerWeek: 4, superTreatment: "exclusive" },
      config,
    );
    expect(result.weeksWorkedPerYear).toBe(DEFAULT_WEEKS_WORKED_PER_YEAR);
    expect(result.billableDaysPerYear).toBe(192);
  });

  it("golden file: exclusive super, $800/day, 4 days/week, 48 weeks", () => {
    // Hand-computed:
    // billableDays = 4 * 48 = 192; grossIncome = $800 * 192 = $153,600 (super paid on top)
    // assessableIncome = $153,600 (exclusive - super isn't part of assessable income)
    // super = $153,600 * 12% = $18,432
    // Income tax on $153,600: $0 + $4,288 (16%) + $27,000 (30% of $90,000) + $6,882
    //   (37% of $18,600) = $38,170 gross tax; LITO $0 (income > $66,667); Medicare 2% =
    //   $3,072 (income above upper shade-in threshold); net tax = $38,170 + $3,072 = $41,242
    // netTakeHome = $153,600 - $41,242 = $112,358
    const result = calculateContractorTakeHome(
      { dayRate: 800, daysPerWeek: 4, weeksWorkedPerYear: 48, superTreatment: "exclusive" },
      config,
    );
    expect(result.billableDaysPerYear).toBe(192);
    expect(result.grossIncome).toBe(153_600);
    expect(result.assessableIncome).toBe(153_600);
    expect(result.superGuarantee).toBe(18_432);
    expect(result.incomeTax.netTax).toBe(41_242);
    expect(result.netTakeHome).toBe(112_358);
  });

  it("golden file: inclusive super, $700/day, 4 days/week, 40 weeks", () => {
    // Hand-computed:
    // billableDays = 4 * 40 = 160; grossIncome (total package) = $700 * 160 = $112,000
    // super = $112,000 * 0.12 / 1.12 = $12,000 exactly; assessableIncome = $112,000 -
    //   $12,000 = $100,000 (cross-checks against the calculateIncomeTax golden test)
    // netTax on $100,000 = $22,788 (see income-tax.test.ts golden file)
    // netTakeHome = $100,000 - $22,788 = $77,212
    const result = calculateContractorTakeHome(
      { dayRate: 700, daysPerWeek: 4, weeksWorkedPerYear: 40, superTreatment: "inclusive" },
      config,
    );
    expect(result.grossIncome).toBe(112_000);
    expect(result.superGuarantee).toBe(12_000);
    expect(result.assessableIncome).toBe(100_000);
    expect(result.incomeTax.netTax).toBe(22_788);
    expect(result.netTakeHome).toBe(77_212);
  });

  it("assessableIncome plus super always reconstructs grossIncome for inclusive treatment", () => {
    const result = calculateContractorTakeHome(
      { dayRate: 950, daysPerWeek: 4.5, weeksWorkedPerYear: 46, superTreatment: "inclusive" },
      config,
    );
    expect(result.assessableIncome + result.superGuarantee).toBeCloseTo(result.grossIncome, 2);
  });
});
