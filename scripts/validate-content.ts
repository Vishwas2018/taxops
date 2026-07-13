/**
 * Build-time content validator (`npm run validate:content`). Parses every article's
 * frontmatter against the same Zod schema the app uses, plus two checks a schema alone can't
 * express: filename/folder consistency with the frontmatter, and that no article body
 * duplicates the disclaimer copy the article layout already injects (CLAUDE.md: the
 * disclaimer must never be paraphrased or duplicated at a call site).
 *
 * Exits 1 on any failure so a bad article breaks CI; exits 0 and prints a summary otherwise.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { ARTICLE_CATEGORIES, articleFrontmatterSchema } from "../src/lib/content/schema.ts";
import { STANDARD_DISCLAIMER } from "../src/lib/disclaimers/index.ts";

// `VALIDATE_CONTENT_DIR` lets tests point this script at a fixture directory instead of the
// real `content/` tree; unset in every real invocation (npm script, CI).
const CONTENT_DIR = process.env.VALIDATE_CONTENT_DIR
  ? path.resolve(process.env.VALIDATE_CONTENT_DIR)
  : path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "content");

interface FileError {
  file: string;
  messages: string[];
}

function collectMdxFiles(): { category: string; filename: string; fullPath: string }[] {
  const files: { category: string; filename: string; fullPath: string }[] = [];
  for (const category of ARTICLE_CATEGORIES) {
    const dir = path.join(CONTENT_DIR, category);
    if (!fs.existsSync(dir)) continue;
    for (const filename of fs.readdirSync(dir)) {
      if (!filename.endsWith(".mdx")) continue;
      files.push({ category, filename, fullPath: path.join(dir, filename) });
    }
  }
  return files;
}

function validateFile(category: string, filename: string, fullPath: string): FileError | null {
  const messages: string[] = [];
  const raw = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(raw);

  const result = articleFrontmatterSchema.safeParse(data);
  if (!result.success) {
    for (const issue of result.error.issues) {
      messages.push(`${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
  } else {
    const expectedSlug = filename.replace(/\.mdx$/, "");
    if (result.data.slug !== expectedSlug) {
      messages.push(
        `slug "${result.data.slug}" does not match filename "${filename}" (expected "${expectedSlug}")`,
      );
    }
    if (result.data.category !== category) {
      messages.push(
        `frontmatter category "${result.data.category}" does not match its folder "${category}"`,
      );
    }
  }

  if (content.toLowerCase().includes(STANDARD_DISCLAIMER.toLowerCase())) {
    messages.push(
      "article body duplicates the standard disclaimer text - the layout already injects <Disclaimer variant=\"footer\" />, so articles must not include their own copy",
    );
  }

  return messages.length > 0 ? { file: path.join(category, filename), messages } : null;
}

function main(): void {
  const files = collectMdxFiles();
  const errors: FileError[] = [];

  for (const { category, filename, fullPath } of files) {
    const error = validateFile(category, filename, fullPath);
    if (error) errors.push(error);
  }

  if (errors.length > 0) {
    console.error(`✗ ${errors.length} of ${files.length} article(s) failed validation:\n`);
    for (const { file, messages } of errors) {
      console.error(`  ${file}`);
      for (const message of messages) console.error(`    - ${message}`);
    }
    process.exit(1);
  }

  console.log(`✓ ${files.length} article(s) passed content validation.`);
}

main();
