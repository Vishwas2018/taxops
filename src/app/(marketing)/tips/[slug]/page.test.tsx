import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { STANDARD_DISCLAIMER } from "@/lib/disclaimers";
import { getAllArticleSlugs } from "@/lib/content/articles";
import TipArticleLayout from "./layout";
import TipArticlePage, { generateMetadata, generateStaticParams } from "./page";

const SLUG = "concessional-contributions-cap-explained";

describe("TipArticlePage", () => {
  it("renders the article wrapped in its layout with the disclaimer, sources, and FY badge", async () => {
    const content = await TipArticlePage({ params: Promise.resolve({ slug: SLUG }) });
    render(<TipArticleLayout>{content}</TipArticleLayout>);

    expect(screen.getByText(STANDARD_DISCLAIMER)).toBeInTheDocument();
    expect(screen.getByText("FY2025-26")).toBeInTheDocument();
    expect(screen.getByText(/reviewed:/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /sources & further reading/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /ato — concessional contributions cap/i }),
    ).toHaveAttribute("href", expect.stringContaining("ato.gov.au"));
  });

  it("renders the article title and description", async () => {
    const content = await TipArticlePage({ params: Promise.resolve({ slug: SLUG }) });
    render(<TipArticleLayout>{content}</TipArticleLayout>);

    expect(
      screen.getByRole("heading", { name: "Concessional Contributions and the Annual Cap" }),
    ).toBeInTheDocument();
  });

  it("404s (via next/navigation notFound) for an unknown slug", async () => {
    await expect(
      TipArticlePage({ params: Promise.resolve({ slug: "does-not-exist" }) }),
    ).rejects.toThrow();
  });

  it("generateStaticParams returns one entry per seed article slug", () => {
    const params = generateStaticParams();
    expect(params.map((p) => p.slug).sort()).toEqual(getAllArticleSlugs().sort());
  });

  it("generateMetadata returns the article's title and description", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: SLUG }) });
    expect(metadata.title).toContain("Concessional Contributions and the Annual Cap");
    expect(metadata.description).toBe(
      "What counts as a concessional super contribution, how the annual cap works, and what happens when it's exceeded.",
    );
  });
});
