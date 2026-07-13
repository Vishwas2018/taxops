import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import DashboardPage from "./page";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const mockCreateClient = vi.mocked(createClient);

function mockSupabase({
  user,
  profileRow = null,
  itemStateRows = [] as { item_id: string; checked: boolean }[],
  customItemRows = [] as { id: string; group_id: string; label: string; checked: boolean; position: number }[],
}: {
  user: { id: string } | null;
  profileRow?: Record<string, unknown> | null;
  itemStateRows?: { item_id: string; checked: boolean }[];
  customItemRows?: { id: string; group_id: string; label: string; checked: boolean; position: number }[];
}) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: profileRow, error: null }),
            }),
          }),
        };
      }
      if (table === "checklist_item_states") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              returns: vi.fn().mockReturnValue(Promise.resolve({ data: itemStateRows, error: null })),
            }),
          }),
        };
      }
      if (table === "checklist_custom_items") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                returns: vi.fn().mockReturnValue(Promise.resolve({ data: customItemRows, error: null })),
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table in test: ${table}`);
    }),
  };
}

beforeEach(() => {
  mockCreateClient.mockReset();
});

describe("DashboardPage checklist summary", () => {
  it("shows 0% with no checked items across the default (all, no profile) groups", async () => {
    mockCreateClient.mockResolvedValue(mockSupabase({ user: { id: "u1" } }) as never);
    render(await DashboardPage());

    expect(screen.getByText("EOFY checklist")).toBeInTheDocument();
    expect(screen.getByText(/0 of \d+ items checked/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to your checklists/i })).toHaveAttribute(
      "href",
      "/checklists",
    );
  });

  it("counts checked template items scoped to the profile-derived default groups only", async () => {
    mockCreateClient.mockResolvedValue(
      mockSupabase({
        user: { id: "u1" },
        profileRow: {
          work_arrangement: "abn_sole_trader",
          has_abn: true,
          investment_property_band: "zero",
          super_engagement: null,
          household_income_band: null,
          other_income_sources: [],
        },
        itemStateRows: [
          { item_id: "contractor-income-expense.invoices-issued", checked: true },
          // Not counted: property-documents isn't a default group for this profile
          // (investment_property_band is "zero").
          { item_id: "property-documents.loan-statements", checked: true },
        ],
      }) as never,
    );
    render(await DashboardPage());

    expect(screen.getByText(/1 of \d+ items checked/)).toBeInTheDocument();
  });
});
