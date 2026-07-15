import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Div293Calculator } from "./div-293-calculator";

async function setField(user: ReturnType<typeof userEvent.setup>, label: RegExp, value: string) {
  const input = screen.getByLabelText(label);
  await user.clear(input);
  await user.type(input, value);
}

function resultsRegion() {
  return screen.getByRole("region", { name: /calculator results/i });
}

describe("Div293Calculator", () => {
  it("rejects a negative Division 293 income", async () => {
    const user = userEvent.setup();
    render(<Div293Calculator />);
    await setField(user, /income for division 293 purposes/i, "-1");
    await user.click(screen.getByRole("button", { name: /calculate/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/cannot be negative/i);
  });

  it("rejects a negative concessional contributions figure", async () => {
    const user = userEvent.setup();
    render(<Div293Calculator />);
    await setField(user, /concessional.*contributions/i, "-1");
    await user.click(screen.getByRole("button", { name: /calculate/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/cannot be negative/i);
  });

  it("defaults the financial year selector to FY2026-27", () => {
    render(<Div293Calculator />);
    const select = screen.getByLabelText(/financial year/i) as HTMLSelectElement;
    expect(select.value).toBe("2026-27");
  });

  it("integration: wires the form through the engine to a rendered breakdown, defaulting to FY2026-27", async () => {
    // Default values ($240,000 / $25,000) reproduce the same $2,250 additional tax on both
    // FY2025-26 and FY2026-27 - $25,000 in contributions sits below both years' concessional
    // cap ($30,000 and $32,500), so lowTaxContributions is $25,000 either way: combined income
    // $265,000, $15,000 over the $250,000 threshold, min($15,000, $25,000) * 15% = $2,250.
    const user = userEvent.setup();
    render(<Div293Calculator />);
    await user.click(screen.getByRole("button", { name: /calculate/i }));

    expect(await screen.findByText("$2,250")).toBeInTheDocument();
    expect(screen.getByText("$265,000")).toBeInTheDocument();
    expect(screen.getByText("$15,000")).toBeInTheDocument();
    expect(within(resultsRegion()).getByText(/FY2026-27/)).toBeInTheDocument();
  });

  it("integration: switching the FY selector to FY2025-26 swaps the config, badge, and results", async () => {
    // $33,000 in contributions exceeds both years' concessional cap, so this scenario actually
    // exercises the cap difference (unlike the default-values case above). FY2026-27: cap
    // $32,500 (independently computed in fy2026-27.test.ts) -> combinedIncome $333,000,
    // amountOverThreshold $83,000, lowTaxContributions min($33,000, $32,500) = $32,500,
    // div293TaxableAmount min($83,000, $32,500) = $32,500, additionalTax $32,500 * 15% =
    // $4,875. FY2025-26: cap $30,000 -> lowTaxContributions $30,000, div293TaxableAmount
    // min($83,000, $30,000) = $30,000, additionalTax $30,000 * 15% = $4,500.
    const user = userEvent.setup();
    render(<Div293Calculator />);
    await setField(user, /income for division 293 purposes/i, "300000");
    await setField(user, /concessional.*contributions/i, "33000");
    await user.click(screen.getByRole("button", { name: /calculate/i }));

    expect(await screen.findByText("$4,875")).toBeInTheDocument();
    expect(within(resultsRegion()).getByText(/FY2026-27/)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/financial year/i), "2025-26");
    await user.click(screen.getByRole("button", { name: /calculate/i }));

    expect(await screen.findByText("$4,500")).toBeInTheDocument();
    expect(within(resultsRegion()).getByText(/FY2025-26/)).toBeInTheDocument();
    expect(screen.queryByText("$4,875")).not.toBeInTheDocument();
  });

  it("integration: straddle state renders when income alone is under the threshold but contributions push it over", async () => {
    const user = userEvent.setup();
    render(<Div293Calculator />);
    await setField(user, /income for division 293 purposes/i, "230000");
    await setField(user, /concessional.*contributions/i, "25000");
    await user.click(screen.getByRole("button", { name: /calculate/i }));

    expect(await screen.findByText(/adding your concessional contributions/i)).toBeInTheDocument();
  });
});
