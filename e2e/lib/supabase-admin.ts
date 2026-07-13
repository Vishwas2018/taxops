import { execSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolves the local Supabase URL + service-role key needed to seed the E2E user, without
 * requiring a contributor to hand-copy them into an env var first (unlike
 * `scripts/smoke-test-rls.mjs`, which does require that - this runs far more often, as part of
 * every local/CI e2e run, so the extra convenience is worth the one `npx supabase status` shell
 * out). Env vars still win if set, so CI can inject them directly instead of shelling out to the
 * Supabase CLI.
 */
function resolveSupabaseAdminConfig(): { url: string; serviceRoleKey: string } {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (envUrl && envKey) return { url: envUrl, serviceRoleKey: envKey };

  let statusJson: string;
  try {
    statusJson = execSync("npx supabase status -o json", { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    throw new Error(
      "Could not read `npx supabase status -o json` - is the local Supabase stack running? " +
        "Run `npx supabase start` first (see docs/e2e-testing.md), or set NEXT_PUBLIC_SUPABASE_URL " +
        "and SUPABASE_SERVICE_ROLE_KEY directly.",
    );
  }
  const status = JSON.parse(statusJson) as { API_URL: string; SERVICE_ROLE_KEY: string };
  return { url: envUrl ?? status.API_URL, serviceRoleKey: envKey ?? status.SERVICE_ROLE_KEY };
}

export function createE2ESupabaseAdminClient(): SupabaseClient {
  const { url, serviceRoleKey } = resolveSupabaseAdminConfig();
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const E2E_USER_EMAIL = process.env.E2E_USER_EMAIL ?? "e2e-user@taxops.local";
export const E2E_USER_PASSWORD = process.env.E2E_USER_PASSWORD ?? "e2e-password-123";

export async function getE2EUserId(admin: SupabaseClient): Promise<string> {
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw error;
  const found = data.users.find((user) => user.email === E2E_USER_EMAIL);
  if (!found) throw new Error(`E2E user ${E2E_USER_EMAIL} does not exist - has auth.setup.ts run?`);
  return found.id;
}

/**
 * Wipes the E2E user's tax profile and checklist state back to a known-empty slate. Specs that
 * need the wizard's fresh multi-step flow (rather than the summary/edit view `/profile` shows
 * once any answer exists) call this in their own setup rather than assuming whatever a previous
 * spec file left behind - specs share one seeded user (see playwright.config.ts's single-worker
 * `chromium` project), so this is the isolation mechanism between them.
 */
export async function resetE2EUserData(admin: SupabaseClient, userId: string): Promise<void> {
  await admin.from("checklist_custom_items").delete().eq("user_id", userId);
  await admin.from("checklist_item_states").delete().eq("user_id", userId);
  await admin.from("profiles").delete().eq("id", userId);
}

/**
 * Creates (or resets) the dedicated E2E user via the service-role admin API, which bypasses
 * email confirmation entirely (`email_confirm: true`) regardless of the project's
 * `enable_confirmations` setting - real signup/signin specs still exercise that flow via
 * throwaway emails instead, since this user only exists to give most specs a fast, reliable
 * "already authenticated" starting point. Also clears the user's tax profile so specs (e.g. the
 * wizard/checklist regression pin) start from a known-empty state every run, not whatever the
 * previous run left behind.
 */
export async function seedE2EUser(admin: SupabaseClient): Promise<string> {
  const { data: existing, error: listError } = await admin.auth.admin.listUsers();
  if (listError) throw listError;

  const found = existing.users.find((user) => user.email === E2E_USER_EMAIL);
  const userId = found
    ? found.id
    : await (async () => {
        const { data, error } = await admin.auth.admin.createUser({
          email: E2E_USER_EMAIL,
          password: E2E_USER_PASSWORD,
          email_confirm: true,
        });
        if (error) throw error;
        return data.user.id;
      })();

  if (found) {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: E2E_USER_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
  }

  await resetE2EUserData(admin, userId);

  return userId;
}
