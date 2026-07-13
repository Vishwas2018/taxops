import Link from "next/link";
import type { Metadata } from "next";
import { getAllArticles } from "@/lib/content/articles";
import { ARTICLE_CATEGORIES, CATEGORY_LABELS } from "@/lib/content/schema";
import { createClient } from "@/lib/supabase/server";
import { getTaxProfile } from "@/lib/tax-profile/data";
import { getRelevantTipCategories } from "@/lib/tax-profile/derived";

export const metadata: Metadata = { title: "Tax Tips — TaxOps" };

export default async function TipsPage() {
  const articles = getAllArticles();

  // /tips is public (see proxy.ts's PUBLIC_PATHS) - getUser() returns null rather than
  // throwing when nobody's signed in, so this works for both anonymous and authenticated
  // visitors.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getTaxProfile(supabase, user.id) : null;
  const relevantCategories = profile ? getRelevantTipCategories(profile) : [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Tax Tips</h1>
      <p className="mt-2 text-muted-foreground">
        Plain-language, evidence-based articles on contractor expenses, property deductions,
        superannuation, and wealth preservation.
      </p>

      {relevantCategories.length > 0 && (
        <section aria-labelledby="relevant-to-you" className="mt-8">
          <h2 id="relevant-to-you" className="text-lg font-semibold">
            Relevant to you
          </h2>
          <p className="text-sm text-textMuted">Based on your tax profile.</p>
          <ul className="mt-3 space-y-4">
            {articles
              .filter((article) => relevantCategories.includes(article.frontmatter.category))
              .map((article) => (
                <li key={article.frontmatter.slug}>
                  <Link
                    href={`/tips/${article.frontmatter.slug}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {article.frontmatter.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {CATEGORY_LABELS[article.frontmatter.category]}
                  </p>
                </li>
              ))}
          </ul>
        </section>
      )}

      <div className="mt-10 space-y-10">
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
