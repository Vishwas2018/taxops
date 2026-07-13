import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import TipsPage from "./page";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const mockCreateClient = vi.mocked(createClient);

function mockSupabaseAnonymous() {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  };
}

function mockSupabaseWithProfile(profileRow: Record<string, unknown>) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: profileRow, error: null }),
        }),
      }),
    }),
  };
}

beforeEach(() => {
  mockCreateClient.mockReset();
  mockCreateClient.mockResolvedValue(mockSupabaseAnonymous() as never);
});

describe("TipsPage", () => {
  it("groups seed articles under their category headings", async () => {
    render(await TipsPage());

    const contractorSection = screen.getByRole("heading", { name: "Contractor expenses" })
      .closest("section") as HTMLElement;
    expect(
      within(contractorSection).getByText("Claiming Work-Related Expenses as a Contractor"),
    ).toBeInTheDocument();

    const propertySection = screen.getByRole("heading", { name: "Property deductions" })
      .closest("section") as HTMLElement;
    expect(
      within(propertySection).getByText("Repairs vs Improvements: Why the ATO Treats Them Differently"),
    ).toBeInTheDocument();

    const superSection = screen.getByRole("heading", { name: "Superannuation" })
      .closest("section") as HTMLElement;
    expect(
      within(superSection).getByText("Concessional Contributions and the Annual Cap"),
    ).toBeInTheDocument();
  });

  it("does not render a heading for a category with no articles", async () => {
    render(await TipsPage());
    expect(screen.queryByRole("heading", { name: "Wealth preservation" })).not.toBeInTheDocument();
  });

  it("shows each article's description alongside its title", async () => {
    render(await TipsPage());
    expect(
      screen.getByText(
        "The distinction between an immediately deductible repair and a capital improvement to a rental property, and why it changes the timing of a claim.",
      ),
    ).toBeInTheDocument();
  });

  it("links each article title to its /tips/[slug] page", async () => {
    render(await TipsPage());
    expect(
      screen.getByRole("link", { name: "Concessional Contributions and the Annual Cap" }),
    ).toHaveAttribute("href", "/tips/concessional-contributions-cap-explained");
  });

  it("does not render a 'Relevant to you' section for an anonymous visitor", async () => {
    render(await TipsPage());
    expect(screen.queryByRole("heading", { name: "Relevant to you" })).not.toBeInTheDocument();
  });

  it("does not render a 'Relevant to you' section for a signed-in user with no profile answers", async () => {
    mockCreateClient.mockResolvedValue(
      mockSupabaseWithProfile({
        work_arrangement: null,
        has_abn: null,
        investment_property_band: null,
        super_engagement: null,
        household_income_band: null,
        other_income_sources: [],
      }) as never,
    );

    render(await TipsPage());
    expect(screen.queryByRole("heading", { name: "Relevant to you" })).not.toBeInTheDocument();
  });

  it("renders a 'Relevant to you' section scoped to the profile's relevant categories", async () => {
    mockCreateClient.mockResolvedValue(
      mockSupabaseWithProfile({
        work_arrangement: "abn_sole_trader",
        has_abn: true,
        investment_property_band: "zero",
        super_engagement: null,
        household_income_band: null,
        other_income_sources: [],
      }) as never,
    );

    render(await TipsPage());

    const relevantSection = screen.getByRole("heading", { name: "Relevant to you" })
      .closest("section") as HTMLElement;
    // abn_sole_trader -> contractor-expenses + superannuation, not property-deductions
    // (investment_property_band is "zero").
    expect(
      within(relevantSection).getByText("Claiming Work-Related Expenses as a Contractor"),
    ).toBeInTheDocument();
    expect(
      within(relevantSection).getByText("Concessional Contributions and the Annual Cap"),
    ).toBeInTheDocument();
    expect(
      within(relevantSection).queryByText("Repairs vs Improvements: Why the ATO Treats Them Differently"),
    ).not.toBeInTheDocument();
  });
});
