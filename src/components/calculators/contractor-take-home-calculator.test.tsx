import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ContractorTakeHomeCalculator } from "./contractor-take-home-calculator";

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

  it("integration: wires the form through the engines to a rendered breakdown", async () => {
    // Same inputs as contractor-take-home.test.ts's exclusive-super golden file: $800/day,
    // 4 days/week, 48 weeks/year, exclusive super -> net take-home of $112,358.
    const user = userEvent.setup();
    render(<ContractorTakeHomeCalculator />);
    await fillAndSubmit(user, { dayRate: "800", daysPerWeek: "4", weeksWorkedPerYear: "48" });

    expect(await screen.findByText("$112,358")).toBeInTheDocument();
    expect(screen.getByText(/FY2025-26/)).toBeInTheDocument();
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
});
