import { z } from "zod";

export const ARTICLE_CATEGORIES = [
  "contractor-expenses",
  "property-deductions",
  "superannuation",
  "wealth-preservation",
] as const;

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  "contractor-expenses": "Contractor expenses",
  "property-deductions": "Property deductions",
  superannuation: "Superannuation",
  "wealth-preservation": "Wealth preservation",
};

const MAX_REVIEW_AGE_MONTHS = 12;

/**
 * Constitution's content-staleness rule: a `reviewDate` more than 12 months old fails
 * validation. Stale exactly at the 12-month anniversary of `reviewDate` (date-based, not a
 * whole-calendar-months count, so a reviewDate of any day-of-month behaves consistently).
 */
export function isReviewDateStale(reviewDate: string, asOf: Date = new Date()): boolean {
  const reviewed = new Date(`${reviewDate}T00:00:00Z`);
  const staleFrom = new Date(reviewed);
  staleFrom.setUTCMonth(staleFrom.getUTCMonth() + MAX_REVIEW_AGE_MONTHS);
  return asOf.getTime() > staleFrom.getTime();
}

/**
 * `now` is injectable so tests can assert staleness behaviour without depending on the real
 * calendar date. `articleFrontmatterSchema` below is the production instance (real `now`).
 */
export function createArticleFrontmatterSchema(now: Date = new Date()) {
  return z
    .object({
      title: z.string().min(1, "title is required"),
      description: z
        .string()
        .min(1, "description is required")
        .max(160, "description must be 160 characters or fewer"),
      slug: z
        .string()
        .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug must be lowercase kebab-case"),
      category: z.enum(ARTICLE_CATEGORIES),
      financialYear: z
        .string()
        .regex(/^\d{4}-\d{2}$/, 'financialYear must look like "2025-26"'),
      reviewDate: z.iso.date(),
      sources: z
        .array(
          z.object({
            label: z.string().min(1, "source label is required"),
            url: z.url("source url must be a valid URL"),
          }),
        )
        .min(1, "at least one source is required"),
      tags: z.array(z.string().min(1)).optional(),
      draft: z.boolean(),
    })
    .refine((data) => !isReviewDateStale(data.reviewDate, now), {
      message: "reviewDate is more than 12 months old (content-staleness rule)",
      path: ["reviewDate"],
    });
}

export const articleFrontmatterSchema = createArticleFrontmatterSchema();

export type ArticleFrontmatter = z.infer<typeof articleFrontmatterSchema>;
