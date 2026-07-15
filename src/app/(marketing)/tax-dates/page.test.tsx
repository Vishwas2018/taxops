import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { STANDARD_DISCLAIMER } from "@/lib/disclaimers";
import TaxDatesPage from "./page";

describe("TaxDatesPage", () => {
  it("renders the standard disclaimer", () => {
    render(<TaxDatesPage />);
    expect(screen.getByText(STANDARD_DISCLAIMER)).toBeInTheDocument();
  });

  it("renders the page heading and quarter-grouped section headings", () => {
    render(<TaxDatesPage />);
    expect(screen.getByRole("heading", { name: "Tax Dates", level: 1 })).toBeInTheDocument();
    // At least the four calendar quarters FY2025-26's dates span.
    expect(screen.getByRole("heading", { name: /jul.sep 2025/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /oct.dec 2025/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /jan.mar 2026/i })).toBeInTheDocument();
  });

  it("renders every KEY_DATES_2025_26 entry with its audience chips and an ATO source link", () => {
    render(<TaxDatesPage />);
    expect(screen.getByText("Quarterly BAS due — Q1 (Jul-Sep 2025)")).toBeInTheDocument();
    expect(screen.getAllByText("Contractor").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Everyone").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Property investor").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "ATO source" }).length).toBeGreaterThan(0);
    for (const link of screen.getAllByRole("link", { name: "ATO source" })) {
      expect(link).toHaveAttribute("href", expect.stringContaining("ato.gov.au"));
    }
  });

  it("also renders FY2026-27's quarter groups and its Payday Super entry, chronologically after FY2025-26", () => {
    render(<TaxDatesPage />);
    expect(screen.getByRole("heading", { name: /jul.sep 2026/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /apr.jun 2027/i })).toBeInTheDocument();
    expect(
      screen.getByText(/payday super begins.*sg due within 7 business days of payday/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Everyone with an employer")).toBeInTheDocument();
    // Exactly FY2025-26's 4 quarterly super guarantee rows render (title + description each
    // match the phrase, so 4 rows -> 8 matches), and no more - FY2026-27 contributes zero
    // (Payday Super replaces the quarterly system from 1 July 2026), so this count must not
    // grow once FY2026-27's dates are merged into the same timeline.
    expect(screen.getAllByText(/super guarantee contributions due/i)).toHaveLength(8);
  });
});
