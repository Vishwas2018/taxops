import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveTaxProfileSectionAction } from "@/app/(app)/profile/actions";
import type { TaxProfileInput } from "@/lib/validation/tax-profile";
import { TaxProfileSummary } from "./tax-profile-summary";

vi.mock("@/app/(app)/profile/actions", () => ({
  saveTaxProfileSectionAction: vi.fn(),
}));

const mockSave = vi.mocked(saveTaxProfileSectionAction);

const PROFILE: TaxProfileInput = {
  workArrangement: "abn_sole_trader",
  hasAbn: true,
  investmentPropertyBand: "one",
  superEngagement: "not_sure",
  householdIncomeBand: "100k_to_190k",
  otherIncomeSources: ["dividends"],
};

beforeEach(() => {
  mockSave.mockReset();
  mockSave.mockResolvedValue({ status: "success" });
});

function rowFor(title: string) {
  return screen.getByText(title).closest("div")!.parentElement!;
}

describe("TaxProfileSummary", () => {
  it("renders every group's current answer", () => {
    render(<TaxProfileSummary profile={PROFILE} />);
    expect(within(rowFor("Work arrangement")).getByText("ABN sole trader")).toBeInTheDocument();
    expect(within(rowFor("Household income")).getByText("$100k–$190k")).toBeInTheDocument();
  });

  it("edits a single section without touching the others", async () => {
    const user = userEvent.setup();
    render(<TaxProfileSummary profile={PROFILE} />);

    await user.click(within(rowFor("Household income")).getByRole("button", { name: /edit/i }));
    await user.click(screen.getByRole("radio", { name: "Under $100k" }));
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(mockSave).toHaveBeenCalledWith({ householdIncomeBand: "under_100k" });
    expect(await within(rowFor("Household income")).findByText("Under $100k")).toBeInTheDocument();
    // Untouched section still shows its original answer.
    expect(within(rowFor("Work arrangement")).getByText("ABN sole trader")).toBeInTheDocument();
  });

  it("cancel discards the in-progress edit", async () => {
    const user = userEvent.setup();
    render(<TaxProfileSummary profile={PROFILE} />);

    await user.click(within(rowFor("Household income")).getByRole("button", { name: /edit/i }));
    await user.click(screen.getByRole("radio", { name: "Under $100k" }));
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(mockSave).not.toHaveBeenCalled();
    expect(within(rowFor("Household income")).getByText("$100k–$190k")).toBeInTheDocument();
  });

  it("offers a 'Redo the full interview' escape hatch that reopens the wizard prefilled", async () => {
    const user = userEvent.setup();
    render(<TaxProfileSummary profile={PROFILE} />);

    await user.click(screen.getByRole("button", { name: /redo the full interview/i }));

    expect(screen.getByText(/step 1 of 6: work arrangement/i)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /abn sole trader/i })).toBeChecked();
  });
});
