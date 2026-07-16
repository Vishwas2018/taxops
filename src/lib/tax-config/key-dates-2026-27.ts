import type { KeyDate } from "./types";

const ATO_LODGMENT_DATES_URL =
  "https://www.ato.gov.au/tax-and-super-professionals/for-tax-professionals/prepare-and-lodge/registered-agent-lodgment-program/due-dates-for-tax-returns-by-client-type/individuals-and-trusts";
const ATO_ACTIVITY_STATEMENTS_URL =
  "https://www.ato.gov.au/tax-and-super-professionals/for-tax-professionals/prepare-and-lodge/registered-agent-lodgment-program/due-dates-by-obligation-type/activity-statements";
const ATO_PAYG_INSTALMENTS_URL =
  "https://www.ato.gov.au/businesses-and-organisations/income-deductions-and-concessions/payg-instalments/when-are-payg-instalments-due";
const ATO_PAYDAY_SUPER_DEADLINES_URL =
  "https://www.ato.gov.au/businesses-and-organisations/super-for-employers/payday-super/paying-super-on-payday/payment-deadlines-for-payday-super";

/**
 * Static key-dates timeline for FY2026-27 (1 July 2026 - 30 June 2027), sitting alongside
 * `key-dates.ts`'s FY2025-26 entries (not replacing them) - same convention as
 * `fy2025-26.ts`/`fy2026-27.ts` - see `docs/updating-tax-data.md`.
 *
 * **Deliberately no quarterly super guarantee due-date rows** - Payday Super (see the
 * `payday-super` entry below) replaces the quarterly SG payment system from 1 July 2026, the
 * start of this financial year. FY2025-26's Q4 SG due date (28 July 2026, in `key-dates.ts`)
 * is correctly the *last* quarterly SG date under the old system; carrying quarterly SG rows
 * forward into this file would describe an obligation that no longer exists once Payday Super
 * takes over. Every other quarterly obligation (BAS, PAYG instalments) is unaffected by Payday
 * Super and continues on the same quarterly cycle as before.
 *
 * Quarterly BAS/PAYG instalment due dates trail the quarter they report on by approximately a
 * month, same as `key-dates.ts` - the Q4 (Apr-Jun 2027) due dates fall in July 2027, just after
 * this FY's own end date. The Q2 (Oct-Dec 2026) due date is independently confirmed via two
 * secondary sources to fall on 1 March 2027, not the naive 28 February 2027 - 28 February 2027
 * is a Sunday, and the ATO rule states a due date landing on a weekend or public holiday shifts
 * to the next business day.
 *
 * **Day 15.5 correction**: `individual-lodgment-self` was originally dated 31 October 2026 (the
 * naive fixed calendar date) - 31 October 2026 is actually a Saturday, so the real self-lodge
 * deadline shifts to the next business day, Monday 2 November 2026. Click-verified via two
 * independent secondary sources both stating the shifted date directly.
 *
 * **Day 15.5 logged exception, not forced**: `individual-lodgment-agent-extension`'s date, 15
 * May 2027, is also a Saturday - but the ATO's own registered-agent-lodgment-program page
 * states this exact date as the due date without shifting it (confirmed via a direct search
 * of ato.gov.au's own "Individuals and trusts" lodgment-program page, which a direct fetch
 * 403-blocks per this project's standing ato.gov.au access limitation - the search result
 * itself surfaces the page's own stated content). This is a genuine rule exception, not a
 * gap in verification: the 15 May date is an administratively-set lodgment-program concession
 * date (the Commissioner's own published schedule), not a statutory deadline computed by a
 * fixed formula the Acts Interpretation Act's weekend/public-holiday rule applies to the same
 * way it applies to the 31 October self-lodge deadline above - the two dates are governed by
 * different rules despite looking like the same kind of due date. Logged here and in
 * PROGRESS.md's Day 15.5 entry rather than "corrected" to a shifted date that would in fact be
 * wrong.
 */
export const KEY_DATES_2026_27: KeyDate[] = [
  {
    id: "fy-start",
    date: "2026-07-01",
    title: "FY2026-27 begins",
    description: "The 2026-27 financial year starts.",
    audience: ["everyone"],
    source: "https://www.ato.gov.au/individuals-and-families/your-tax-return/before-you-prepare-your-tax-return/lodgment-dates",
    verified: true,
  },
  {
    id: "fy-end",
    date: "2027-06-30",
    title: "FY2026-27 ends",
    description: "The 2026-27 financial year ends.",
    audience: ["everyone"],
    source: "https://www.ato.gov.au/individuals-and-families/your-tax-return/before-you-prepare-your-tax-return/lodgment-dates",
    verified: true,
  },
  {
    id: "individual-lodgment-self",
    date: "2026-11-02",
    title: "Individual tax return due (self-lodged)",
    description:
      "The FY2025-26 individual tax return is due if lodging it yourself, without a registered tax agent. The standard 31 October 2026 due date falls on a Saturday, so it shifts to the next business day, 2 November 2026.",
    audience: ["everyone"],
    source: ATO_LODGMENT_DATES_URL,
    verified: true,
  },
  {
    id: "individual-lodgment-agent-extension",
    date: "2027-05-15",
    title: "Extended lodgment deadline (registered with a tax agent)",
    description:
      "The later FY2025-26 lodgment deadline that applies when a registered tax agent takes on the return before 2 November 2026 (the shifted self-lodge deadline), under their lodgment program. 15 May 2027 itself falls on a Saturday, but the ATO's own lodgment program schedule publishes this exact date without a weekend shift - an administrative concession date, not a statutory deadline.",
    audience: ["everyone"],
    source: ATO_LODGMENT_DATES_URL,
    verified: true,
  },
  {
    id: "payday-super",
    date: "2026-07-01",
    title: "Payday Super begins - SG due within 7 business days of payday",
    description:
      "From 1 July 2026, the quarterly super guarantee system is replaced by Payday Super: employer super guarantee contributions must generally be received by the employee's super fund within 7 business days of each payday, rather than 28 days after each quarter.",
    audience: ["everyone-with-employer"],
    source: ATO_PAYDAY_SUPER_DEADLINES_URL,
    verified: true,
  },
  {
    id: "bas-q1",
    date: "2026-10-28",
    title: "Quarterly BAS due — Q1 (Jul-Sep 2026)",
    description: "Quarterly Business Activity Statement due for the July-September 2026 quarter.",
    audience: ["contractor"],
    source: ATO_ACTIVITY_STATEMENTS_URL,
    verified: true,
  },
  {
    id: "bas-q2",
    date: "2027-03-01",
    title: "Quarterly BAS due — Q2 (Oct-Dec 2026)",
    description:
      "Quarterly Business Activity Statement due for the October-December 2026 quarter. The standard 28 February 2027 due date falls on a Sunday, so it shifts to the next business day, 1 March 2027.",
    audience: ["contractor"],
    source: ATO_ACTIVITY_STATEMENTS_URL,
    verified: true,
  },
  {
    id: "bas-q3",
    date: "2027-04-28",
    title: "Quarterly BAS due — Q3 (Jan-Mar 2027)",
    description: "Quarterly Business Activity Statement due for the January-March 2027 quarter.",
    audience: ["contractor"],
    source: ATO_ACTIVITY_STATEMENTS_URL,
    verified: true,
  },
  {
    id: "bas-q4",
    date: "2027-07-28",
    title: "Quarterly BAS due — Q4 (Apr-Jun 2027)",
    description: "Quarterly Business Activity Statement due for the April-June 2027 quarter.",
    audience: ["contractor"],
    source: ATO_ACTIVITY_STATEMENTS_URL,
    verified: true,
  },
  {
    id: "payg-instalment-q1",
    date: "2026-10-28",
    title: "PAYG instalment due — Q1 (Jul-Sep 2026)",
    description: "Quarterly PAYG instalment due for the July-September 2026 quarter.",
    audience: ["contractor", "property-investor"],
    source: ATO_PAYG_INSTALMENTS_URL,
    verified: true,
  },
  {
    id: "payg-instalment-q2",
    date: "2027-03-01",
    title: "PAYG instalment due — Q2 (Oct-Dec 2026)",
    description:
      "Quarterly PAYG instalment due for the October-December 2026 quarter. The standard 28 February 2027 due date falls on a Sunday, so it shifts to the next business day, 1 March 2027.",
    audience: ["contractor", "property-investor"],
    source: ATO_PAYG_INSTALMENTS_URL,
    verified: true,
  },
  {
    id: "payg-instalment-q3",
    date: "2027-04-28",
    title: "PAYG instalment due — Q3 (Jan-Mar 2027)",
    description: "Quarterly PAYG instalment due for the January-March 2027 quarter.",
    audience: ["contractor", "property-investor"],
    source: ATO_PAYG_INSTALMENTS_URL,
    verified: true,
  },
  {
    id: "payg-instalment-q4",
    date: "2027-07-28",
    title: "PAYG instalment due — Q4 (Apr-Jun 2027)",
    description: "Quarterly PAYG instalment due for the April-June 2027 quarter.",
    audience: ["contractor", "property-investor"],
    source: ATO_PAYG_INSTALMENTS_URL,
    verified: true,
  },
];
