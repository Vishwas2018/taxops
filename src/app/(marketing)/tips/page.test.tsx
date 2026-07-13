import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TipsPage from "./page";

describe("TipsPage", () => {
  it("groups seed articles under their category headings", () => {
    render(<TipsPage />);

    const contractorSection = screen.getByRole("heading", { name: "Contractor expenses" })
      .closest("section") as HTMLElement;
    expect(
      within(contractorSection).getByText("Claiming Work-Related Expenses as a Contractor"),
    ).toBeInTheDocument();

    const propertySection = screen.getByRole("heading", { name: "Property deductions" })
      .closest("section") as HTMLElement;
    expect(
      within(propertySection).getByText("Repairs vs Improvements: Why the ATO Treats Them Differently"),
    ).toBeInTheDocument();

    const superSection = screen.getByRole("heading", { name: "Superannuation" })
      .closest("section") as HTMLElement;
    expect(
      within(superSection).getByText("Concessional Contributions and the Annual Cap"),
    ).toBeInTheDocument();
  });

  it("does not render a heading for a category with no articles", () => {
    render(<TipsPage />);
    expect(screen.queryByRole("heading", { name: "Wealth preservation" })).not.toBeInTheDocument();
  });

  it("shows each article's description alongside its title", () => {
    render(<TipsPage />);
    expect(
      screen.getByText(
        "The distinction between an immediately deductible repair and a capital improvement to a rental property, and why it changes the timing of a claim.",
      ),
    ).toBeInTheDocument();
  });

  it("links each article title to its /tips/[slug] page", () => {
    render(<TipsPage />);
    expect(
      screen.getByRole("link", { name: "Concessional Contributions and the Annual Cap" }),
    ).toHaveAttribute("href", "/tips/concessional-contributions-cap-explained");
  });
});
