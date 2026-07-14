import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { STANDARD_DISCLAIMER } from "@/lib/disclaimers";
import TipArticleLayout from "./layout";

describe("TipArticleLayout", () => {
  it("renders whatever the article body contains, unmodified", () => {
    render(
      <TipArticleLayout>
        <p>Whatever an author writes here.</p>
      </TipArticleLayout>,
    );
    expect(screen.getByText("Whatever an author writes here.")).toBeInTheDocument();
  });

  // The disclaimer guarantee for `/tips/[slug]` lives one level up in
  // `(marketing)/layout.tsx`, which renders it unconditionally for every route in the group,
  // this one included - see that layout's test for the "no-omit" guarantee, and
  // `page.test.tsx` for the regression test covering the Day 11.9 double-render bug (this
  // layout used to render its own copy on top of the parent's, producing two).
  it("does NOT render its own disclaimer (that would duplicate the parent marketing layout's)", () => {
    render(
      <TipArticleLayout>
        <p>Article body.</p>
      </TipArticleLayout>,
    );
    expect(screen.queryByText(STANDARD_DISCLAIMER)).not.toBeInTheDocument();
  });
});
