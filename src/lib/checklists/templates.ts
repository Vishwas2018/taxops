/**
 * EOFY checklist templates: typed code, not database content (see PROGRESS.md Day 8). The
 * database only stores per-user checked state and custom items, keyed by the stable `id`s
 * below - a group or item can be reworded here without any migration.
 *
 * Copy rule (constitution's no-advisory-language principle applied to checklists): every item
 * is phrased as a record to gather or a question to ask an agent, never as an instruction
 * ("claim X"). `templates.test.ts` lints every label/description/helpText for that.
 */

export const CHECKLIST_TEMPLATE_FINANCIAL_YEAR = "2025-26";

export const CHECKLIST_GROUP_IDS = [
  "contractor-income-expense",
  "property-documents",
  "super-contributions",
  "receipts-evidence",
  "agent-questions",
] as const;

export type ChecklistGroupId = (typeof CHECKLIST_GROUP_IDS)[number];

export interface ChecklistItem {
  id: string;
  label: string;
  helpText?: string;
}

export interface ChecklistGroup {
  id: ChecklistGroupId;
  title: string;
  description: string;
  items: ChecklistItem[];
}

export const CHECKLIST_GROUPS: ChecklistGroup[] = [
  {
    id: "contractor-income-expense",
    title: "Contractor income & expense records",
    description: "Records of what you earned and spent through ABN or day-rate work.",
    items: [
      {
        id: "invoices-issued",
        label: "Invoices issued this financial year",
        helpText: "Including any that were cancelled or credited.",
      },
      { id: "remittance-advices", label: "Payment remittance advices from clients" },
      { id: "bank-statements-business", label: "Business bank account statements for the full financial year" },
      { id: "abn-income-summary", label: "Summary of ABN income by client" },
      { id: "work-related-expense-receipts", label: "Receipts for work-related purchases (tools, software, equipment)" },
      {
        id: "home-office-log",
        label: "Home office use records",
        helpText: "Hours log or floor-area records, whichever method applies.",
      },
      { id: "vehicle-logbook", label: "Vehicle logbook or work-related travel records" },
      { id: "professional-memberships", label: "Professional membership and subscription receipts" },
      { id: "insurance-records", label: "Income protection or professional indemnity insurance statements" },
    ],
  },
  {
    id: "property-documents",
    title: "Property documents",
    description: "Records for each investment property held during the year.",
    items: [
      { id: "loan-statements", label: "Investment loan interest statements for each property" },
      { id: "depreciation-schedule", label: "Quantity surveyor depreciation schedule" },
      { id: "agent-statements", label: "Property manager or real estate agent annual statements" },
      { id: "land-tax-assessment", label: "Land tax assessment notices" },
      { id: "council-rates-notices", label: "Council rates notices" },
      { id: "water-rates-notices", label: "Water rates notices" },
      {
        id: "body-corporate-statements",
        label: "Body corporate or strata levy statements",
        helpText: "If the property is part of a strata or owners corporation scheme.",
      },
      { id: "repairs-maintenance-invoices", label: "Invoices for repairs and maintenance" },
      {
        id: "purchase-settlement-statement",
        label: "Purchase settlement statement",
        helpText: "For any property bought during this financial year.",
      },
      { id: "building-insurance", label: "Building and landlord insurance statements" },
    ],
  },
  {
    id: "super-contributions",
    title: "Super contribution records",
    description: "Records of contributions made to superannuation during the year.",
    items: [
      { id: "employer-contribution-statements", label: "Employer superannuation contribution statements" },
      { id: "personal-contribution-receipts", label: "Receipts for personal (after-tax or salary-sacrificed) contributions" },
      {
        id: "notice-of-intent-form",
        label: "Notice of intent form for personal super contribution deductions",
        helpText: "If one was lodged with your super fund.",
      },
      { id: "super-fund-annual-statement", label: "Superannuation fund annual member statement" },
      { id: "contribution-cap-tracking", label: "Records tracking contributions against the concessional cap" },
    ],
  },
  {
    id: "receipts-evidence",
    title: "Receipts & evidence",
    description: "General records that support your return, regardless of work arrangement.",
    items: [
      { id: "donation-receipts", label: "Receipts for donations to deductible gift recipients" },
      { id: "income-protection-receipts", label: "Income protection insurance premium receipts" },
      { id: "self-education-receipts", label: "Self-education course and materials receipts" },
      { id: "tax-agent-fee-receipt", label: "Prior year tax agent fee receipt" },
      { id: "private-health-statement", label: "Private health insurance statement" },
      { id: "bank-interest-statements", label: "Bank interest statements" },
      { id: "dividend-statements", label: "Dividend statements and franking credit records" },
    ],
  },
  {
    id: "agent-questions",
    title: "Questions for a registered tax agent",
    description: "Questions worth raising with a registered tax agent before or during your appointment.",
    items: [
      { id: "psi-status", label: "Does my income arrangement meet the personal services income tests this year?" },
      { id: "division-293", label: "Am I likely to be affected by Division 293 additional tax this year?" },
      { id: "negative-gearing-timing", label: "Is there anything about the timing of property expenses worth discussing before 30 June?" },
      { id: "depreciation-method", label: "Which depreciation method applies to my situation?" },
      { id: "structure-review", label: "Does my current business or ownership structure still suit my circumstances?" },
      { id: "super-contribution-timing", label: "Is there a contribution worth making before 30 June to use this year's cap?" },
    ],
  },
];

/** Every item id is namespaced `${groupId}.${itemSlug}` so a state row's `item_id` alone
 * identifies both the item and its group without a join or duplicated group_id column. */
export function templateItemId(groupId: ChecklistGroupId, itemSlug: string): string {
  return `${groupId}.${itemSlug}`;
}

interface ResolvedChecklistItem extends ChecklistItem {
  fullId: string;
  groupId: ChecklistGroupId;
}

let itemIndex: Map<string, ResolvedChecklistItem> | null = null;

function getItemIndex(): Map<string, ResolvedChecklistItem> {
  if (itemIndex) return itemIndex;
  itemIndex = new Map();
  for (const group of CHECKLIST_GROUPS) {
    for (const item of group.items) {
      const fullId = templateItemId(group.id, item.id);
      itemIndex.set(fullId, { ...item, fullId, groupId: group.id });
    }
  }
  return itemIndex;
}

/** Looks up a template item by its full (namespaced) id - used to validate an item id the
 * client sends back before persisting any state against it. */
export function findTemplateItem(fullItemId: string): ResolvedChecklistItem | undefined {
  return getItemIndex().get(fullItemId);
}

export function isChecklistGroupId(value: string): value is ChecklistGroupId {
  return (CHECKLIST_GROUP_IDS as readonly string[]).includes(value);
}

export function getChecklistGroup(groupId: ChecklistGroupId): ChecklistGroup {
  const group = CHECKLIST_GROUPS.find((g) => g.id === groupId);
  if (!group) throw new Error(`Unknown checklist group: ${groupId}`);
  return group;
}
