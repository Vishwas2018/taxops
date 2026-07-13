"use server";

import { findTemplateItem } from "@/lib/checklists/templates";
import { createClient } from "@/lib/supabase/server";
import {
  addCustomItemSchema,
  deleteCustomItemSchema,
  editCustomItemLabelSchema,
  toggleCustomItemSchema,
  toggleTemplateItemSchema,
  type AddCustomItemInput,
  type DeleteCustomItemInput,
  type EditCustomItemLabelInput,
  type ToggleCustomItemInput,
  type ToggleTemplateItemInput,
} from "@/lib/validation/checklists";

export type ChecklistActionResult = { status: "error" | "success"; message?: string };

// Every error path below returns a fixed, generic message. Custom item labels are never
// interpolated into a returned message, thrown, or logged (constitution's logging rule) - a
// failed validation or a failed write both produce the same shape of response regardless of
// what the user typed.
const GENERIC_ERROR: ChecklistActionResult = {
  status: "error",
  message: "Could not save. Try again.",
};
const SIGN_IN_ERROR: ChecklistActionResult = {
  status: "error",
  message: "You must be signed in to update your checklist.",
};
const INVALID_ITEM_ERROR: ChecklistActionResult = {
  status: "error",
  message: "That checklist item couldn't be found.",
};

async function requireUserId(): Promise<
  { userId: string; supabase: Awaited<ReturnType<typeof createClient>> } | null
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { userId: user.id, supabase };
}

/** Toggles a template item's checked state. Re-validates the item id against the real template
 * (not just "is it a non-empty string") before writing, and re-checks auth server-side rather
 * than relying on RLS alone to reject an unauthenticated write - same defence-in-depth as
 * `saveTaxProfileSectionAction` (Day 7). */
export async function toggleChecklistItemAction(
  input: ToggleTemplateItemInput,
): Promise<ChecklistActionResult> {
  const parsed = toggleTemplateItemSchema.safeParse(input);
  if (!parsed.success) return GENERIC_ERROR;
  if (!findTemplateItem(parsed.data.itemId)) return INVALID_ITEM_ERROR;

  const auth = await requireUserId();
  if (!auth) return SIGN_IN_ERROR;

  const { error } = await auth.supabase.from("checklist_item_states").upsert(
    {
      user_id: auth.userId,
      item_id: parsed.data.itemId,
      checked: parsed.data.checked,
      checked_at: parsed.data.checked ? new Date().toISOString() : null,
    },
    { onConflict: "user_id,item_id" },
  );
  if (error) return GENERIC_ERROR;

  return { status: "success" };
}

export type AddCustomItemActionResult = ChecklistActionResult & { id?: string };

export async function addCustomItemAction(
  input: AddCustomItemInput,
): Promise<AddCustomItemActionResult> {
  const parsed = addCustomItemSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? GENERIC_ERROR.message };
  }

  const auth = await requireUserId();
  if (!auth) return SIGN_IN_ERROR;

  const { count } = await auth.supabase
    .from("checklist_custom_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.userId)
    .eq("group_id", parsed.data.groupId);

  const { data, error } = await auth.supabase
    .from("checklist_custom_items")
    .insert({
      user_id: auth.userId,
      group_id: parsed.data.groupId,
      label: parsed.data.label,
      position: count ?? 0,
    })
    .select("id")
    .single();
  if (error || !data) return GENERIC_ERROR;

  return { status: "success", id: data.id };
}

export async function editCustomItemLabelAction(
  input: EditCustomItemLabelInput,
): Promise<ChecklistActionResult> {
  const parsed = editCustomItemLabelSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? GENERIC_ERROR.message };
  }

  const auth = await requireUserId();
  if (!auth) return SIGN_IN_ERROR;

  const { error } = await auth.supabase
    .from("checklist_custom_items")
    .update({ label: parsed.data.label })
    .eq("id", parsed.data.id)
    .eq("user_id", auth.userId);
  if (error) return GENERIC_ERROR;

  return { status: "success" };
}

export async function toggleCustomItemAction(
  input: ToggleCustomItemInput,
): Promise<ChecklistActionResult> {
  const parsed = toggleCustomItemSchema.safeParse(input);
  if (!parsed.success) return GENERIC_ERROR;

  const auth = await requireUserId();
  if (!auth) return SIGN_IN_ERROR;

  const { error } = await auth.supabase
    .from("checklist_custom_items")
    .update({ checked: parsed.data.checked })
    .eq("id", parsed.data.id)
    .eq("user_id", auth.userId);
  if (error) return GENERIC_ERROR;

  return { status: "success" };
}

export async function deleteCustomItemAction(
  input: DeleteCustomItemInput,
): Promise<ChecklistActionResult> {
  const parsed = deleteCustomItemSchema.safeParse(input);
  if (!parsed.success) return GENERIC_ERROR;

  const auth = await requireUserId();
  if (!auth) return SIGN_IN_ERROR;

  const { error } = await auth.supabase
    .from("checklist_custom_items")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", auth.userId);
  if (error) return GENERIC_ERROR;

  return { status: "success" };
}
