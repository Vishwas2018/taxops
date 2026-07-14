import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("links to sign-up and tips", () => {
    render(<HomePage />);
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/sign-up");
    expect(screen.getByRole("link", { name: "Browse tax tips" })).toHaveAttribute("href", "/tips");
  });

  it("names all four v1 modules in the feature grid", () => {
    render(<HomePage />);
    expect(screen.getByText("Guided tax profile")).toBeInTheDocument();
    expect(screen.getByText("Estimate calculators")).toBeInTheDocument();
    expect(screen.getByText("EOFY checklists")).toBeInTheDocument();
    expect(screen.getByText("Tax tips knowledge base")).toBeInTheDocument();
  });

  it("states the educational-only positioning with no outcome promised", () => {
    render(<HomePage />);
    expect(
      screen.getByText(/Educational only - not lodgement, not personal advice, no outcome is promised\./),
    ).toBeInTheDocument();
  });
});
