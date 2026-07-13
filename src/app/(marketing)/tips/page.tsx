import Link from "next/link";
import type { Metadata } from "next";
import { getAllArticles } from "@/lib/content/articles";
import { ARTICLE_CATEGORIES, type ArticleCategory } from "@/lib/content/schema";

export const metadata: Metadata = { title: "Tax Tips — TaxOps" };

const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  "contractor-expenses": "Contractor expenses",
  "property-deductions": "Property deductions",
  superannuation: "Superannuation",
  "wealth-preservation": "Wealth preservation",
};

export default function TipsPage() {
  const articles = getAllArticles();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Tax Tips</h1>
      <p className="mt-2 text-muted-foreground">
        Plain-language, evidence-based articles on contractor expenses, property deductions,
        superannuation, and wealth preservation.
      </p>

      <div className="mt-8 space-y-10">
        {ARTICLE_CATEGORIES.map((category) => {
          const categoryArticles = articles.filter(
            (article) => article.frontmatter.category === category,
          );
          if (categoryArticles.length === 0) return null;

          return (
            <section key={category} aria-labelledby={`category-${category}`}>
              <h2 id={`category-${category}`} className="text-lg font-semibold">
                {CATEGORY_LABELS[category]}
              </h2>
              <ul className="mt-3 space-y-4">
                {categoryArticles.map((article) => (
                  <li key={article.frontmatter.slug}>
                    <Link
                      href={`/tips/${article.frontmatter.slug}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {article.frontmatter.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {article.frontmatter.description}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
