import { test as setup } from "@playwright/test";
import { getAllArticleSlugs } from "@/lib/content/articles";
import { createE2ESupabaseAdminClient, E2E_USER_EMAIL, E2E_USER_PASSWORD, seedE2EUser } from "./lib/supabase-admin";

const authFile = "e2e/.auth/user.json";

// Every route the real spec suite visits, warmed once here (see below) rather than paying each
// route's first-ever Turbopack compile inline inside a spec's own (tighter) assertions.
const ROUTES_TO_WARM = [
  "/",
  "/tips",
  ...getAllArticleSlugs().map((slug) => `/tips/${slug}`),
  "/dashboard",
  "/profile",
  "/calculators",
  "/calculators/contractor-take-home",
  "/calculators/property-cash-flow",
  "/calculators/div-293",
  "/checklists",
];

/**
 * Runs once before every other spec (see `dependencies: ["setup"]` in playwright.config.ts).
 * Seeds a dedicated E2E user directly via the Supabase service-role client (bypasses email
 * confirmation - see `seedE2EUser`), then signs in through the real UI so the resulting
 * session cookies can be reused as storage state by every authenticated spec. Signup/signin
 * specs deliberately reset storage state themselves (`test.use({ storageState: { cookies: [],
 * origins: [] } })`) rather than relying on this file at all.
 */
setup("seed E2E user and authenticate", async ({ page }) => {
  // Warming ~11 routes' first-ever Turbopack compile comfortably exceeds the suite's normal
  // 60s test timeout - this is the one test allowed to take longer, precisely so nothing else
  // has to.
  setup.setTimeout(240_000);

  const admin = createE2ESupabaseAdminClient();
  await seedE2EUser(admin);

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(E2E_USER_EMAIL);
  await page.getByLabel("Password").fill(E2E_USER_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/dashboard");

  // `next dev` (Turbopack) compiles each route lazily on its first request - left unwarmed, the
  // first spec to visit a given route pays that cold-compile cost inline and can time out (this
  // is a real thing E2E found; see PROGRESS.md Day 9). Visiting every route once here, before
  // any spec's own tighter assertions run, moves that cost into setup instead.
  for (const route of ROUTES_TO_WARM) {
    await page.goto(route, { timeout: 90_000 });
  }

  await page.context().storageState({ path: authFile });
});
