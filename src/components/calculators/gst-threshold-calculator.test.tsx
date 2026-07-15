import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { GstThresholdCalculator } from "./gst-threshold-calculator";

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  values: { dayRate?: string; daysPerWeek?: string; weeksWorkedPerYear?: string; weeksAlreadyWorkedThisFY?: string },
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
  if (values.weeksAlreadyWorkedThisFY !== undefined) {
    const input = screen.getByLabelText(/weeks already worked this financial year/i);
    await user.clear(input);
    await user.type(input, values.weeksAlreadyWorkedThisFY);
  }
  await user.click(screen.getByRole("button", { name: /calculate/i }));
}

describe("GstThresholdCalculator", () => {
  it("defaults weeksWorkedPerYear to 46 and shows the estimate placeholder before submission", () => {
    render(<GstThresholdCalculator />);
    expect(screen.getByLabelText(/weeks worked per year/i)).toHaveValue(46);
    expect(screen.getByLabelText(/weeks already worked this financial year/i)).toHaveValue(0);
    expect(
      screen.getByText(/select calculate to see your projected gst turnover/i),
    ).toBeInTheDocument();
  });

  it("rejects a zero day rate", async () => {
    const user = userEvent.setup();
    render(<GstThresholdCalculator />);
    await fillAndSubmit(user, { dayRate: "0" });
    expect(await screen.findByRole("alert")).toHaveTextContent(/greater than zero/i);
  });

  it("rejects more than 7 billable days per week", async () => {
    const user = userEvent.setup();
    render(<GstThresholdCalculator />);
    await fillAndSubmit(user, { daysPerWeek: "8" });
    expect(await screen.findByRole("alert")).toHaveTextContent(/cannot exceed 7 days/i);
  });

  it("integration: a below-threshold projection shows the optional-registration framing, defaulting to FY2026-27", async () => {
    // Same inputs as gst-threshold.test.ts's well-below golden file: $400/day, 3 days/week,
    // 46 weeks/year -> $55,200 projected, $19,800 margin below the $75,000 threshold. The
    // $75,000 registration threshold is unchanged between FY2025-26 and FY2026-27, so these
    // dollar figures are identical either way - only the FY badge differs.
    const user = userEvent.setup();
    render(<GstThresholdCalculator />);
    await fillAndSubmit(user, { dayRate: "400", daysPerWeek: "3", weeksWorkedPerYear: "46" });

    expect(await screen.findByText("$55,200")).toBeInTheDocument();
    expect(screen.getByText(/stay below the threshold by about/i)).toBeInTheDocument();
    expect(screen.getByText("$19,800")).toBeInTheDocument();
    expect(screen.getByText(/isn.t mandatory/i)).toBeInTheDocument();
    expect(screen.getByText(/FY2026-27/)).toBeInTheDocument();
  });

  it("integration: a crossing projection shows the 21-day registration obligation framing, FY2026-27's crossing month", async () => {
    // Same inputs as gst-threshold.test.ts's exactly-$75k golden file: $500/day, 3 days/week,
    // 50 weeks/year -> crosses in week 50. Independently recomputed for FY2026-27 (1 July
    // 2026 start, one year later than FY2025-26's 1 July 2025): week 50 is 49 full weeks after
    // 1 July 2026 -> 9 June 2027 -> "June 2027", exactly one year after FY2025-26's "June 2026".
    const user = userEvent.setup();
    render(<GstThresholdCalculator />);
    await fillAndSubmit(user, { dayRate: "500", daysPerWeek: "3", weeksWorkedPerYear: "50" });

    expect(await screen.findByText(/projected to cross the threshold in week/i)).toBeInTheDocument();
    expect(screen.getByText(/june 2027/i)).toBeInTheDocument();
    expect(screen.getByText(/obligation to register for gst within/i)).toBeInTheDocument();
    expect(screen.getByText(/21 days/i)).toBeInTheDocument();
    expect(screen.getByText(/turnover.*not how much of that money is still sitting in a bank account/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ato.*registering for gst/i })).toHaveAttribute(
      "href",
      expect.stringContaining("ato.gov.au"),
    );
  });
});
