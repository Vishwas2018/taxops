import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PropertyCashFlowCalculator } from "./property-cash-flow-calculator";

async function setField(user: ReturnType<typeof userEvent.setup>, label: RegExp, value: string) {
  const input = screen.getByLabelText(label);
  await user.clear(input);
  await user.type(input, value);
}

describe("PropertyCashFlowCalculator", () => {
  it("rejects negative weekly rent", async () => {
    const user = userEvent.setup();
    render(<PropertyCashFlowCalculator />);
    await setField(user, /weekly rent/i, "-5");
    await user.click(screen.getByRole("button", { name: /calculate/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/cannot be negative/i);
  });

  it("rejects more than 52 vacancy weeks per year", async () => {
    const user = userEvent.setup();
    render(<PropertyCashFlowCalculator />);
    await setField(user, /vacancy weeks per year/i, "60");
    await user.click(screen.getByRole("button", { name: /calculate/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/cannot exceed 52 weeks/i);
  });

  it("integration: wires the form through the engine to a rendered breakdown, negatively geared", async () => {
    // Default form values: $550/week rent, 2 vacancy weeks (50 weeks let) = $27,500 rent;
    // expenses $2,500+$1,500+$2,200+$1,800 = $8,000; $22,000 interest; $6,000 depreciation;
    // 30% marginal rate. netRentalResult = 27,500 - 8,000 - 22,000 - 6,000 = -$8,500 (loss).
    // cashOnlyResult (excludes depreciation) = 27,500 - 8,000 - 22,000 = -$2,500.
    // taxEffect = -(-8,500) * 0.30 = $2,550. afterTaxCashFlow = -2,500 + 2,550 = $50.
    const user = userEvent.setup();
    render(<PropertyCashFlowCalculator />);
    await user.click(screen.getByRole("button", { name: /calculate/i }));

    expect(await screen.findByText("-$2,500")).toBeInTheDocument();
    expect(screen.getByText("$2,550")).toBeInTheDocument();
    expect(screen.getByText("$50")).toBeInTheDocument();
    expect(screen.getByText(/negatively geared/i)).toBeInTheDocument();
    expect(screen.getByText(/FY2025-26/)).toBeInTheDocument();
  });

  it("prefills the marginal rate from a profile-derived suggestion, labeled and still editable", async () => {
    const user = userEvent.setup();
    render(
      <PropertyCashFlowCalculator suggestedMarginalRate={0.37} incomeBandLabel="$100k–$190k" />,
    );

    const select = screen.getByLabelText(/your marginal tax rate/i) as HTMLSelectElement;
    expect(select.value).toBe("0.37");
    expect(screen.getByText(/defaulted from your tax profile/i)).toHaveTextContent(
      "$100k–$190k",
    );

    // Still a normal editable default, not a locked value.
    await user.selectOptions(select, "0.45");
    expect(select.value).toBe("0.45");
  });

  it("falls back to the static default marginal rate when no profile suggestion is given", () => {
    render(<PropertyCashFlowCalculator />);
    const select = screen.getByLabelText(/your marginal tax rate/i) as HTMLSelectElement;
    expect(select.value).toBe("0.3");
    expect(screen.queryByText(/defaulted from your tax profile/i)).not.toBeInTheDocument();
  });

  it("regression: a full-pipeline exact-zero scenario never shows -$0", async () => {
    const user = userEvent.setup();
    render(<PropertyCashFlowCalculator />);
    await setField(user, /weekly rent/i, "200");
    await setField(user, /vacancy weeks per year/i, "0");
    await setField(user, /loan interest/i, "0");
    await setField(user, /^rates/i, "2400");
    await setField(user, /insurance/i, "2000");
    await setField(user, /management fees/i, "3000");
    await setField(user, /maintenance/i, "3000");
    await setField(user, /depreciation/i, "0");
    await user.click(screen.getByRole("button", { name: /calculate/i }));

    await screen.findByText(/estimated results/i);
    expect(screen.queryByText(/-\$0/)).not.toBeInTheDocument();
    expect(screen.getAllByText("$0").length).toBeGreaterThan(0);
  });
});
