import { describe, expect, it } from "vitest";
import { fy2025_26 } from "@/lib/tax-config/fy2025-26";
import { calculatePropertyCashFlow } from "./property-cash-flow";

const config = fy2025_26;

describe("calculatePropertyCashFlow", () => {
  it("returns all zeros when every input is zero", () => {
    const result = calculatePropertyCashFlow(
      {
        annualRentalIncome: 0,
        annualExpenses: 0,
        annualLoanInterest: 0,
        annualDepreciation: 0,
        marginalTaxRate: 0,
      },
      config,
    );
    expect(result.netRentalResult).toBe(0);
    expect(result.isNegativelyGeared).toBe(false);
    expect(result.taxEffect).toBe(0);
    expect(result.afterTaxCashFlow).toBe(0);
  });

  it("throws if marginalTaxRate is outside 0-1", () => {
    const base = {
      annualRentalIncome: 0,
      annualExpenses: 0,
      annualLoanInterest: 0,
      annualDepreciation: 0,
    };
    expect(() => calculatePropertyCashFlow({ ...base, marginalTaxRate: -0.1 }, config)).toThrow();
    expect(() => calculatePropertyCashFlow({ ...base, marginalTaxRate: 1.1 }, config)).toThrow();
  });

  it("golden file: negatively geared property (loss)", () => {
    // Hand-computed:
    // netRentalResult = $20,000 - $5,000 - $12,000 - $6,000 = -$3,000 (loss)
    // cashOnlyResult = $20,000 - $5,000 - $12,000 = $3,000 (depreciation excluded, non-cash)
    // taxEffect = -(-3,000) * 0.37 = $1,110 (tax saving, at the 37% bracket rate)
    // afterTaxCashFlow = $3,000 + $1,110 = $4,110
    const result = calculatePropertyCashFlow(
      {
        annualRentalIncome: 20_000,
        annualExpenses: 5_000,
        annualLoanInterest: 12_000,
        annualDepreciation: 6_000,
        marginalTaxRate: 0.37,
      },
      config,
    );
    expect(result.netRentalResult).toBe(-3_000);
    expect(result.isNegativelyGeared).toBe(true);
    expect(result.marginalTaxRate).toBe(0.37);
    expect(result.cashOnlyResult).toBe(3_000);
    expect(result.taxEffect).toBe(1_110);
    expect(result.afterTaxCashFlow).toBe(4_110);
  });

  it("golden file: positively geared property (profit)", () => {
    // Hand-computed:
    // netRentalResult = $30,000 - $5,000 - $8,000 - $4,000 = $13,000 (profit)
    // cashOnlyResult = $30,000 - $5,000 - $8,000 = $17,000
    // taxEffect = -(13,000) * 0.30 = -$3,900 (additional tax payable, at the 30% bracket rate)
    // afterTaxCashFlow = $17,000 - $3,900 = $13,100
    const result = calculatePropertyCashFlow(
      {
        annualRentalIncome: 30_000,
        annualExpenses: 5_000,
        annualLoanInterest: 8_000,
        annualDepreciation: 4_000,
        marginalTaxRate: 0.3,
      },
      config,
    );
    expect(result.netRentalResult).toBe(13_000);
    expect(result.isNegativelyGeared).toBe(false);
    expect(result.marginalTaxRate).toBe(0.3);
    expect(result.taxEffect).toBe(-3_900);
    expect(result.afterTaxCashFlow).toBe(13_100);
  });

  it("labels every result as a pre-advice estimate", () => {
    const result = calculatePropertyCashFlow(
      {
        annualRentalIncome: 1,
        annualExpenses: 0,
        annualLoanInterest: 0,
        annualDepreciation: 0,
        marginalTaxRate: 0,
      },
      config,
    );
    expect(result.isEstimate).toBe(true);
    expect(result.assumptions.some((a) => a.includes("Pre-advice estimate"))).toBe(true);
  });
});
