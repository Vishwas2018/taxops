"use server";

import { toProfileRow } from "@/lib/tax-profile/data";
import { createClient } from "@/lib/supabase/server";
import { taxProfileSchema, type TaxProfileInput } from "@/lib/validation/tax-profile";

export type TaxProfileActionResult = { status: "error" | "success"; message?: string };

/**
 * Saves either a full wizard submission or a single-section edit - both are the same partial
 * `TaxProfileInput` shape (every field optional), so one action covers both call sites. Every
 * input is re-validated with the same Zod schema the client used (Privacy rule: never trust
 * client-side validation alone), and the user is re-checked server-side rather than relying on
 * RLS alone to reject an unauthenticated write - RLS is the backstop, not the only gate.
 */
export async function saveTaxProfileSectionAction(
  input: TaxProfileInput,
): Promise<TaxProfileActionResult> {
  const parsed = taxProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "One or more answers weren't valid. Try again." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "You must be signed in to save your tax profile." };
  }

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, ...toProfileRow(parsed.data) }, { onConflict: "id" });

  if (error) {
    return { status: "error", message: "Could not save your tax profile. Try again." };
  }

  return { status: "success" };
}
