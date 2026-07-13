import { describe, expect, it } from "vitest";
import { createArticleFrontmatterSchema, isReviewDateStale } from "./schema";

const validFrontmatter = {
  title: "Example Article",
  description: "A short, plain-language description of the article.",
  slug: "example-article",
  category: "contractor-expenses",
  financialYear: "2025-26",
  reviewDate: "2026-01-01",
  sources: [{ label: "ATO — Example", url: "https://www.ato.gov.au/example" }],
  draft: false,
};

describe("articleFrontmatterSchema", () => {
  const schema = createArticleFrontmatterSchema(new Date("2026-07-13T00:00:00Z"));

  it("accepts valid frontmatter", () => {
    const result = schema.safeParse(validFrontmatter);
    expect(result.success).toBe(true);
  });

  it("accepts valid frontmatter with optional tags", () => {
    const result = schema.safeParse({ ...validFrontmatter, tags: ["expenses", "deductions"] });
    expect(result.success).toBe(true);
  });

  it("rejects a description over 160 characters", () => {
    const result = schema.safeParse({ ...validFrontmatter, description: "x".repeat(161) });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown category", () => {
    const result = schema.safeParse({ ...validFrontmatter, category: "crypto-tax" });
    expect(result.success).toBe(false);
  });

  it("rejects a slug that isn't lowercase kebab-case", () => {
    const result = schema.safeParse({ ...validFrontmatter, slug: "Example_Article" });
    expect(result.success).toBe(false);
  });

  it("rejects a financialYear that doesn't look like 2025-26", () => {
    const result = schema.safeParse({ ...validFrontmatter, financialYear: "2025/26" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty sources array", () => {
    const result = schema.safeParse({ ...validFrontmatter, sources: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a source with an invalid url", () => {
    const result = schema.safeParse({
      ...validFrontmatter,
      sources: [{ label: "ATO", url: "not-a-url" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing draft field", () => {
    const withoutDraft: Record<string, unknown> = { ...validFrontmatter };
    delete withoutDraft.draft;
    const result = schema.safeParse(withoutDraft);
    expect(result.success).toBe(false);
  });

  it("rejects a reviewDate more than 12 months before now", () => {
    const result = schema.safeParse({ ...validFrontmatter, reviewDate: "2025-06-01" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join(".") === "reviewDate")).toBe(
        true,
      );
    }
  });
});

describe("isReviewDateStale", () => {
  const now = new Date("2027-07-13T00:00:00Z");

  it("is not stale exactly at the 12-month anniversary", () => {
    expect(isReviewDateStale("2026-07-13", now)).toBe(false);
  });

  it("is stale one day past the 12-month anniversary", () => {
    const oneDayLater = new Date("2027-07-14T00:00:00Z");
    expect(isReviewDateStale("2026-07-13", oneDayLater)).toBe(true);
  });

  it("is not stale one day before the 12-month anniversary", () => {
    const oneDayEarlier = new Date("2027-07-12T00:00:00Z");
    expect(isReviewDateStale("2026-07-13", oneDayEarlier)).toBe(false);
  });

  it("is not stale for a recent reviewDate", () => {
    expect(isReviewDateStale("2027-06-01", now)).toBe(false);
  });
});
