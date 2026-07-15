import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ContractorTakeHomeCalculator } from "./contractor-take-home-calculator";

function resultsRegion() {
  return screen.getByRole("region", { name: /calculator results/i });
}

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  values: { dayRate?: string; daysPerWeek?: string; weeksWorkedPerYear?: string },
) {
  if (values.dayRate !== undefined) {
    const input = screen.getByLabelText(/day rate/i);
    await user.clear(input);
    await user.type(input, values.dayRate);
  }
  if (values.daysPerWeek !== undefined) {
    const input = screen.getByLabelText(/billable days per week/i);
    await user.clear(input);
    await user.type(input, values.daysPerWeek);
  }
  if (values.weeksWorkedPerYear !== undefined) {
    const input = screen.getByLabelText(/weeks worked per year/i);
    await user.clear(input);
    await user.type(input, values.weeksWorkedPerYear);
  }
  await user.click(screen.getByRole("button", { name: /calculate/i }));
}

describe("ContractorTakeHomeCalculator", () => {
  it("defaults weeksWorkedPerYear to 46 and shows the estimate placeholder before submission", () => {
    render(<ContractorTakeHomeCalculator />);
    expect(screen.getByLabelText(/weeks worked per year/i)).toHaveValue(46);
    expect(screen.getByText(/select calculate to see your estimated take-home pay/i)).toBeInTheDocument();
  });

  it("rejects a zero day rate", async () => {
    const user = userEvent.setup();
    render(<ContractorTakeHomeCalculator />);
    await fillAndSubmit(user, { dayRate: "0" });
    expect(await screen.findByRole("alert")).toHaveTextContent(/greater than zero/i);
  });

  it("rejects more than 7 billable days per week", async () => {
    const user = userEvent.setup();
    render(<ContractorTakeHomeCalculator />);
    await fillAndSubmit(user, { daysPerWeek: "8" });
    expect(await screen.findByRole("alert")).toHaveTextContent(/cannot exceed 7 days/i);
  });

  it("rejects more than 52 weeks worked per year", async () => {
    const user = userEvent.setup();
    render(<ContractorTakeHomeCalculator />);
    await fillAndSubmit(user, { weeksWorkedPerYear: "53" });
    expect(await screen.findByRole("alert")).toHaveTextContent(/cannot exceed 52 weeks/i);
  });

  it("defaults the financial year selector to FY2026-27", () => {
    render(<ContractorTakeHomeCalculator />);
    const select = screen.getByLabelText(/financial year/i) as HTMLSelectElement;
    expect(select.value).toBe("2026-27");
  });

  it("integration: wires the form through the engines to a rendered breakdown, defaulting to FY2026-27", async () => {
    // Same inputs as fy2026-27.test.ts's second-bracket-cut golden file scenario: $800/day,
    // 4 days/week, 48 weeks/year, exclusive super. Independently recomputed for FY2026-27's
    // 15% (not FY2025-26's 16%) second bracket: gross income $153,600 assessable; gross tax
    // = $4,020 (15% of $26,800) + $27,000 (30% of $90,000) + $6,882 (37% of $18,600) =
    // $37,902; Medicare 2% of $153,600 = $3,072; net tax $40,974; net take-home =
    // $153,600 - $40,974 = $112,626 - exactly $268 more than FY2025-26's $112,358 golden file
    // at the same inputs (26,800 * (0.16 - 0.15) = $268, the entire size of the rate cut here).
    const user = userEvent.setup();
    render(<ContractorTakeHomeCalculator />);
    await fillAndSubmit(user, { dayRate: "800", daysPerWeek: "4", weeksWorkedPerYear: "48" });

    expect(await screen.findByText("$112,626")).toBeInTheDocument();
    expect(within(resultsRegion()).getByText(/FY2026-27/)).toBeInTheDocument();
    expect(screen.queryByText(/HELP\/STSL repayment/)).not.toBeInTheDocument();
  });

  it("integration: includes a HELP repayment line when the HELP toggle is checked", async () => {
    const user = userEvent.setup();
    render(<ContractorTakeHomeCalculator />);
    await fillAndSubmit(user, { dayRate: "800", daysPerWeek: "4", weeksWorkedPerYear: "48" });
    await user.click(screen.getByRole("checkbox", { name: /help\/stsl debt/i }));
    await user.click(screen.getByRole("button", { name: /calculate/i }));

    expect(await screen.findByText(/HELP\/STSL repayment/)).toBeInTheDocument();
  });

  it("integration: switching the FY selector to FY2025-26 swaps the config, badge, and results", async () => {
    // Reuses contractor-take-home.test.ts's own FY2025-26 golden file at these exact inputs
    // ($800/day, 4 days/week, 48 weeks/year, exclusive super -> $112,358 net take-home) as the
    // independent check that the selector actually swaps the engine's config, not just a label.
    const user = userEvent.setup();
    render(<ContractorTakeHomeCalculator />);
    await fillAndSubmit(user, { dayRate: "800", daysPerWeek: "4", weeksWorkedPerYear: "48" });
    expect(await screen.findByText("$112,626")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/financial year/i), "2025-26");
    await user.click(screen.getByRole("button", { name: /calculate/i }));

    expect(await screen.findByText("$112,358")).toBeInTheDocument();
    expect(within(resultsRegion()).getByText(/FY2025-26/)).toBeInTheDocument();
    expect(screen.queryByText("$112,626")).not.toBeInTheDocument();
  });
});
