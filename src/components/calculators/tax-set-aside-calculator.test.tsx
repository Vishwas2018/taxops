import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TaxSetAsideCalculator } from "./tax-set-aside-calculator";

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  values: { dayRate?: string; daysPerWeek?: string; weeksPerYear?: string },
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
  if (values.weeksPerYear !== undefined) {
    const input = screen.getByLabelText(/weeks worked per year/i);
    await user.clear(input);
    await user.type(input, values.weeksPerYear);
  }
  await user.click(screen.getByRole("button", { name: /calculate/i }));
}

describe("TaxSetAsideCalculator", () => {
  it("defaults weeksPerYear to 46 and shows the estimate placeholder before submission", () => {
    render(<TaxSetAsideCalculator />);
    expect(screen.getByLabelText(/weeks worked per year/i)).toHaveValue(46);
    expect(
      screen.getByText(/select calculate to see your suggested tax set-aside/i),
    ).toBeInTheDocument();
  });

  it("rejects a zero day rate", async () => {
    const user = userEvent.setup();
    render(<TaxSetAsideCalculator />);
    await fillAndSubmit(user, { dayRate: "0" });
    expect(await screen.findByRole("alert")).toHaveTextContent(/greater than zero/i);
  });

  it("rejects more than 7 billable days per week", async () => {
    const user = userEvent.setup();
    render(<TaxSetAsideCalculator />);
    await fillAndSubmit(user, { daysPerWeek: "8" });
    expect(await screen.findByRole("alert")).toHaveTextContent(/cannot exceed 7 days/i);
  });

  it("integration: wires the form through the engine to a rendered breakdown, defaulting to FY2026-27", async () => {
    // Same inputs as fy2026-27.test.ts's $100,000 golden scenario: $500/day, 4 days/week,
    // 50 weeks/year. Independently recomputed for FY2026-27's 15% (not FY2025-26's 16%)
    // second bracket: $0 (0-18,200) + $4,020 (15% of $26,800) + $16,500 (30% of $55,000) =
    // $20,520 gross tax; LITO $0; Medicare 2% of $100,000 = $2,000; net tax $22,520 - exactly
    // $268 less than FY2025-26's $22,788 golden file at the same income. With no HELP debt,
    // the suggested set-aside total equals income tax exactly, so both figures render as
    // "$22,520" - hence asserting two matches, not one.
    const user = userEvent.setup();
    render(<TaxSetAsideCalculator />);
    await fillAndSubmit(user, { dayRate: "500", daysPerWeek: "4", weeksPerYear: "50" });

    expect(await screen.findAllByText("$22,520")).toHaveLength(2);
    expect(screen.getByText(/FY2026-27/)).toBeInTheDocument();
    expect(screen.queryByText(/estimated help\/stsl repayment/i)).not.toBeInTheDocument();
    expect(screen.getByText(/not registered/i)).toBeInTheDocument();
  });

  it("integration: includes a HELP repayment line when the HELP toggle is checked", async () => {
    const user = userEvent.setup();
    render(<TaxSetAsideCalculator />);
    await fillAndSubmit(user, { dayRate: "500", daysPerWeek: "4", weeksPerYear: "50" });
    await user.click(screen.getByRole("checkbox", { name: /help\/stsl debt/i }));
    await user.click(screen.getByRole("button", { name: /calculate/i }));

    expect(await screen.findByText(/estimated help\/stsl repayment/i)).toBeInTheDocument();
  });

  it("integration: shows the GST-collected framing when GST-registered is checked", async () => {
    const user = userEvent.setup();
    render(<TaxSetAsideCalculator />);
    await fillAndSubmit(user, { dayRate: "500", daysPerWeek: "4", weeksPerYear: "50" });
    await user.click(screen.getByRole("checkbox", { name: /registered for gst/i }));
    await user.click(screen.getByRole("button", { name: /calculate/i }));

    expect(await screen.findByText(/gst collected/i)).toBeInTheDocument();
    expect(screen.getByText(/remitted via your activity statement/i)).toBeInTheDocument();
    // $100,000 gross * 10% = $10,000 GST.
    expect(screen.getByText("$10,000")).toBeInTheDocument();
  });

  it("integration: flags being at or above the $75,000 GST registration threshold", async () => {
    const user = userEvent.setup();
    render(<TaxSetAsideCalculator />);
    await fillAndSubmit(user, { dayRate: "500", daysPerWeek: "4", weeksPerYear: "50" });

    expect(
      await screen.findByText(/at or above the ato.*\$75,000 mandatory gst registration/i),
    ).toBeInTheDocument();
  });
});
