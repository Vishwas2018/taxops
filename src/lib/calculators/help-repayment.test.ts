import { describe, expect, it } from "vitest";
import { fy2025_26 } from "@/lib/tax-config/fy2025-26";
import { calculateHelpRepayment } from "./help-repayment";

const config = fy2025_26;

describe("calculateHelpRepayment", () => {
  it("throws on negative repayment income", () => {
    expect(() => calculateHelpRepayment(-1, config)).toThrow();
  });

  it("owes nothing below the minimum repayment threshold", () => {
    const result = calculateHelpRepayment(50_000, config);
    expect(result.repaymentAmount).toBe(0);
    expect(result.isCapApplied).toBe(false);
    expect(result.minimumRepaymentIncome).toBe(67_000);
  });

  it("owes nothing exactly at the minimum threshold ($67,000)", () => {
    expect(calculateHelpRepayment(67_000, config).repaymentAmount).toBe(0);
  });

  it("owes 15c on the first dollar over the threshold ($67,001)", () => {
    const result = calculateHelpRepayment(67_001, config);
    expect(result.repaymentAmount).toBeCloseTo(0.15, 2);
  });

  it("band boundary: exactly $125,000 (top of the 15% band)", () => {
    // (125,000 - 67,000) * 0.15 = $8,700
    const result = calculateHelpRepayment(125_000, config);
    expect(result.repaymentAmount).toBe(8_700);
  });

  it("band boundary: $125,001 (one dollar into the 17% band)", () => {
    const result = calculateHelpRepayment(125_001, config);
    expect(result.repaymentAmount).toBeCloseTo(8_700.17, 2);
  });

  it("cap boundary: at the $179,286 cap threshold, the flat 10% already governs", () => {
    // Marginal formula: $8,700 + (179,286 - 125,000) * 0.17 = $17,928.62
    // Flat 10% cap: $179,286 * 0.10 = $17,928.60
    // The lower of the two applies - at this exact dollar the cap is already $0.02 lower.
    const result = calculateHelpRepayment(179_286, config);
    expect(result.repaymentAmount).toBeCloseTo(17_928.6, 2);
    expect(result.isCapApplied).toBe(true);
  });

  it("golden file: $200,000 repayment income is well past the cap", () => {
    // Marginal formula would give $8,700 + (200,000-125,000)*0.17 = $21,450, but the flat
    // 10% cap of $20,000 is lower and applies instead.
    const result = calculateHelpRepayment(200_000, config);
    expect(result.repaymentAmount).toBe(20_000);
    expect(result.isCapApplied).toBe(true);
    expect(result.financialYear).toBe("2025-26");
    expect(result.isEstimate).toBe(true);
  });

  it("does not apply the cap when the marginal amount is already lower", () => {
    // (150,000 in the 17% band): $8,700 + (150,000-125,000)*0.17 = $12,950, vs a 10% cap of
    // $15,000 - the marginal amount is lower, so the cap does not apply.
    const result = calculateHelpRepayment(150_000, config);
    expect(result.repaymentAmount).toBe(12_950);
    expect(result.isCapApplied).toBe(false);
  });
});
