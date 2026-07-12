import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { STANDARD_DISCLAIMER } from "@/lib/disclaimers";
import { calculateDiv293 } from "@/lib/calculators/div293";
import { fy2025_26 } from "@/lib/tax-config/fy2025-26";
import { Div293Results } from "./div-293-results";

describe("Div293Results", () => {
  it("renders the standard disclaimer alongside the results", () => {
    const data = calculateDiv293(
      { div293Income: 240_000, concessionalContributions: 25_000 },
      fy2025_26,
    );
    render(<Div293Results data={data} />);
    expect(screen.getByText(STANDARD_DISCLAIMER)).toBeInTheDocument();
  });

  it("below: renders the below-threshold explanation when combined income doesn't exceed it", () => {
    const data = calculateDiv293(
      { div293Income: 100_000, concessionalContributions: 10_000 },
      fy2025_26,
    );
    render(<Div293Results data={data} />);
    expect(screen.getByText(/no division 293 tax applies/i)).toBeInTheDocument();
    expect(screen.queryByText(/adding your concessional contributions/i)).not.toBeInTheDocument();
  });

  it("straddle: explicitly explains when income alone is under the threshold but contributions push combined income over", () => {
    // div293Income $230,000 (below $250k alone) + $25,000 contributions = $255,000 combined.
    const data = calculateDiv293(
      { div293Income: 230_000, concessionalContributions: 25_000 },
      fy2025_26,
    );
    render(<Div293Results data={data} />);

    const explanation = screen.getByText(/adding your concessional contributions/i);
    expect(explanation).toBeInTheDocument();
    expect(explanation.closest('[data-state="straddle"]')).not.toBeNull();
    // The explanation must name both figures so the "why" is explicit, not just the numbers.
    expect(screen.getByText("below")).toBeInTheDocument();
    expect(screen.getByText("combined")).toBeInTheDocument();
  });

  it("above: renders the above-threshold explanation when income alone already exceeds it", () => {
    const data = calculateDiv293(
      { div293Income: 260_000, concessionalContributions: 20_000 },
      fy2025_26,
    );
    render(<Div293Results data={data} />);
    expect(screen.getByText(/already exceeds/i)).toBeInTheDocument();
    expect(screen.queryByText(/adding your concessional contributions/i)).not.toBeInTheDocument();
  });
});
