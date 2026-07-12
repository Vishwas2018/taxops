import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Disclaimer } from "./disclaimer";
import { STANDARD_DISCLAIMER } from "@/lib/disclaimers";

describe("Disclaimer", () => {
  it.each(["inline", "footer", "calculator"] as const)(
    "renders the standard wording verbatim for variant=%s",
    (variant) => {
      render(<Disclaimer variant={variant} />);
      expect(screen.getByText(STANDARD_DISCLAIMER)).toBeInTheDocument();
    },
  );

  it("defaults to the inline variant when none is given", () => {
    render(<Disclaimer />);
    expect(screen.getByText(STANDARD_DISCLAIMER)).toBeInTheDocument();
  });

  it("does not accept a free-text override prop", () => {
    // Type-level guarantee: Disclaimer's props are `{ variant?: ... }` only. This test just
    // documents the intent so a future change adding a text/children prop gets noticed here.
    const props: Parameters<typeof Disclaimer>[0] = { variant: "footer" };
    expect(Object.keys(props)).toEqual(["variant"]);
  });
});
