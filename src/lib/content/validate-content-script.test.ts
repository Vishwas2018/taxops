import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { STANDARD_DISCLAIMER } from "@/lib/disclaimers";

const SCRIPT_PATH = path.join(process.cwd(), "scripts", "validate-content.ts");

const VALID_FRONTMATTER = `---
title: "Example Article"
description: "A short, plain-language description."
slug: "example-article"
category: "contractor-expenses"
financialYear: "2025-26"
reviewDate: "${new Date().toISOString().slice(0, 10)}"
sources:
  - label: "ATO — Example"
    url: "https://www.ato.gov.au/example"
draft: false
---
`;

let fixtureDir: string | undefined;

function makeFixture(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "validate-content-fixture-"));
  fs.mkdirSync(path.join(dir, "contractor-expenses"), { recursive: true });
  return dir;
}

function runScript(dir: string) {
  return spawnSync("node", ["--no-warnings", SCRIPT_PATH], {
    env: { ...process.env, VALIDATE_CONTENT_DIR: dir },
    encoding: "utf8",
  });
}

afterEach(() => {
  if (fixtureDir) fs.rmSync(fixtureDir, { recursive: true, force: true });
  fixtureDir = undefined;
});

describe("validate-content script", () => {
  it("exits 0 when every article is valid", () => {
    fixtureDir = makeFixture();
    fs.writeFileSync(
      path.join(fixtureDir, "contractor-expenses", "example-article.mdx"),
      `${VALID_FRONTMATTER}\nSome article body text.\n`,
    );

    const result = runScript(fixtureDir);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/1 article\(s\) passed/);
  });

  it("exits 1 when frontmatter fails schema validation", () => {
    fixtureDir = makeFixture();
    fs.writeFileSync(
      path.join(fixtureDir, "contractor-expenses", "example-article.mdx"),
      `---\ntitle: "Missing fields"\n---\nBody.\n`,
    );

    const result = runScript(fixtureDir);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/failed validation/);
  });

  it("exits 1 when the slug doesn't match the filename", () => {
    fixtureDir = makeFixture();
    const mismatched = VALID_FRONTMATTER.replace(
      'slug: "example-article"',
      'slug: "some-other-slug"',
    );
    fs.writeFileSync(
      path.join(fixtureDir, "contractor-expenses", "example-article.mdx"),
      `${mismatched}\nBody.\n`,
    );

    const result = runScript(fixtureDir);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/does not match filename/);
  });

  it("exits 1 when the frontmatter category doesn't match the containing folder", () => {
    fixtureDir = makeFixture();
    const mismatched = VALID_FRONTMATTER.replace(
      'category: "contractor-expenses"',
      'category: "superannuation"',
    );
    fs.writeFileSync(
      path.join(fixtureDir, "contractor-expenses", "example-article.mdx"),
      `${mismatched}\nBody.\n`,
    );

    const result = runScript(fixtureDir);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/does not match its folder/);
  });

  it("exits 1 when reviewDate is more than 12 months old", () => {
    fixtureDir = makeFixture();
    const stale = VALID_FRONTMATTER.replace(
      /reviewDate: ".*"/,
      'reviewDate: "2000-01-01"',
    );
    fs.writeFileSync(
      path.join(fixtureDir, "contractor-expenses", "example-article.mdx"),
      `${stale}\nBody.\n`,
    );

    const result = runScript(fixtureDir);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/12 months old/);
  });

  it("exits 1 when the article body duplicates the standard disclaimer", () => {
    fixtureDir = makeFixture();
    fs.writeFileSync(
      path.join(fixtureDir, "contractor-expenses", "example-article.mdx"),
      `${VALID_FRONTMATTER}\nBody text.\n\n${STANDARD_DISCLAIMER}\n`,
    );

    const result = runScript(fixtureDir);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/duplicates the standard disclaimer/);
  });

  it("exits 0 with a zero-article summary when the fixture directory is empty", () => {
    fixtureDir = makeFixture();

    const result = runScript(fixtureDir);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/0 article\(s\) passed/);
  });
});
