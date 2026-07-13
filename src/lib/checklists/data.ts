import type { createClient } from "@/lib/supabase/server";
import type { ChecklistCustomItem, ChecklistItemStates } from "./derived";
import { isChecklistGroupId, type ChecklistGroupId } from "./templates";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

interface ItemStateRow {
  item_id: string;
  checked: boolean;
}

interface CustomItemRow {
  id: string;
  group_id: string;
  label: string;
  checked: boolean;
  position: number;
}

/** RLS already restricts these to the caller's own rows regardless of the client used; `userId`
 * only narrows the query, same convention as `getTaxProfile`. */
export async function getChecklistItemStates(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<ChecklistItemStates> {
  const { data } = await supabase
    .from("checklist_item_states")
    .select("item_id, checked")
    .eq("user_id", userId)
    .returns<ItemStateRow[]>();

  const states: ChecklistItemStates = {};
  for (const row of data ?? []) {
    states[row.item_id] = row.checked;
  }
  return states;
}

/** Rows whose `group_id` doesn't match a current template group id are dropped rather than
 * surfaced or thrown on - a group could only go missing if a future code change renames or
 * removes one, and silently hiding an orphaned custom item is safer than crashing the page. */
export async function getChecklistCustomItems(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<ChecklistCustomItem[]> {
  const { data } = await supabase
    .from("checklist_custom_items")
    .select("id, group_id, label, checked, position")
    .eq("user_id", userId)
    .order("position", { ascending: true })
    .returns<CustomItemRow[]>();

  const items: ChecklistCustomItem[] = [];
  for (const row of data ?? []) {
    if (!isChecklistGroupId(row.group_id)) continue;
    items.push({
      id: row.id,
      groupId: row.group_id as ChecklistGroupId,
      label: row.label,
      checked: row.checked,
      position: row.position,
    });
  }
  return items;
}
