import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { ARTICLE_CATEGORIES, articleFrontmatterSchema, type ArticleFrontmatter } from "./schema";

const CONTENT_DIR = path.join(process.cwd(), "content");

export interface Article {
  frontmatter: ArticleFrontmatter;
  /** Raw MDX body, frontmatter block already stripped. */
  body: string;
}

function readArticleFile(category: string, filename: string): Article {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, category, filename), "utf8");
  const { data, content } = matter(raw);
  const frontmatter = articleFrontmatterSchema.parse(data);
  return { frontmatter, body: content };
}

/** Every published (non-draft) article, across all categories. */
export function getAllArticles(): Article[] {
  const articles: Article[] = [];
  for (const category of ARTICLE_CATEGORIES) {
    const dir = path.join(CONTENT_DIR, category);
    if (!fs.existsSync(dir)) continue;
    for (const filename of fs.readdirSync(dir)) {
      if (!filename.endsWith(".mdx")) continue;
      const article = readArticleFile(category, filename);
      if (!article.frontmatter.draft) articles.push(article);
    }
  }
  return articles;
}

/** Slugs for every published article, for `generateStaticParams`. */
export function getAllArticleSlugs(): string[] {
  return getAllArticles().map((article) => article.frontmatter.slug);
}

/** A single published article by slug, or `null` if it doesn't exist or is a draft. */
export function getArticleBySlug(slug: string): Article | null {
  return getAllArticles().find((article) => article.frontmatter.slug === slug) ?? null;
}
