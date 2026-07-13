import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { STANDARD_DISCLAIMER } from "@/lib/disclaimers";
import TipArticleLayout from "./layout";

describe("TipArticleLayout", () => {
  it("renders the standard disclaimer regardless of what the article body contains", () => {
    render(
      <TipArticleLayout>
        <p>Whatever an author writes here has no control over the footer below.</p>
      </TipArticleLayout>,
    );
    expect(screen.getByText(STANDARD_DISCLAIMER)).toBeInTheDocument();
  });
});
