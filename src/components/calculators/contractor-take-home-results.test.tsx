import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { STANDARD_DISCLAIMER } from "@/lib/disclaimers";
import { calculateContractorTakeHome } from "@/lib/calculators/contractor-take-home";
import { fy2025_26 } from "@/lib/tax-config/fy2025-26";
import {
  ContractorTakeHomeResults,
  type ContractorTakeHomeResultsData,
} from "./contractor-take-home-results";

function buildData(): ContractorTakeHomeResultsData {
  const takeHome = calculateContractorTakeHome(
    { dayRate: 800, daysPerWeek: 4, weeksWorkedPerYear: 48, superTreatment: "exclusive" },
    fy2025_26,
  );
  return {
    takeHome,
    help: null,
    finalNetAnnual: takeHome.netTakeHome,
    finalNetPerWeek: takeHome.netTakeHome / 48,
  };
}

describe("ContractorTakeHomeResults", () => {
  it("renders the standard disclaimer alongside the results", () => {
    render(<ContractorTakeHomeResults data={buildData()} />);
    expect(screen.getByText(STANDARD_DISCLAIMER)).toBeInTheDocument();
  });

  it("labels the results with the configured financial year", () => {
    render(<ContractorTakeHomeResults data={buildData()} />);
    expect(screen.getByText(/FY2025-26/)).toBeInTheDocument();
  });

  it("uses an aria-live polite region for the results", () => {
    render(<ContractorTakeHomeResults data={buildData()} />);
    const region = screen.getByRole("region", { name: /calculator results/i });
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("shows the HELP repayment line only when a HELP result is supplied", () => {
    const data = buildData();
    const { rerender } = render(<ContractorTakeHomeResults data={data} />);
    expect(screen.queryByText(/HELP\/STSL repayment/)).not.toBeInTheDocument();

    rerender(
      <ContractorTakeHomeResults
        data={{
          ...data,
          help: {
            financialYear: "2025-26",
            isEstimate: true,
            repaymentIncome: data.takeHome.assessableIncome,
            minimumRepaymentIncome: 67_000,
            repaymentAmount: 1234,
            isCapApplied: false,
            assumptions: [],
          },
        }}
      />,
    );
    expect(screen.getByText(/HELP\/STSL repayment/)).toBeInTheDocument();
  });
});
