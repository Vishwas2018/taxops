import { describe, expect, it } from "vitest";
import { getAllArticles, getAllArticleSlugs, getArticleBySlug } from "./articles";

describe("getAllArticles", () => {
  it("loads exactly the three seed articles, all published (non-draft)", () => {
    const articles = getAllArticles();
    expect(articles).toHaveLength(3);
    for (const article of articles) {
      expect(article.frontmatter.draft).toBe(false);
    }
  });

  it("covers contractor-expenses, property-deductions, and superannuation", () => {
    const categories = getAllArticles().map((article) => article.frontmatter.category);
    expect(categories.sort()).toEqual(
      ["contractor-expenses", "property-deductions", "superannuation"].sort(),
    );
  });

  it("returns a non-empty MDX body for every article", () => {
    for (const article of getAllArticles()) {
      expect(article.body.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("getAllArticleSlugs", () => {
  it("returns one slug per seed article", () => {
    expect(getAllArticleSlugs().sort()).toEqual(
      [
        "claiming-work-related-expenses-as-a-contractor",
        "repairs-vs-improvements-rental-property",
        "concessional-contributions-cap-explained",
      ].sort(),
    );
  });
});

describe("getArticleBySlug", () => {
  it("finds a published article by its slug", () => {
    const article = getArticleBySlug("concessional-contributions-cap-explained");
    expect(article?.frontmatter.title).toBe("Concessional Contributions and the Annual Cap");
  });

  it("returns null for a slug that doesn't exist", () => {
    expect(getArticleBySlug("does-not-exist")).toBeNull();
  });
});
