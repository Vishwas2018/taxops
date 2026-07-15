import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import { CALCULATORS } from "@/app/(app)/calculators/page";
import { FEATURES } from "@/app/(marketing)/page";
import { CHECKLIST_GROUPS } from "@/lib/checklists/templates";
import { ARTICLE_CATEGORIES } from "@/lib/content/schema";
import { KEY_DATES_2026_27 } from "@/lib/tax-config/key-dates-2026-27";
import { KEY_DATES_2025_26 } from "@/lib/tax-config/key-dates";
import { TAX_PROFILE_QUESTION_GROUPS } from "@/lib/validation/tax-profile";

/**
 * Constitution-wide compliance sweep (CLAUDE.md's Strict Tax Disclaimer rule), extending
 * `src/lib/checklists/templates.test.ts`'s original checklist-only lint to every other
 * structured UI copy source plus every article body.
 *
 * Two different banned-word lists are used deliberately, not one:
 * - UI copy (checklist items, calculator cards, tax-profile questions) bans "claim" outright,
 *   same as the original test - this copy speaks directly to the reader as an instruction
 *   ("Claim your home office costs"), where "claim" reads as advice to act.
 * - Article prose describes how claiming/deductibility works as a matter of tax law - "claim"
 *   is unavoidable, ordinary descriptive vocabulary there (see any article in `content/`), so
 *   banning it outright would fail every legitimate article. Article prose is instead checked
 *   for the imperative/certainty patterns the constitution actually prohibits: direct
 *   second-person advice and outcome guarantees.
 *
 * Freeform page-level JSX copy that isn't a named, importable constant (the marketing hero
 * text, dashboard headings, auth page copy) isn't reachable by either sweep below - see
 * PROGRESS.md's Day 11 entry for the manual review of that copy.
 */

const UI_BANNED_SUBSTRINGS = ["claim", "you should", "we recommend"];
// Bare "guarantee"/"guaranteed" isn't banned here - "Superannuation Guarantee" (the compulsory
// employer contribution scheme's actual legislative name, "Super Guarantee" for short) is
// legitimate, unavoidable ATO terminology that every superannuation article needs to use
// accurately. The compound phrases below still catch an actual outcome promise without
// colliding with that proper noun.
const ARTICLE_BANNED_SUBSTRINGS = [
  "you should",
  "we recommend",
  "you must",
  "guaranteed to",
  "we guarantee",
];

function findOffenders(
  copy: { where: string; text: string }[],
  banned: string[],
): { where: string; banned: string }[] {
  const offenders: { where: string; banned: string }[] = [];
  for (const { where, text } of copy) {
    for (const phrase of banned) {
      if (text.toLowerCase().includes(phrase.toLowerCase())) {
        offenders.push({ where, banned: phrase });
      }
    }
  }
  return offenders;
}

describe("UI copy audit: calculator cards, tax-profile questions, checklist templates, key dates", () => {
  function collectUiCopy(): { where: string; text: string }[] {
    const copy: { where: string; text: string }[] = [];

    for (const calculator of CALCULATORS) {
      copy.push({ where: `calculator card "${calculator.href}" title`, text: calculator.title });
      copy.push({
        where: `calculator card "${calculator.href}" description`,
        text: calculator.description,
      });
    }

    for (const feature of FEATURES) {
      copy.push({ where: `marketing feature "${feature.title}" title`, text: feature.title });
      copy.push({
        where: `marketing feature "${feature.title}" description`,
        text: feature.description,
      });
    }

    for (const group of TAX_PROFILE_QUESTION_GROUPS) {
      copy.push({ where: `tax-profile question "${group.key}" title`, text: group.title });
      if (group.description) {
        copy.push({
          where: `tax-profile question "${group.key}" description`,
          text: group.description,
        });
      }
      for (const option of group.options) {
        copy.push({
          where: `tax-profile question "${group.key}" option "${option.value}" label`,
          text: option.label,
        });
      }
    }

    for (const group of CHECKLIST_GROUPS) {
      copy.push({ where: `checklist "${group.id}" title`, text: group.title });
      copy.push({ where: `checklist "${group.id}" description`, text: group.description });
      for (const item of group.items) {
        copy.push({ where: `checklist "${group.id}.${item.id}" label`, text: item.label });
        if (item.helpText) {
          copy.push({ where: `checklist "${group.id}.${item.id}" helpText`, text: item.helpText });
        }
      }
    }

    for (const entry of [...KEY_DATES_2025_26, ...KEY_DATES_2026_27]) {
      copy.push({ where: `key date "${entry.id}" title`, text: entry.title });
      copy.push({ where: `key date "${entry.id}" description`, text: entry.description });
    }

    return copy;
  }

  it("contains none of the banned advisory substrings anywhere in this UI copy", () => {
    expect(findOffenders(collectUiCopy(), UI_BANNED_SUBSTRINGS)).toEqual([]);
  });
});

describe("Article MDX body audit: no direct advice, no outcome guarantees", () => {
  const CONTENT_DIR = path.join(process.cwd(), "content");

  function collectArticleBodies(): { where: string; text: string }[] {
    const copy: { where: string; text: string }[] = [];
    for (const category of ARTICLE_CATEGORIES) {
      const dir = path.join(CONTENT_DIR, category);
      if (!fs.existsSync(dir)) continue;
      for (const filename of fs.readdirSync(dir)) {
        if (!filename.endsWith(".mdx")) continue;
        const raw = fs.readFileSync(path.join(dir, filename), "utf8");
        const { content } = matter(raw);
        copy.push({ where: path.join(category, filename), text: content });
      }
    }
    return copy;
  }

  it("finds at least one article to check", () => {
    expect(collectArticleBodies().length).toBeGreaterThan(0);
  });

  it("contains none of the banned advisory substrings in any article body", () => {
    expect(findOffenders(collectArticleBodies(), ARTICLE_BANNED_SUBSTRINGS)).toEqual([]);
  });
});
