import { test, expect } from "@playwright/test";

const SLUG = "claiming-work-related-expenses-as-a-contractor";

test("tips article renders FY badge, sources, and the footer disclaimer", async ({ page }) => {
  await page.goto("/tips");
  await expect(page.getByRole("heading", { name: "Tax Tips" })).toBeVisible();

  await page.getByRole("link", { name: "Claiming Work-Related Expenses as a Contractor" }).click();
  await page.waitForURL(`/tips/${SLUG}`);

  await expect(page.getByText("FY2025-26", { exact: true })).toBeVisible();
  await expect(page.getByText(/Reviewed:/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sources & further reading" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ATO — Deductions you can claim" })).toHaveAttribute(
    "href",
    "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/deductions-you-can-claim",
  );

  // Day 11.9 audit fix: the article layout (tips/[slug]/layout.tsx) used to render its own
  // disclaimer on top of the site-wide footer one in (marketing)/layout.tsx, producing two.
  // The no-omit guarantee now lives solely in the marketing layout (which wraps every route in
  // the group, this one included), so exactly one should render, outside <main>.
  await expect(page.getByText(/general and educational only/)).toHaveCount(1);
  await expect(page.getByRole("main").getByText(/general and educational only/)).toHaveCount(0);
});
