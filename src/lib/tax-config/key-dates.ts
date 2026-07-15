import type { KeyDate } from "./types";

const ATO_LODGMENT_DATES_URL =
  "https://www.ato.gov.au/tax-and-super-professionals/for-tax-professionals/prepare-and-lodge/registered-agent-lodgment-program/due-dates-for-tax-returns-by-client-type/individuals-and-trusts";
const ATO_ACTIVITY_STATEMENTS_URL =
  "https://www.ato.gov.au/tax-and-super-professionals/for-tax-professionals/prepare-and-lodge/registered-agent-lodgment-program-2025-26/due-dates-by-obligation-type/activity-statements";
const ATO_SUPER_DUE_DATES_URL =
  "https://www.ato.gov.au/businesses-and-organisations/super-for-employers/quarterly-super-to-30-june-2026/paying-super-contributions/super-payment-due-dates";
const ATO_PAYG_INSTALMENTS_URL =
  "https://www.ato.gov.au/businesses-and-organisations/income-deductions-and-concessions/payg-instalments/when-are-payg-instalments-due";

/**
 * Static key-dates timeline for FY2025-26 (1 July 2025 - 30 June 2026), used by `/tax-dates`
 * and the dashboard's "next key date" line. One file per financial year, same convention as
 * `fy2025-26.ts` - a future `key-dates-2026-27.ts` would sit alongside this one, not replace
 * it (see `docs/updating-tax-data.md`).
 *
 * Quarterly BAS/super/PAYG instalment due dates trail the quarter they report on by
 * approximately a month - the Q4 (Apr-Jun 2026) due dates fall in July 2026, just after this
 * FY's own end date, but are included here since they're the obligation this FY's Q4 activity
 * creates and are what a user planning around FY2025-26 needs to see.
 */
export const KEY_DATES_2025_26: KeyDate[] = [
  {
    id: "fy-start",
    date: "2025-07-01",
    title: "FY2025-26 begins",
    description: "The 2025-26 financial year starts.",
    audience: ["everyone"],
    source: "https://www.ato.gov.au/individuals-and-families/your-tax-return/before-you-prepare-your-tax-return/lodgment-dates",
    verified: true,
  },
  {
    id: "fy-end",
    date: "2026-06-30",
    title: "FY2025-26 ends",
    description: "The 2025-26 financial year ends.",
    audience: ["everyone"],
    source: "https://www.ato.gov.au/individuals-and-families/your-tax-return/before-you-prepare-your-tax-return/lodgment-dates",
    verified: true,
  },
  {
    id: "individual-lodgment-self",
    date: "2025-10-31",
    title: "Individual tax return due (self-lodged)",
    description:
      "The FY2024-25 individual tax return is due if lodging it yourself, without a registered tax agent.",
    audience: ["everyone"],
    source: ATO_LODGMENT_DATES_URL,
    verified: true,
  },
  {
    id: "individual-lodgment-agent-extension",
    date: "2026-05-15",
    title: "Extended lodgment deadline (registered with a tax agent)",
    description:
      "The later FY2024-25 lodgment deadline that applies when a registered tax agent takes on the return before 31 October 2025, under their lodgment program.",
    audience: ["everyone"],
    source: ATO_LODGMENT_DATES_URL,
    verified: true,
  },
  {
    id: "bas-q1",
    date: "2025-10-28",
    title: "Quarterly BAS due — Q1 (Jul-Sep 2025)",
    description: "Quarterly Business Activity Statement due for the July-September 2025 quarter.",
    audience: ["contractor"],
    source: ATO_ACTIVITY_STATEMENTS_URL,
    verified: true,
  },
  {
    id: "bas-q2",
    date: "2026-02-28",
    title: "Quarterly BAS due — Q2 (Oct-Dec 2025)",
    description: "Quarterly Business Activity Statement due for the October-December 2025 quarter.",
    audience: ["contractor"],
    source: ATO_ACTIVITY_STATEMENTS_URL,
    verified: true,
  },
  {
    id: "bas-q3",
    date: "2026-04-28",
    title: "Quarterly BAS due — Q3 (Jan-Mar 2026)",
    description: "Quarterly Business Activity Statement due for the January-March 2026 quarter.",
    audience: ["contractor"],
    source: ATO_ACTIVITY_STATEMENTS_URL,
    verified: true,
  },
  {
    id: "bas-q4",
    date: "2026-07-28",
    title: "Quarterly BAS due — Q4 (Apr-Jun 2026)",
    description: "Quarterly Business Activity Statement due for the April-June 2026 quarter.",
    audience: ["contractor"],
    source: ATO_ACTIVITY_STATEMENTS_URL,
    verified: true,
  },
  {
    id: "super-guarantee-q1",
    date: "2025-10-28",
    title: "Super guarantee contributions due — Q1 (Jul-Sep 2025)",
    description: "Quarterly super guarantee contributions due for the July-September 2025 quarter.",
    audience: ["contractor"],
    source: ATO_SUPER_DUE_DATES_URL,
    verified: true,
  },
  {
    id: "super-guarantee-q2",
    date: "2026-01-28",
    title: "Super guarantee contributions due — Q2 (Oct-Dec 2025)",
    description: "Quarterly super guarantee contributions due for the October-December 2025 quarter.",
    audience: ["contractor"],
    source: ATO_SUPER_DUE_DATES_URL,
    verified: true,
  },
  {
    id: "super-guarantee-q3",
    date: "2026-04-28",
    title: "Super guarantee contributions due — Q3 (Jan-Mar 2026)",
    description: "Quarterly super guarantee contributions due for the January-March 2026 quarter.",
    audience: ["contractor"],
    source: ATO_SUPER_DUE_DATES_URL,
    verified: true,
  },
  {
    id: "super-guarantee-q4",
    date: "2026-07-28",
    title: "Super guarantee contributions due — Q4 (Apr-Jun 2026)",
    description:
      "Quarterly super guarantee contributions due for the April-June 2026 quarter - the final quarter under the quarterly system before Payday Super begins from 1 July 2026.",
    audience: ["contractor"],
    source: ATO_SUPER_DUE_DATES_URL,
    verified: true,
  },
  {
    id: "payg-instalment-q1",
    date: "2025-10-28",
    title: "PAYG instalment due — Q1 (Jul-Sep 2025)",
    description: "Quarterly PAYG instalment due for the July-September 2025 quarter.",
    audience: ["contractor", "property-investor"],
    source: ATO_PAYG_INSTALMENTS_URL,
    verified: true,
  },
  {
    id: "payg-instalment-q2",
    date: "2026-02-28",
    title: "PAYG instalment due — Q2 (Oct-Dec 2025)",
    description: "Quarterly PAYG instalment due for the October-December 2025 quarter.",
    audience: ["contractor", "property-investor"],
    source: ATO_PAYG_INSTALMENTS_URL,
    verified: true,
  },
  {
    id: "payg-instalment-q3",
    date: "2026-04-28",
    title: "PAYG instalment due — Q3 (Jan-Mar 2026)",
    description: "Quarterly PAYG instalment due for the January-March 2026 quarter.",
    audience: ["contractor", "property-investor"],
    source: ATO_PAYG_INSTALMENTS_URL,
    verified: true,
  },
  {
    id: "payg-instalment-q4",
    date: "2026-07-28",
    title: "PAYG instalment due — Q4 (Apr-Jun 2026)",
    description: "Quarterly PAYG instalment due for the April-June 2026 quarter.",
    audience: ["contractor", "property-investor"],
    source: ATO_PAYG_INSTALMENTS_URL,
    verified: true,
  },
];
