import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { STANDARD_DISCLAIMER } from "@/lib/disclaimers";
import { calculatePropertyCashFlow } from "@/lib/calculators/property-cash-flow";
import { fy2025_26 } from "@/lib/tax-config/fy2025-26";
import { PropertyCashFlowResults } from "./property-cash-flow-results";

describe("PropertyCashFlowResults", () => {
  it("renders the standard disclaimer alongside the results", () => {
    const data = calculatePropertyCashFlow(
      {
        annualRentalIncome: 20_000,
        annualExpenses: 5_000,
        annualLoanInterest: 12_000,
        annualDepreciation: 6_000,
        marginalTaxRate: 0.37,
      },
      fy2025_26,
    );
    render(<PropertyCashFlowResults data={data} />);
    expect(screen.getByText(STANDARD_DISCLAIMER)).toBeInTheDocument();
  });

  it("states the CGT/land tax/borrowing-cost exclusions explicitly, not buried", () => {
    const data = calculatePropertyCashFlow(
      {
        annualRentalIncome: 20_000,
        annualExpenses: 5_000,
        annualLoanInterest: 12_000,
        annualDepreciation: 6_000,
        marginalTaxRate: 0.37,
      },
      fy2025_26,
    );
    render(<PropertyCashFlowResults data={data} />);
    expect(screen.getByText(/this estimate does not include/i)).toBeInTheDocument();
    expect(screen.getByText("Capital gains tax on sale")).toBeInTheDocument();
    expect(screen.getByText("Land tax")).toBeInTheDocument();
    expect(screen.getByText("Borrowing-cost amortization")).toBeInTheDocument();
  });

  it("states the marginal-rate-unchanged assumption as an explicit exclusion", () => {
    const data = calculatePropertyCashFlow(
      {
        annualRentalIncome: 20_000,
        annualExpenses: 5_000,
        annualLoanInterest: 12_000,
        annualDepreciation: 6_000,
        marginalTaxRate: 0.37,
      },
      fy2025_26,
    );
    render(<PropertyCashFlowResults data={data} />);
    expect(
      screen.getByText(/assumes your marginal tax rate stays unchanged by this property.s income or loss/i),
    ).toBeInTheDocument();
  });

  it("states the 2026 Budget reform status note: current law only, changes not yet in effect", () => {
    // Day 13 Part A: the engine still models current law only (no logic change) - this is a
    // copy-only addition alongside the existing exclusions list, flagging that announced
    // negative gearing/CGT changes (Treasury Laws Amendment (Tax Reform No. 1) Act 2026) don't
    // apply to this estimate yet.
    const data = calculatePropertyCashFlow(
      {
        annualRentalIncome: 20_000,
        annualExpenses: 5_000,
        annualLoanInterest: 12_000,
        annualDepreciation: 6_000,
        marginalTaxRate: 0.37,
      },
      fy2025_26,
    );
    render(<PropertyCashFlowResults data={data} />);
    // The lead-in ("2026 Budget reform:") is its own bolded <span> inside the paragraph, so a
    // plain getByText would match both the span and its parent - query by the paragraph's
    // data-state attribute instead and assert on its assembled textContent.
    const note = screen.getByText((_, element) => element?.getAttribute("data-state") === "reform-status-note");
    expect(note.textContent).toMatch(/2026 budget reform/i);
    expect(note.textContent).toMatch(/models current law only/i);
    expect(note.textContent).toMatch(/12 may 2026/i);
    expect(note.textContent).toMatch(/1 july 2027/i);
    expect(note.textContent).toMatch(/grandfathered/i);
  });

  it("renders a negatively-geared loss clearly and correctly, not as a misleading positive", () => {
    // Loss of $3,000 (rent $20k - expenses $5k - interest $12k - depreciation $6k = -$3k).
    // Pre-tax cash flow (excludes depreciation) is +$3,000, so this also proves the panel
    // doesn't just show one number - the loss and the cash position differ meaningfully.
    const data = calculatePropertyCashFlow(
      {
        annualRentalIncome: 20_000,
        annualExpenses: 5_000,
        annualLoanInterest: 12_000,
        annualDepreciation: 6_000,
        marginalTaxRate: 0.37,
      },
      fy2025_26,
    );
    render(<PropertyCashFlowResults data={data} />);
    expect(screen.getByText(/negatively geared/i)).toBeInTheDocument();
    expect(screen.getByText(/loss of \$3,000/)).toBeInTheDocument();
    expect(screen.getByText("$3,000")).toBeInTheDocument(); // pre-tax cash flow, annual
    expect(screen.getByText("$1,110")).toBeInTheDocument(); // tax effect, annual
    expect(screen.getByText("$4,110")).toBeInTheDocument(); // after-tax cash flow, annual
  });

  it("regression: an exact-zero result renders $0, never -$0, annually or per week", () => {
    // rent === expenses + interest + depreciation exactly, with a non-zero marginal rate -
    // taxEffect's raw computation is -(0) * rate, which is JS negative zero before rounding.
    const data = calculatePropertyCashFlow(
      {
        annualRentalIncome: 10_400,
        annualExpenses: 10_400,
        annualLoanInterest: 0,
        annualDepreciation: 0,
        marginalTaxRate: 0.3,
      },
      fy2025_26,
    );
    expect(data.taxEffect).toBe(0); // engine-level fix already covers this
    expect(Object.is(data.taxEffect, -0)).toBe(false);

    render(<PropertyCashFlowResults data={data} />);
    expect(screen.queryByText(/-\$0/)).not.toBeInTheDocument();
    expect(screen.getAllByText("$0").length).toBeGreaterThan(0);
  });
});
