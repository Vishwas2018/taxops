// One-off smoke test for Row Level Security (+ Day 7's partial-upsert mechanism, + Day 8's
// checklist state tables). Not part of the automated test suite; run manually after schema
// changes touch RLS policies, against either the local `supabase start` stack or a hosted
// staging project (Day 10) - point NEXT_PUBLIC_SUPABASE_URL/SMOKE_TEST_*_KEY at either. Ensures
// its own demo user exists via the service-role admin API rather than assuming
// `supabase/seed.sql` has run (seed.sql is local-dev-only by design - `supabase db push`
// against a hosted project never runs it, only migrations), so this script works unmodified in
// both places. Creates a throwaway second user via the service-role client, then verifies:
//   1. An anon (unauthenticated) client reads zero rows from `profiles`.
//   2. An authenticated client reads exactly its own `profiles` row, never another user's.
//   3. A partial upsert (`{ id, oneColumn }`) updates only that column, leaving the rest of
//      the demo user's row untouched - the mechanism the Guided Tax Profile's section-edit
//      feature relies on.
//   4. An authenticated client cannot read, update, or delete another user's
//      `checklist_item_states` / `checklist_custom_items` rows, and a targeted upsert against
//      one item_id leaves every other item_id row for the same user untouched.
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

console.log("Ensuring the demo user exists...");
// `supabase/seed.sql` inserts this user with a fixed id via raw SQL (only possible against
// `auth.users` directly, not through the admin API) - locally, `supabase db reset` already ran
// it. On a hosted project there's no seed step at all, so this looks the user up first and
// only creates it if missing, using whatever id GoTrue assigns rather than assuming the seed's
// hardcoded `11111111-...`.
const { data: existingUsers, error: listUsersErr } = await admin.auth.admin.listUsers();
if (listUsersErr) {
  console.error("Could not list users:", listUsersErr.message);
  process.exit(1);
}
let DEMO_USER_ID = existingUsers.users.find((user) => user.email === DEMO_EMAIL)?.id;
if (!DEMO_USER_ID) {
  const { data: createdDemo, error: createDemoErr } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (createDemoErr) {
    console.error("Could not create demo user:", createDemoErr.message);
    process.exit(1);
  }
  DEMO_USER_ID = createdDemo.user.id;
}
await admin
  .from("profiles")
  .upsert({ id: DEMO_USER_ID, work_arrangement: "mix" }, { onConflict: "id" });
// Section 4 below compares this row's `checked` value before/after an unrelated upsert, to
// prove the unrelated write left it alone - needs to exist first with a known value.
const OTHER_DEMO_ITEM_ID = "property-documents.loan-statements";
await admin.from("checklist_item_states").upsert(
  { user_id: DEMO_USER_ID, item_id: OTHER_DEMO_ITEM_ID, checked: true, checked_at: new Date().toISOString() },
  { onConflict: "user_id,item_id" },
);

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
  work_arrangement: "payg_employee",
});
if (profileErr) {
  console.error("Could not seed throwaway user's profile:", profileErr.message);
  process.exit(1);
}

const SECOND_ITEM_ID = "receipts-evidence.donation-receipts";
const { error: secondItemStateErr } = await admin.from("checklist_item_states").insert({
  user_id: secondUserId,
  item_id: SECOND_ITEM_ID,
  checked: true,
  checked_at: new Date().toISOString(),
});
if (secondItemStateErr) {
  console.error("Could not seed throwaway user's checklist item state:", secondItemStateErr.message);
  process.exit(1);
}

const { data: secondCustomItem, error: secondCustomItemErr } = await admin
  .from("checklist_custom_items")
  .insert({
    user_id: secondUserId,
    group_id: "receipts-evidence",
    label: "Throwaway user's custom item",
  })
  .select("id")
  .single();
if (secondCustomItemErr) {
  console.error("Could not seed throwaway user's custom item:", secondCustomItemErr.message);
  process.exit(1);
}
const secondCustomItemId = secondCustomItem.id;

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

  console.log(
    "\n3. A partial upsert (Day 7's section-edit mechanism) only touches the given column:",
  );
  const { data: before } = await authed
    .from("profiles")
    .select("work_arrangement, household_income_band")
    .eq("id", DEMO_USER_ID)
    .single();
  const { error: partialUpsertErr } = await authed
    .from("profiles")
    .upsert({ id: DEMO_USER_ID, household_income_band: "under_100k" }, { onConflict: "id" });
  assert(!partialUpsertErr, `partial upsert did not error (${partialUpsertErr?.message ?? "ok"})`);
  const { data: after } = await authed
    .from("profiles")
    .select("work_arrangement, household_income_band")
    .eq("id", DEMO_USER_ID)
    .single();
  assert(
    after?.household_income_band === "under_100k",
    `targeted column was updated (household_income_band is now ${after?.household_income_band})`,
  );
  assert(
    after?.work_arrangement === before?.work_arrangement,
    `untouched column was left alone (work_arrangement still ${after?.work_arrangement})`,
  );
  // Restore the seed value so re-running this script stays idempotent.
  await authed
    .from("profiles")
    .upsert(
      { id: DEMO_USER_ID, household_income_band: before?.household_income_band },
      { onConflict: "id" },
    );

  console.log("\n4. Checklist tables (Day 8) enforce owner-only read/write/delete:");

  const { data: itemStateRows, error: itemStateReadErr } = await authed
    .from("checklist_item_states")
    .select("item_id")
    .eq("user_id", secondUserId);
  assert(!itemStateReadErr, `own-client select against another user's item states did not error (RLS-filtered, not rejected)`);
  assert(
    (itemStateRows?.length ?? -1) === 0,
    `cannot read the second user's checklist_item_states row (got ${itemStateRows?.length ?? "N/A"})`,
  );

  const { data: itemStateUpdateResult } = await authed
    .from("checklist_item_states")
    .update({ checked: false })
    .eq("user_id", secondUserId)
    .eq("item_id", SECOND_ITEM_ID)
    .select("item_id");
  assert(
    (itemStateUpdateResult?.length ?? -1) === 0,
    "cannot update the second user's checklist_item_states row (zero rows affected)",
  );
  const { data: secondItemStateAfter } = await admin
    .from("checklist_item_states")
    .select("checked")
    .eq("user_id", secondUserId)
    .eq("item_id", SECOND_ITEM_ID)
    .single();
  assert(
    secondItemStateAfter?.checked === true,
    "second user's item state was not changed by the other user's update attempt",
  );

  const { data: customItemRows, error: customItemReadErr } = await authed
    .from("checklist_custom_items")
    .select("id")
    .eq("user_id", secondUserId);
  assert(!customItemReadErr, `own-client select against another user's custom items did not error (RLS-filtered, not rejected)`);
  assert(
    (customItemRows?.length ?? -1) === 0,
    `cannot read the second user's checklist_custom_items row (got ${customItemRows?.length ?? "N/A"})`,
  );

  const { data: deleteResult } = await authed
    .from("checklist_custom_items")
    .delete()
    .eq("id", secondCustomItemId)
    .select("id");
  assert(
    (deleteResult?.length ?? -1) === 0,
    "cannot delete the second user's checklist_custom_items row (zero rows affected)",
  );
  const { data: secondCustomItemAfter } = await admin
    .from("checklist_custom_items")
    .select("id")
    .eq("id", secondCustomItemId)
    .maybeSingle();
  assert(!!secondCustomItemAfter, "second user's custom item still exists after the other user's delete attempt");

  // A targeted upsert against one item_id must not touch the demo user's other item_id rows -
  // the same partial-write isolation Day 7 verified for `profiles`, now for a per-item-id table.
  // (OTHER_DEMO_ITEM_ID + its seeded row are set up front, near the demo-user bootstrap above.)
  const { data: otherItemBefore } = await authed
    .from("checklist_item_states")
    .select("checked")
    .eq("user_id", DEMO_USER_ID)
    .eq("item_id", OTHER_DEMO_ITEM_ID)
    .single();
  const TARGET_ITEM_ID = "contractor-income-expense.invoices-issued";
  const { error: targetUpsertErr } = await authed.from("checklist_item_states").upsert(
    { user_id: DEMO_USER_ID, item_id: TARGET_ITEM_ID, checked: true, checked_at: new Date().toISOString() },
    { onConflict: "user_id,item_id" },
  );
  assert(!targetUpsertErr, `targeted checklist item upsert did not error (${targetUpsertErr?.message ?? "ok"})`);
  const { data: otherItemAfter } = await authed
    .from("checklist_item_states")
    .select("checked")
    .eq("user_id", DEMO_USER_ID)
    .eq("item_id", OTHER_DEMO_ITEM_ID)
    .single();
  assert(
    otherItemAfter?.checked === otherItemBefore?.checked,
    `untouched item_id row was left alone (${OTHER_DEMO_ITEM_ID} checked still ${otherItemAfter?.checked})`,
  );
  // Restore idempotency: remove the row this run just created.
  await authed
    .from("checklist_item_states")
    .delete()
    .eq("user_id", DEMO_USER_ID)
    .eq("item_id", TARGET_ITEM_ID);
} finally {
  console.log("\nCleaning up throwaway user...");
  await admin.auth.admin.deleteUser(secondUserId);
}

console.log(failures === 0 ? "\nAll RLS smoke tests passed." : `\n${failures} RLS smoke test(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
