import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { compileMDX } from "next-mdx-remote/rsc";
import { Badge } from "@/components/ui/badge";
import { getAllArticleSlugs, getArticleBySlug } from "@/lib/content/articles";

type ArticleParams = Promise<{ slug: string }>;

export function generateStaticParams() {
  return getAllArticleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: ArticleParams }): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};
  return {
    title: `${article.frontmatter.title} — TaxOps`,
    description: article.frontmatter.description,
  };
}

function formatReviewDate(reviewDate: string): string {
  return new Date(`${reviewDate}T00:00:00Z`).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function TipArticlePage({ params }: { params: ArticleParams }) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const { frontmatter } = article;
  const { content } = await compileMDX({ source: article.body });

  return (
    <article>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">FY{frontmatter.financialYear}</Badge>
        <span className="text-sm text-textMuted">
          Reviewed: {formatReviewDate(frontmatter.reviewDate)}
        </span>
      </div>

      <h1 className="mt-2 text-2xl font-semibold">{frontmatter.title}</h1>
      <p className="mt-1 text-muted-foreground">{frontmatter.description}</p>

      <div className="mt-6 space-y-4">{content}</div>

      <section className="mt-10 border-t pt-6">
        <h2 className="text-lg font-semibold">Sources &amp; further reading</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {frontmatter.sources.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer" className="underline">
                {source.label}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
