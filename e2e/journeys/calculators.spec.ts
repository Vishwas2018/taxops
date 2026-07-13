import { test, expect } from "@playwright/test";
import { fillNumberField } from "../lib/form";
import { isFullyInViewport } from "../lib/viewport";

// Authenticated (shared storageState). Wide-and-tall viewport: the form/results grid is
// side-by-side at the `lg` breakpoint, so a big enough viewport is what makes "disclaimer
// visible in the same viewport as the results" a real, checkable claim rather than something
// that only happens to be true at whatever size the last developer's browser was.
test.use({ viewport: { width: 1280, height: 1400 } });

const RESULTS_REGION = "region";
const RESULTS_NAME = "Calculator results";

test("contractor take-home: fill, calculate, itemized results + disclaimer render together", async ({
  page,
}) => {
  await page.goto("/calculators/contractor-take-home");

  await fillNumberField(page.getByLabel("Day rate ($)"), "800");
  await fillNumberField(page.getByLabel("Billable days per week"), "4");
  await fillNumberField(page.getByLabel("Weeks worked per year"), "46");
  await page.getByRole("button", { name: "Calculate", exact: true }).click();

  const results = page.getByRole(RESULTS_REGION, { name: RESULTS_NAME });
  await expect(results).toBeVisible();
  await expect(results.getByText(/Estimated results — FY/)).toBeVisible();

  // One numeric spot-check (gross income = day rate x days/week x weeks/year), not a re-derived
  // golden file - the engines already have 260 unit tests owning correctness.
  const grossIncome = results.locator("dt", { hasText: "Gross income" }).locator("xpath=following-sibling::dd[1]");
  await expect(grossIncome).toHaveText("$147,200");

  const disclaimer = results.getByText(/general and educational only/);
  await expect(disclaimer).toBeVisible();
  expect(await isFullyInViewport(page, results)).toBe(true);
  expect(await isFullyInViewport(page, disclaimer)).toBe(true);
});

test("division 293: fill, calculate, itemized results + disclaimer render together", async ({ page }) => {
  await page.goto("/calculators/div-293");

  await fillNumberField(page.getByLabel("Income for Division 293 purposes ($)"), "240000");
  await fillNumberField(page.getByLabel("Concessional (before-tax) super contributions ($)"), "25000");
  await page.getByRole("button", { name: "Calculate", exact: true }).click();

  const results = page.getByRole(RESULTS_REGION, { name: RESULTS_NAME });
  await expect(results).toBeVisible();

  // Spot-check: combined income (240,000 + 25,000) straddles the $250,000 threshold.
  const combinedIncome = results.locator("dt", { hasText: "Combined income" }).locator("xpath=following-sibling::dd[1]");
  await expect(combinedIncome).toHaveText("$265,000");
  await expect(results.getByText(/combined.*income to/i)).toBeVisible();

  const disclaimer = results.getByText(/general and educational only/);
  await expect(disclaimer).toBeVisible();
  expect(await isFullyInViewport(page, results)).toBe(true);
  expect(await isFullyInViewport(page, disclaimer)).toBe(true);
});

test("property cash flow: fill, calculate, itemized results + disclaimer render together", async ({
  page,
}) => {
  await page.goto("/calculators/property-cash-flow");

  await fillNumberField(page.getByLabel("Weekly rent ($)"), "550");
  await fillNumberField(page.getByLabel("Loan interest ($/year)"), "22000");
  await page.getByRole("button", { name: "Calculate", exact: true }).click();

  const results = page.getByRole(RESULTS_REGION, { name: RESULTS_NAME });
  await expect(results).toBeVisible();

  // Spot-check: the default inputs produce a negatively-geared, -$2,500 pre-tax cash flow
  // (rent 27,500 - expenses 8,000 - interest 22,000) - see PROGRESS.md Day 5.
  await expect(results.getByText("negatively geared")).toBeVisible();
  const preTaxCashFlow = results.locator("dt", { hasText: "Pre-tax cash flow" }).locator("xpath=following-sibling::dd[1]");
  await expect(preTaxCashFlow).toHaveText("-$2,500");

  const disclaimer = results.getByText(/general and educational only/);
  await expect(disclaimer).toBeVisible();
  expect(await isFullyInViewport(page, results)).toBe(true);
  expect(await isFullyInViewport(page, disclaimer)).toBe(true);
});
