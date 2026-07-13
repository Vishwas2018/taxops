import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import ChecklistsPage from "./page";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const mockCreateClient = vi.mocked(createClient);

function emptyResult() {
  return Promise.resolve({ data: [], error: null });
}

function mockSupabase({
  user,
  profileRow = null,
}: {
  user: { id: string } | null;
  profileRow?: Record<string, unknown> | null;
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
            eq: vi.fn().mockReturnValue({ returns: vi.fn().mockReturnValue(emptyResult()) }),
          }),
        };
      }
      if (table === "checklist_custom_items") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({ returns: vi.fn().mockReturnValue(emptyResult()) }),
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

describe("ChecklistsPage", () => {
  it("renders nothing for an unauthenticated request (layout.tsx already redirects)", async () => {
    mockCreateClient.mockResolvedValue(mockSupabase({ user: null }) as never);
    const { container } = render(await ChecklistsPage());
    expect(container).toBeEmptyDOMElement();
  });

  it("shows every group plus a low-pressure profile prompt when there is no tax profile yet", async () => {
    mockCreateClient.mockResolvedValue(
      mockSupabase({ user: { id: "u1" }, profileRow: null }) as never,
    );
    render(await ChecklistsPage());

    expect(screen.getByText(/showing every checklist group/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /complete your tax profile/i })).toHaveAttribute(
      "href",
      "/profile",
    );
    expect(screen.getByRole("heading", { name: "Contractor income & expense records" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Property documents" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Super contribution records" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Receipts & evidence" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Questions for a registered tax agent" })).toBeInTheDocument();
  });

  it("does not show the profile prompt once a profile with any signal exists", async () => {
    mockCreateClient.mockResolvedValue(
      mockSupabase({
        user: { id: "u1" },
        profileRow: {
          work_arrangement: "payg_employee",
          has_abn: null,
          investment_property_band: "zero",
          super_engagement: null,
          household_income_band: null,
          other_income_sources: [],
        },
      }) as never,
    );
    render(await ChecklistsPage());

    expect(screen.queryByText(/showing every checklist group/i)).not.toBeInTheDocument();
  });

  it("shows only the profile-derived default groups for a contractor with no property", async () => {
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
      }) as never,
    );
    render(await ChecklistsPage());

    expect(screen.getByRole("heading", { name: "Contractor income & expense records" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Receipts & evidence" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Questions for a registered tax agent" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Property documents" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add.*property documents/i })).toBeInTheDocument();
  });

  it("renders the inline disclaimer", async () => {
    mockCreateClient.mockResolvedValue(mockSupabase({ user: { id: "u1" } }) as never);
    render(await ChecklistsPage());
    expect(screen.getByText(/general and educational only/i)).toBeInTheDocument();
  });
});
