import { describe, expect, it } from "vitest";
import { fy2025_26 } from "@/lib/tax-config/fy2025-26";
import { fy2026_27 } from "@/lib/tax-config/fy2026-27";
import { calculateSetAside } from "./tax-set-aside";

const config = fy2025_26;

describe("calculateSetAside", () => {
  it("throws on a negative day rate", () => {
    expect(() =>
      calculateSetAside(
        { dayRate: -1, daysPerWeek: 4, weeksPerYear: 46, gstRegistered: false, hasHelpDebt: false },
        config,
      ),
    ).toThrow();
  });

  it("throws on negative days per week", () => {
    expect(() =>
      calculateSetAside(
        { dayRate: 800, daysPerWeek: -1, weeksPerYear: 46, gstRegistered: false, hasHelpDebt: false },
        config,
      ),
    ).toThrow();
  });

  it("throws on negative weeks per year", () => {
    expect(() =>
      calculateSetAside(
        { dayRate: 800, daysPerWeek: 4, weeksPerYear: -1, gstRegistered: false, hasHelpDebt: false },
        config,
      ),
    ).toThrow();
  });

  it("does not divide by zero when weeksPerYear is exactly zero", () => {
    const result = calculateSetAside(
      { dayRate: 800, daysPerWeek: 4, weeksPerYear: 0, gstRegistered: false, hasHelpDebt: false },
      config,
    );
    expect(result.grossIncome).toBe(0);
    expect(result.setAsidePerInvoiceWeek).toBe(0);
  });

  it("returns all zeros for a zero day rate", () => {
    const result = calculateSetAside(
      { dayRate: 0, daysPerWeek: 4, weeksPerYear: 46, gstRegistered: true, hasHelpDebt: true },
      config,
    );
    expect(result.grossIncome).toBe(0);
    expect(result.totalSetAside).toBe(0);
    expect(result.setAsidePerInvoiceWeek).toBe(0);
    expect(result.setAsidePercentOfGross).toBe(0);
    expect(result.gst.collected).toBe(0);
    expect(result.gst.aboveRegistrationThreshold).toBe(false);
  });

  it("golden file: $100,000 gross, no HELP debt, not GST-registered", () => {
    // dayRate 500 * 4 days/week * 50 weeks = $100,000 gross - reuses income-tax.test.ts's
    // $100,000 golden file: netTax $22,788.
    const result = calculateSetAside(
      { dayRate: 500, daysPerWeek: 4, weeksPerYear: 50, gstRegistered: false, hasHelpDebt: false },
      config,
    );
    expect(result.grossIncome).toBe(100_000);
    expect(result.incomeTax.netTax).toBe(22_788);
    expect(result.help).toBeNull();
    expect(result.totalSetAside).toBe(22_788);
    expect(result.setAsidePerInvoiceWeek).toBeCloseTo(455.76, 2);
    expect(result.setAsidePercentOfGross).toBeCloseTo(0.22788, 5);
    expect(result.gst.isRegistered).toBe(false);
    expect(result.gst.collected).toBe(0);
    expect(result.gst.aboveRegistrationThreshold).toBe(true);
    expect(result.financialYear).toBe("2025-26");
    expect(result.isEstimate).toBe(true);
  });

  it("golden file: $200,000 gross, high income, HELP debt, GST-registered", () => {
    // dayRate 1000 * 4 days/week * 50 weeks = $200,000 gross.
    // Income tax (hand-computed against the bracket table): $0 (0-18,200) + $4,288 (16% of
    // $26,800) + $27,000 (30% of $90,000) + $20,350 (37% of $55,000) + $4,500 (45% of
    // $10,000) = $56,138 gross tax; LITO $0 (income far above the second-taper upper
    // threshold); Medicare 2% of $200,000 = $4,000 (above the upper shade-in threshold);
    // net tax = $56,138 + $4,000 = $60,138.
    // HELP repayment reuses help-repayment.test.ts's $200,000 golden file: capped at flat
    // 10% = $20,000 (marginal formula would give more).
    // totalSetAside = $60,138 + $20,000 = $80,138.
    const result = calculateSetAside(
      { dayRate: 1000, daysPerWeek: 4, weeksPerYear: 50, gstRegistered: true, hasHelpDebt: true },
      config,
    );
    expect(result.grossIncome).toBe(200_000);
    expect(result.incomeTax.netTax).toBe(60_138);
    expect(result.help?.repaymentAmount).toBe(20_000);
    expect(result.help?.isCapApplied).toBe(true);
    expect(result.totalSetAside).toBe(80_138);
    expect(result.setAsidePerInvoiceWeek).toBeCloseTo(1602.76, 2);
    expect(result.setAsidePercentOfGross).toBeCloseTo(0.40069, 5);
    expect(result.gst.isRegistered).toBe(true);
    expect(result.gst.collected).toBe(20_000);
    expect(result.gst.aboveRegistrationThreshold).toBe(true);
  });

  describe("straddling the $75,000 GST registration threshold", () => {
    it("one cent below the threshold is not required to register", () => {
      const result = calculateSetAside(
        { dayRate: 74_999.99, daysPerWeek: 1, weeksPerYear: 1, gstRegistered: false, hasHelpDebt: false },
        config,
      );
      expect(result.grossIncome).toBe(74_999.99);
      expect(result.gst.aboveRegistrationThreshold).toBe(false);
    });

    it("exactly at the threshold is required to register", () => {
      const result = calculateSetAside(
        { dayRate: 75_000, daysPerWeek: 1, weeksPerYear: 1, gstRegistered: false, hasHelpDebt: false },
        config,
      );
      expect(result.grossIncome).toBe(75_000);
      expect(result.gst.aboveRegistrationThreshold).toBe(true);
      expect(result.gst.registrationThreshold).toBe(75_000);
    });

    it("one cent above the threshold is required to register", () => {
      const result = calculateSetAside(
        { dayRate: 75_000.01, daysPerWeek: 1, weeksPerYear: 1, gstRegistered: false, hasHelpDebt: false },
        config,
      );
      expect(result.grossIncome).toBe(75_000.01);
      expect(result.gst.aboveRegistrationThreshold).toBe(true);
    });

    it("aboveRegistrationThreshold is independent of the isRegistered toggle", () => {
      // Voluntarily GST-registered well below the mandatory threshold - the ATO permits this,
      // and the calculator should still collect/show GST without flagging a compliance issue.
      const result = calculateSetAside(
        { dayRate: 200, daysPerWeek: 2, weeksPerYear: 46, gstRegistered: true, hasHelpDebt: false },
        config,
      );
      expect(result.grossIncome).toBe(18_400);
      expect(result.gst.isRegistered).toBe(true);
      expect(result.gst.collected).toBeCloseTo(1_840, 2);
      expect(result.gst.aboveRegistrationThreshold).toBe(false);
    });
  });

  it("GST collected is 10% of gross income when registered, zero otherwise", () => {
    const registered = calculateSetAside(
      { dayRate: 800, daysPerWeek: 4, weeksPerYear: 46, gstRegistered: true, hasHelpDebt: false },
      config,
    );
    const notRegistered = calculateSetAside(
      { dayRate: 800, daysPerWeek: 4, weeksPerYear: 46, gstRegistered: false, hasHelpDebt: false },
      config,
    );
    expect(registered.gst.collected).toBeCloseTo(registered.grossIncome * 0.1, 2);
    expect(notRegistered.gst.collected).toBe(0);
    // GST never affects the tax set-aside itself - only the `gst` field should differ.
    expect(registered.totalSetAside).toBe(notRegistered.totalSetAside);
  });

  it("does not include HELP repayment in totalSetAside when hasHelpDebt is false", () => {
    const result = calculateSetAside(
      { dayRate: 800, daysPerWeek: 4, weeksPerYear: 46, gstRegistered: false, hasHelpDebt: false },
      config,
    );
    expect(result.help).toBeNull();
    expect(result.totalSetAside).toBe(result.incomeTax.netTax);
  });
});

describe("calculateSetAside against fy2026-27 (second-bracket rate cut applied)", () => {
  // tax-set-aside is a forward-looking calculator defaulting to FY2026-27 (see
  // docs/updating-tax-data.md) - these golden values are independently recomputed for
  // FY2026-27's config, not ported from the FY2025-26 golden files above, per the Day 14
  // golden-file discipline this project follows.
  it("golden file: $100,000 gross, no HELP debt, not GST-registered", () => {
    // dayRate 500 * 4 days/week * 50 weeks = $100,000 gross. Income tax (hand-computed
    // against fy2026-27's 15% second bracket): $0 (0-18,200) + $4,020 (15% of $26,800) +
    // $16,500 (30% of $55,000) = $20,520 gross tax; LITO $0 (income above the second-taper
    // upper threshold); Medicare 2% of $100,000 = $2,000; net tax = $22,520 - exactly $268
    // less than fy2025-26's $22,788 golden file above at the same income.
    const result = calculateSetAside(
      { dayRate: 500, daysPerWeek: 4, weeksPerYear: 50, gstRegistered: false, hasHelpDebt: false },
      fy2026_27,
    );
    expect(result.grossIncome).toBe(100_000);
    expect(result.incomeTax.netTax).toBe(22_520);
    expect(result.help).toBeNull();
    expect(result.totalSetAside).toBe(22_520);
    expect(result.setAsidePerInvoiceWeek).toBeCloseTo(450.4, 2);
    expect(result.setAsidePercentOfGross).toBeCloseTo(0.2252, 5);
    expect(result.gst.isRegistered).toBe(false);
    expect(result.gst.collected).toBe(0);
    expect(result.gst.aboveRegistrationThreshold).toBe(true);
    expect(result.financialYear).toBe("2026-27");
    expect(result.isEstimate).toBe(true);
  });

  it("golden file: $200,000 gross, high income, HELP debt, GST-registered", () => {
    // dayRate 1000 * 4 days/week * 50 weeks = $200,000 gross. Income tax (hand-computed
    // against fy2026-27's 15% second bracket): $0 (0-18,200) + $4,020 (15% of $26,800) +
    // $27,000 (30% of $90,000) + $20,350 (37% of $55,000) + $4,500 (45% of $10,000) = $55,870
    // gross tax; LITO $0; Medicare 2% of $200,000 = $4,000; net tax = $59,870. HELP repayment
    // at $200,000 repayment income is well past fy2026-27's cap threshold ($186,050, same as
    // fy2025-26.test.ts's cap-threshold cross-check in help-repayment.test.ts, since the cap
    // threshold/rate are unchanged), so it's capped at a flat 10% = $20,000 regardless of the
    // bracket cut, which only affects the marginal formula this cap replaces. totalSetAside =
    // $59,870 + $20,000 = $79,870.
    const result = calculateSetAside(
      { dayRate: 1000, daysPerWeek: 4, weeksPerYear: 50, gstRegistered: true, hasHelpDebt: true },
      fy2026_27,
    );
    expect(result.grossIncome).toBe(200_000);
    expect(result.incomeTax.netTax).toBe(59_870);
    expect(result.help?.repaymentAmount).toBe(20_000);
    expect(result.help?.isCapApplied).toBe(true);
    expect(result.totalSetAside).toBe(79_870);
    expect(result.setAsidePerInvoiceWeek).toBeCloseTo(1597.4, 2);
    expect(result.setAsidePercentOfGross).toBeCloseTo(0.39935, 5);
    expect(result.gst.isRegistered).toBe(true);
    expect(result.gst.collected).toBe(20_000);
    expect(result.gst.aboveRegistrationThreshold).toBe(true);
  });

  describe("straddling the $75,000 GST registration threshold (unchanged from FY2025-26)", () => {
    it("one cent below the threshold is not required to register", () => {
      const result = calculateSetAside(
        {
          dayRate: 74_999.99,
          daysPerWeek: 1,
          weeksPerYear: 1,
          gstRegistered: false,
          hasHelpDebt: false,
        },
        fy2026_27,
      );
      expect(result.gst.aboveRegistrationThreshold).toBe(false);
    });

    it("exactly at the threshold is required to register", () => {
      const result = calculateSetAside(
        { dayRate: 75_000, daysPerWeek: 1, weeksPerYear: 1, gstRegistered: false, hasHelpDebt: false },
        fy2026_27,
      );
      expect(result.gst.aboveRegistrationThreshold).toBe(true);
      expect(result.gst.registrationThreshold).toBe(75_000);
    });

    it("one cent above the threshold is required to register", () => {
      const result = calculateSetAside(
        {
          dayRate: 75_000.01,
          daysPerWeek: 1,
          weeksPerYear: 1,
          gstRegistered: false,
          hasHelpDebt: false,
        },
        fy2026_27,
      );
      expect(result.gst.aboveRegistrationThreshold).toBe(true);
    });
  });
});
