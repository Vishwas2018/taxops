// One-off local-dev smoke test for Row Level Security. Not part of the automated test
// suite (needs a running `supabase start` stack); run manually after schema changes touch
// RLS policies. Creates a throwaway second user via the service-role client, then verifies:
//   1. An anon (unauthenticated) client reads zero rows from `profiles`.
//   2. An authenticated client reads exactly its own `profiles` row, never another user's.
// Exits non-zero on any assertion failure.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54331";
const ANON_KEY = process.env.SMOKE_TEST_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SMOKE_TEST_SERVICE_ROLE_KEY;

if (!ANON_KEY || !SERVICE_ROLE_KEY) {
  console.error(
    "Set SMOKE_TEST_ANON_KEY and SMOKE_TEST_SERVICE_ROLE_KEY (from `npx supabase status`) before running this script.",
  );
  process.exit(1);
}

const DEMO_USER_ID = "11111111-1111-1111-1111-111111111111";
const DEMO_EMAIL = "demo@taxops.local";
const DEMO_PASSWORD = "password123";
const SECOND_EMAIL = `rls-smoke-${Date.now()}@taxops.local`;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let failures = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS - ${message}`);
  } else {
    console.error(`  FAIL - ${message}`);
    failures += 1;
  }
}

console.log("Setting up throwaway second user...");
const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email: SECOND_EMAIL,
  password: "throwaway-password-123",
  email_confirm: true,
});
if (createErr) {
  console.error("Could not create throwaway user:", createErr.message);
  process.exit(1);
}
const secondUserId = created.user.id;

const { error: profileErr } = await admin.from("profiles").insert({
  id: secondUserId,
  employment_type: "payg",
});
if (profileErr) {
  console.error("Could not seed throwaway user's profile:", profileErr.message);
  process.exit(1);
}

try {
  console.log("\n1. Anon client should get zero rows of data from profiles:");
  // `anon` has no table grant on profiles at all (least privilege - no v1 feature needs
  // unauthenticated access), so this is expected to error with "permission denied", not
  // return an RLS-filtered empty array. Either outcome would mean zero data exposure; a
  // hard error is the stronger of the two.
  const anon = createClient(SUPABASE_URL, ANON_KEY);
  const { data: anonRows, error: anonErr } = await anon.from("profiles").select("id");
  assert(!!anonErr, `anon select was rejected (permission denied), got: ${anonErr?.message}`);
  assert((anonRows?.length ?? 0) === 0, `anon client received no rows (got ${anonRows?.length ?? 0})`);

  console.log("\n2. Authenticated client should see only its own profiles row:");
  const authed = createClient(SUPABASE_URL, ANON_KEY);
  const { error: signInErr } = await authed.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });
  assert(!signInErr, `sign-in as demo user succeeded (${signInErr?.message ?? "ok"})`);

  const { data: ownRows, error: ownErr } = await authed.from("profiles").select("id");
  assert(!ownErr, `authenticated select did not error (${ownErr?.message ?? "ok"})`);
  assert((ownRows?.length ?? -1) === 1, `authenticated client saw ${ownRows?.length ?? "N/A"} rows, expected 1`);
  assert(
    ownRows?.[0]?.id === DEMO_USER_ID,
    `authenticated client's visible row id (${ownRows?.[0]?.id}) matches demo user id`,
  );
  assert(
    !ownRows?.some((row) => row.id === secondUserId),
    "authenticated client's result set does not include the second user's row",
  );

  const { data: directRead } = await authed
    .from("profiles")
    .select("id")
    .eq("id", secondUserId);
  assert(
    (directRead?.length ?? -1) === 0,
    "authenticated client cannot read the second user's row by direct id filter either",
  );
} finally {
  console.log("\nCleaning up throwaway user...");
  await admin.auth.admin.deleteUser(secondUserId);
}

console.log(failures === 0 ? "\nAll RLS smoke tests passed." : `\n${failures} RLS smoke test(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
