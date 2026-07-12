import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Div293Calculator } from "./div-293-calculator";

async function setField(user: ReturnType<typeof userEvent.setup>, label: RegExp, value: string) {
  const input = screen.getByLabelText(label);
  await user.clear(input);
  await user.type(input, value);
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

  it("integration: wires the form through the engine to a rendered breakdown", async () => {
    // Default values ($240,000 / $25,000) match div293.test.ts's golden file: combined
    // income $265,000, $15,000 over the $250,000 threshold, $2,250 additional tax.
    const user = userEvent.setup();
    render(<Div293Calculator />);
    await user.click(screen.getByRole("button", { name: /calculate/i }));

    expect(await screen.findByText("$2,250")).toBeInTheDocument();
    expect(screen.getByText("$265,000")).toBeInTheDocument();
    expect(screen.getByText("$15,000")).toBeInTheDocument();
    expect(screen.getByText(/FY2025-26/)).toBeInTheDocument();
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
