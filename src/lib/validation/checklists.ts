import { z } from "zod";
import { CHECKLIST_GROUP_IDS } from "@/lib/checklists/templates";

export const CUSTOM_ITEM_LABEL_MAX_LENGTH = 120;

export const checklistGroupIdSchema = z.enum(CHECKLIST_GROUP_IDS);

/** Toggling a template item: the id is re-validated server-side against the real template
 * (see `findTemplateItem` in the server action), this schema only checks shape. */
export const toggleTemplateItemSchema = z.object({
  itemId: z.string().min(1),
  checked: z.boolean(),
});
export type ToggleTemplateItemInput = z.infer<typeof toggleTemplateItemSchema>;

/**
 * A custom item is a single short label - a document name to gather, not free-form notes
 * (constitution: checklists organize preparation, they don't hold arbitrary user content).
 * Trimmed before the length check so whitespace padding can't be used to dodge the cap, and
 * "   " alone doesn't count as a label.
 */
export const customItemLabelSchema = z
  .string()
  .trim()
  .min(1, "Enter a name for this item.")
  .max(
    CUSTOM_ITEM_LABEL_MAX_LENGTH,
    `Keep it to ${CUSTOM_ITEM_LABEL_MAX_LENGTH} characters or fewer - a document name, not a note.`,
  );

export const addCustomItemSchema = z.object({
  groupId: checklistGroupIdSchema,
  label: customItemLabelSchema,
});
export type AddCustomItemInput = z.infer<typeof addCustomItemSchema>;

export const editCustomItemLabelSchema = z.object({
  id: z.uuid(),
  label: customItemLabelSchema,
});
export type EditCustomItemLabelInput = z.infer<typeof editCustomItemLabelSchema>;

export const toggleCustomItemSchema = z.object({
  id: z.uuid(),
  checked: z.boolean(),
});
export type ToggleCustomItemInput = z.infer<typeof toggleCustomItemSchema>;

export const deleteCustomItemSchema = z.object({
  id: z.uuid(),
});
export type DeleteCustomItemInput = z.infer<typeof deleteCustomItemSchema>;
