import { describe, expect, it } from "vitest";
import { calculateDiv293 } from "@/lib/calculators/div293";
import { calculateHelpRepayment } from "@/lib/calculators/help-repayment";
import { calculateIncomeTax } from "@/lib/calculators/income-tax";
import { fy2025_26 } from "./fy2025-26";
import { fy2026_27 } from "./fy2026-27";

const config = fy2026_27;

describe("fy2026-27 config sanity", () => {
  it("has the correct financial year label", () => {
    expect(config.financialYear).toBe("2026-27");
  });

  it("carries forward GST, LITO, SG rate, and Div293 threshold unchanged from FY2025-26", () => {
    expect(config.gst.rate.value).toBe(fy2025_26.gst.rate.value);
    expect(config.gst.registrationThreshold.value).toBe(fy2025_26.gst.registrationThreshold.value);
    expect(config.lito.value).toEqual(fy2025_26.lito.value);
    expect(config.superGuarantee.rate.value).toBe(fy2025_26.superGuarantee.rate.value);
    expect(config.division293.incomeThreshold.value).toBe(fy2025_26.division293.incomeThreshold.value);
    expect(config.division293.rate.value).toBe(fy2025_26.division293.rate.value);
  });

  it("flags Medicare low-income thresholds as carried forward, pending FY2026-27 indexation", () => {
    expect(config.medicareLevy.lowIncomeThresholds.pendingIndexation).toBe(true);
    expect(config.medicareLevy.lowIncomeThresholds.verified).toBe(false);
    expect(config.medicareLevy.lowIncomeThresholds.value).toEqual(
      fy2025_26.medicareLevy.lowIncomeThresholds.value,
    );
  });

  it("has the new $32,500 concessional contributions cap, up from $30,000", () => {
    expect(config.superGuarantee.concessionalContributionsCap.value).toBe(32_500);
  });

  it("has the standard work-related deduction as config-only data, $1,000", () => {
    expect(config.standardWorkRelatedDeduction?.amount.value).toBe(1_000);
    expect(config.standardWorkRelatedDeduction?.eligibilityNote).toMatch(/employment|labour/i);
  });

  it("has no standardWorkRelatedDeduction field on the earlier FY2025-26 config", () => {
    expect(fy2025_26.standardWorkRelatedDeduction).toBeUndefined();
  });
});

describe("calculateIncomeTax against fy2026-27 (bracket rate cut applied)", () => {
  it("golden file: $100,000 taxable income reflects the 16% -> 15% second-bracket cut", () => {
    // Hand-computed independently before running: bracket tax = $0 (0-18,200) + $4,020
    // (15% of $26,800, down from $4,288 at 16%) + $16,500 (30% of $55,000) = $20,520 gross
    // tax. LITO $0 (income above the $66,667 second-taper upper threshold). Medicare levy 2%
    // of $100,000 = $2,000 (income above the upper shade-in threshold). Net tax = $20,520 +
    // $2,000 = $22,520 - exactly $268 less than FY2025-26's $22,788 golden file at the same
    // income (26,800 * (0.16 - 0.15) = $268), which is the entire size of the rate cut at
    // this income level since every other bracket is unchanged.
    const result = calculateIncomeTax(100_000, config);
    expect(result.grossTax).toBe(20_520);
    expect(result.litoOffset).toBe(0);
    expect(result.medicareLevy).toBe(2_000);
    expect(result.netTax).toBe(22_520);
    expect(result.financialYear).toBe("2026-27");
  });

  it("boundary: $18,201 is taxed at 15%, not the old 16%", () => {
    const result = calculateIncomeTax(18_201, config);
    expect(result.grossTax).toBeCloseTo(0.15, 2);
  });
});

describe("calculateHelpRepayment against fy2026-27 (indexed thresholds)", () => {
  it("owes nothing at the new $69,528 minimum threshold", () => {
    expect(calculateHelpRepayment(69_528, config).repaymentAmount).toBe(0);
  });

  it("owes 15c on the first dollar over the new threshold", () => {
    const result = calculateHelpRepayment(69_529, config);
    expect(result.repaymentAmount).toBeCloseTo(0.15, 2);
  });

  it("golden file: $150,000 repayment income, marginal (not capped)", () => {
    // Hand-computed independently: band 1 (69,528-129,717, $60,189 span) * 15% = $9,028.35;
    // band 2 (129,717-150,000, $20,283 span) * 17% = $3,448.11. Marginal total =
    // $9,028.35 + $3,448.11 = $12,476.46. Flat 10% cap = $15,000. The marginal amount is
    // lower, so it applies, uncapped.
    const result = calculateHelpRepayment(150_000, config);
    expect(result.repaymentAmount).toBeCloseTo(12_476.46, 2);
    expect(result.isCapApplied).toBe(false);
  });

  it("golden file: $200,000 is well past the cap threshold, same as FY2025-26's equivalent case", () => {
    // Marginal formula: (200,000 - 129,717) * 0.17 + 9,028.35 = 11,948.11 + 9,028.35 =
    // $20,976.46. Flat 10% cap = $20,000, which is lower and applies instead.
    const result = calculateHelpRepayment(200_000, config);
    expect(result.repaymentAmount).toBe(20_000);
    expect(result.isCapApplied).toBe(true);
  });
});

describe("calculateDiv293 against fy2026-27 (new $32,500 concessional cap)", () => {
  it("golden file: reproduces the independently-reported $4,875 maximum Division 293 bill", () => {
    // Hand-computed independently: div293Income $300,000 + concessional contributions
    // $33,000 (chosen to exceed both the old $30,000 and new $32,500 caps, so this test
    // actually exercises the new cap rather than being satisfied by either). combinedIncome
    // = $333,000; amountOverThreshold = $333,000 - $250,000 = $83,000. lowTaxContributions
    // = min($33,000, $32,500 cap) = $32,500 (would have been $30,000 under the old cap).
    // div293TaxableAmount = min($83,000, $32,500) = $32,500. additionalTax = $32,500 * 15% =
    // $4,875 - independently cross-checked against a secondary source's own statement that
    // "the concessional cap rose to $32,500 ... lifting the maximum Division 293 bill to
    // $4,875" (a fully-capped concessional contribution is the maximum single-contribution
    // Division 293 exposure at this cap).
    const result = calculateDiv293(
      { div293Income: 300_000, concessionalContributions: 33_000 },
      config,
    );
    expect(result.lowTaxContributions).toBe(32_500);
    expect(result.div293TaxableAmount).toBe(32_500);
    expect(result.additionalTax).toBe(4_875);
  });
});
